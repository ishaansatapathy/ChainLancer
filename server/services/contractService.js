import { randomUUID } from 'crypto';
import { prisma } from '../db.js';
import { publicContract } from '../models/contract.js';
import { optimizeSettlement } from './settlementOptimizer.js';
import { validateMilestoneDeliverable } from './qshipService.js';
import { registerNettingObligation } from './nettingService.js';
import { audit } from './auditService.js';
import { ApiError } from '../lib/http.js';

function assertRole(user, role) {
  if (user.role !== role) throw new ApiError(403, `Requires ${role} role`);
}

const CONTRACT_INCLUDE = { milestones: true };

async function getContractForUser(id, user) {
  const c = await prisma.contract.findUnique({
    where: { id },
    include: CONTRACT_INCLUDE
  });
  if (!c) throw new ApiError(404, 'Contract not found');
  const isParty = c.clientId === user.id || c.freelancerId === user.id;
  const canJoin = user.role === 'freelancer' && !c.freelancerId;
  if (!isParty && !canJoin) {
    throw new ApiError(403, 'Not authorized for this contract');
  }
  return c;
}

export async function listContracts(user) {
  const contracts = await prisma.contract.findMany({
    where: {
      OR: [{ clientId: user.id }, { freelancerId: user.id }]
    },
    include: CONTRACT_INCLUDE,
    orderBy: { createdAt: 'desc' }
  });
  return contracts.map((c) => publicContract(c, user.id));
}

export async function getContract(id, user) {
  return publicContract(await getContractForUser(id, user), user.id);
}

export async function createContract(user, body) {
  assertRole(user, 'client');
  if (user.complianceStatus !== 'APPROVED') {
    throw new ApiError(403, 'Compliance approval required');
  }

  const milestoneData = (body.milestones || []).map((m) => ({
    id: randomUUID(),
    title: m.title || '',
    description: m.description || '',
    amount: Number(m.amount) || 0,
    dueDate: m.dueDate ? new Date(m.dueDate) : null,
    requirements: m.requirements || '',
    status: 'PENDING'
  }));

  const totalAmount = Number(body.totalAmount) || 0;
  const sum = milestoneData.reduce((s, m) => s + m.amount, 0);
  if (milestoneData.length && Math.abs(sum - totalAmount) > 0.01) {
    throw new ApiError(400, 'Milestone amounts must equal total contract amount');
  }

  const contract = await prisma.contract.create({
    data: {
      clientId: user.id,
      counterpartyName: body.counterpartyName || '',
      title: body.title || '',
      description: body.description || '',
      totalAmount,
      asset: body.asset || 'USDC',
      network: body.network || 'Polygon',
      status: 'DRAFT',
      milestones: {
        create: milestoneData
      }
    },
    include: CONTRACT_INCLUDE
  });

  await audit(user.id, 'CONTRACT_CREATED', { contractId: contract.id });
  return publicContract(contract, user.id);
}

export async function advanceContractCompliance(id, user) {
  const c = await getContractForUser(id, user);
  if (c.clientId !== user.id) throw new ApiError(403, 'Only client can advance contract');
  if (c.status !== 'DRAFT') throw new ApiError(400, 'Contract not in draft');
  const updated = await prisma.contract.update({
    where: { id },
    data: { status: 'COMPLIANCE' },
    include: CONTRACT_INCLUDE
  });
  return publicContract(updated, user.id);
}

export async function prepareFundEscrow(id, user) {
  const c = await getContractForUser(id, user);
  if (c.clientId !== user.id) throw new ApiError(403, 'Only client can fund escrow');
  if (!['COMPLIANCE', 'DRAFT'].includes(c.status)) {
    throw new ApiError(400, 'Contract not ready for funding');
  }
  return {
    contract: publicContract(c, user.id),
    escrowAddress: c.escrowAddress || 'Not deployed — smart contract integration pending',
    walletAddress: user.walletAddress || null,
    note: 'Approve USDC and fund escrow when the on-chain escrow contract is deployed.'
  };
}

export async function attemptFundEscrow(id, user) {
  await prepareFundEscrow(id, user);
  throw new ApiError(
    501,
    'Smart contract escrow is not deployed. On-chain funding is unavailable — no transaction was submitted.'
  );
}

export async function participateContract(id, user) {
  assertRole(user, 'freelancer');
  const c = await getContractForUser(id, user);
  if (c.freelancerId && c.freelancerId !== user.id) {
    throw new ApiError(400, 'Contract already has a freelancer assigned');
  }
  const updated = await prisma.contract.update({
    where: { id },
    data: { freelancerId: user.id },
    include: CONTRACT_INCLUDE
  });
  await audit(user.id, 'CONTRACT_JOINED', { contractId: id });
  return publicContract(updated, user.id);
}

export async function submitDeliverable(contractId, milestoneId, user, body) {
  const c = await getContractForUser(contractId, user);
  if (user.role !== 'freelancer' || c.freelancerId !== user.id) {
    throw new ApiError(403, 'Freelancer role required');
  }
  const ms = c.milestones.find((m) => m.id === milestoneId);
  if (!ms) throw new ApiError(404, 'Milestone not found');
  if (!['PENDING', 'IN_PROGRESS'].includes(ms.status)) {
    throw new ApiError(400, 'Milestone not open for submission');
  }

  const deliverableData = {
    githubUrl: body.githubUrl || '',
    figmaUrl: body.figmaUrl || '',
    fileRef: body.fileRef || '',
    description: body.description || '',
    evidenceHash: randomUUID().slice(0, 16)
  };

  // Run automated Qship review on submission
  let validation = null;
  try {
    validation = await validateMilestoneDeliverable({
      milestoneId,
      milestoneTitle: ms.title,
      requirements: ms.requirements || ms.description || '',
      deliverable: deliverableData
    });
    deliverableData.validation = validation;
  } catch (valErr) {
    console.warn('Qship auto-validation warning:', valErr.message);
  }

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      deliverable: deliverableData
    }
  });

  const newStatus = c.status === 'FUNDED' ? 'IN_PROGRESS' : c.status;
  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: { status: newStatus === 'FUNDED' ? 'IN_PROGRESS' : newStatus },
    include: CONTRACT_INCLUDE
  });

  await audit(user.id, 'DELIVERABLE_SUBMITTED', { contractId, milestoneId, reviewStatus: validation?.reviewStatus });
  return publicContract(updated, user.id);
}

export async function validateMilestone(contractId, milestoneId, user) {
  const c = await getContractForUser(contractId, user);
  const ms = c.milestones.find((m) => m.id === milestoneId);
  if (!ms) throw new ApiError(404, 'Milestone not found');
  if (!ms.deliverable) throw new ApiError(400, 'No deliverable submitted yet');

  const deliverableData = typeof ms.deliverable === 'object' ? { ...ms.deliverable } : {};
  const validation = await validateMilestoneDeliverable({
    milestoneId,
    milestoneTitle: ms.title,
    requirements: ms.requirements || ms.description || '',
    deliverable: deliverableData
  });

  deliverableData.validation = validation;
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { deliverable: deliverableData }
  });

  await audit(user.id, 'DELIVERABLE_VALIDATED', { contractId, milestoneId, reviewStatus: validation.reviewStatus });
  const updated = await prisma.contract.findUnique({
    where: { id: contractId },
    include: CONTRACT_INCLUDE
  });
  return { validation, contract: publicContract(updated, user.id) };
}

export async function reviewMilestone(contractId, milestoneId, user, { action, reason }) {
  const c = await getContractForUser(contractId, user);
  if (c.clientId !== user.id) throw new ApiError(403, 'Only client can review');
  const ms = c.milestones.find((m) => m.id === milestoneId);
  if (!ms) throw new ApiError(404, 'Milestone not found');
  if (ms.status !== 'SUBMITTED') throw new ApiError(400, 'Milestone not submitted');

  if (action === 'approve') {
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: 'APPROVED', approvedAt: new Date() }
    });
    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'APPROVED', releasedAmount: ms.amount },
      include: CONTRACT_INCLUDE
    });

    // Register approved milestone into Netting Matcher Engine
    try {
      const profile = await prisma.profile.findUnique({ where: { userId: c.freelancerId } });
      registerNettingObligation({
        milestoneId,
        contractId,
        amount: ms.amount,
        country: profile?.user?.country || 'IN',
        fiat: profile?.preferredFiat || 'INR',
        asset: c.asset || 'USDC',
        userId: c.freelancerId
      });
    } catch (netErr) {
      console.warn('Netting engine registration notice:', netErr.message);
    }

    await audit(user.id, 'MILESTONE_APPROVED', { contractId, milestoneId });
    return publicContract(updated, user.id);
  }

  if (action === 'dispute') {
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: 'DISPUTED', disputeReason: reason || 'Dispute raised by client' }
    });
    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'DISPUTED' },
      include: CONTRACT_INCLUDE
    });
    await audit(user.id, 'MILESTONE_DISPUTED', { contractId, milestoneId });
    return publicContract(updated, user.id);
  }

  throw new ApiError(400, 'Invalid action');
}

export async function getSettlementOptions(contractId, milestoneId, user) {
  const c = await getContractForUser(contractId, user);
  if (c.freelancerId !== user.id && c.clientId !== user.id) {
    throw new ApiError(403, 'Only contract parties can view settlement options');
  }
  const ms = c.milestones.find((m) => m.id === milestoneId);
  if (!ms || !['APPROVED', 'RELEASED'].includes(ms.status)) {
    throw new ApiError(400, 'Milestone must be approved before settlement');
  }
  const profile = await prisma.profile.findUnique({ where: { userId: c.freelancerId || user.id } });
  return await optimizeSettlement({
    amountUsdc: ms.amount,
    destinationCountry: user.country || 'IN',
    preferredFiat: profile?.preferredFiat || 'INR',
    milestoneId
  });
}

export async function confirmSettlement(contractId, milestoneId, user, { routeId, txHash }) {
  const c = await getContractForUser(contractId, user);
  const ms = c.milestones.find((m) => m.id === milestoneId);
  if (!ms || !['APPROVED', 'RELEASED'].includes(ms.status)) throw new ApiError(400, 'Milestone not ready');

  const options = await getSettlementOptions(contractId, milestoneId, user);
  const isDirectOnChain = routeId === 'direct-onchain-usdc';
  const route = isDirectOnChain
    ? options.onChainRoute
    : (options.routes.find((r) => r.id === routeId) || options.recommended);

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: 'RELEASED', releasedAmount: ms.amount }
  });

  const settlement = {
    routeId: route.id,
    routeType: route.type,
    provider: route.provider,
    cost: route.cost,
    netUsdc: route.netUsdc,
    estimatedFiat: route.estimatedFiat,
    fiatSymbol: route.fiatSymbol,
    isDirectOnChain: Boolean(isDirectOnChain),
    txHash: txHash || (isDirectOnChain ? `0xsimulated_release_${randomUUID().replace(/-/g, '').slice(0, 32)}` : null),
    simulated: !txHash,
    completedAt: new Date().toISOString(),
    reference: isDirectOnChain ? `AMOY-${randomUUID().slice(0, 8).toUpperCase()}` : `SETTLE-${randomUUID().slice(0, 8).toUpperCase()}`
  };

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: { status: 'SETTLED', settlement },
    include: CONTRACT_INCLUDE
  });

  await audit(user.id, 'SETTLEMENT_COMPLETE', { contractId, milestoneId, isDirectOnChain, txHash: settlement.txHash });
  return { contract: publicContract(updated, user.id), settlement };
}

export async function dashboardSummary(user) {
  const list = await listContracts(user);
  const pendingActions = [];
  list.forEach((c) => {
    c.milestones.forEach((m) => {
      if (c.isClient && m.status === 'SUBMITTED') {
        pendingActions.push({ type: 'approval', contractId: c.id, milestoneId: m.id, label: `${m.title} awaiting approval` });
      }
      if (c.isFreelancer && ['PENDING', 'IN_PROGRESS'].includes(m.status) && c.status === 'IN_PROGRESS') {
        pendingActions.push({ type: 'deliverable', contractId: c.id, milestoneId: m.id, label: `Submit deliverable for ${m.title}` });
      }
    });
    if (c.isClient && c.status === 'COMPLIANCE') {
      pendingActions.push({ type: 'fund', contractId: c.id, label: `Fund escrow for ${c.title}` });
    }
  });
  const payments = list
    .filter((c) => c.settlement)
    .map((c) => ({
      amount: c.releasedAmount || c.totalAmount,
      asset: c.asset,
      label: c.title,
      status: 'Completed',
      simulated: c.settlement?.simulated,
      settlement: c.settlement
    }));
  return {
    contracts: list.filter((c) => !['SETTLED'].includes(c.status)),
    pendingActions,
    payments,
    settlementOverview: payments.length
      ? { upcoming: null, note: 'Based on completed settlements in your account' }
      : { upcoming: null, note: 'No settlement history yet' }
  };
}
