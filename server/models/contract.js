export const CONTRACT_STATUSES = [
  'DRAFT', 'COMPLIANCE', 'FUNDED', 'IN_PROGRESS', 'SUBMITTED',
  'APPROVED', 'DISPUTED', 'RELEASED', 'SETTLED'
];

export const MILESTONE_STATUSES = [
  'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'DISPUTED', 'RELEASED'
];

export function createMilestone(overrides = {}) {
  return {
    id: overrides.id,
    title: '',
    description: '',
    amount: 0,
    dueDate: null,
    requirements: '',
    status: 'PENDING',
    deliverable: null,
    submittedAt: null,
    approvedAt: null,
    disputeReason: null,
    releasedAmount: null,
    ...overrides
  };
}

export function createContractDefaults(overrides = {}) {
  return {
    id: overrides.id,
    clientId: null,
    freelancerId: null,
    counterpartyName: '',
    title: '',
    description: '',
    totalAmount: 0,
    asset: 'USDC',
    network: 'Polygon',
    status: 'DRAFT',
    milestones: [],
    escrowAddress: null,
    fundedAt: null,
    fundTxHash: null,
    releasedAmount: null,
    settlement: null,
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

export function publicContract(c, viewerId) {
  return {
    id: c.id,
    clientId: c.clientId,
    freelancerId: c.freelancerId,
    counterpartyName: c.counterpartyName,
    title: c.title,
    description: c.description,
    totalAmount: c.totalAmount,
    asset: c.asset,
    network: c.network,
    status: c.status,
    milestones: c.milestones,
    escrowAddress: c.escrowAddress,
    fundedAt: c.fundedAt,
    fundTxHash: c.fundTxHash,
    releasedAmount: c.releasedAmount,
    settlement: c.settlement,
    createdAt: c.createdAt,
    isClient: c.clientId === viewerId,
    isFreelancer: c.freelancerId === viewerId
  };
}
