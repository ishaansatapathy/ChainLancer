import { config } from '../config.js';
import { prisma } from '../db.js';
import { createKycProvider } from '../providers/kyc/index.js';
import { evaluateCompliance } from './compliancePolicyEngine.js';
import { runAmlScreening } from './amlService.js';
import { audit } from './auditService.js';

const provider = createKycProvider();

export async function startKyc(user) {
  const session = await provider.startVerification(user);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      kycStatus: 'PENDING',
      kycProvider: session.provider,
      kycVerificationId: session.verificationId
    }
  });
  await audit(user.id, 'KYC_STARTED', { provider: session.provider, verificationId: session.verificationId });
  return { session, user: updated };
}

export async function getKycStatus(user) {
  if (!user.kycVerificationId) {
    return { kycStatus: user.kycStatus || 'NOT_STARTED', provider: user.kycProvider };
  }
  try {
    const result = await provider.getVerificationStatus(user.kycVerificationId);
    if (result.status !== user.kycStatus) {
      await applyKycResult(user.id, result);
    }
    return result;
  } catch {
    return { kycStatus: user.kycStatus, provider: user.kycProvider, verificationId: user.kycVerificationId };
  }
}

export async function completeKycFromCode(user, code) {
  if (!code) throw new Error('Verification code required');
  if (typeof provider.redeemCode !== 'function') {
    throw new Error('Current KYC provider does not support code redemption');
  }
  const result = await provider.redeemCode(code);
  return applyKycResult(user.id, result);
}

export async function completeMockKyc(user, outcome = 'VERIFIED') {
  if (configGuardMock()) {
    let ref = user.kycVerificationId;
    if (!ref) {
      const started = await startKyc(user);
      ref = started.session.verificationId;
      user = started.user;
    }
    const result = await provider.completeVerification?.(ref, outcome) || {
      provider: 'mock',
      verificationId: ref,
      status: outcome,
      country: user.country || 'IN',
      verifiedAt: outcome === 'VERIFIED' ? new Date().toISOString() : null
    };
    return applyKycResult(user.id, result);
  }
  throw new Error('Mock KYC complete only available when KYC_PROVIDER=mock or DEMO_MODE=true');
}

async function applyKycResult(userId, result) {
  const patch = {
    kycStatus: result.status,
    kycProvider: result.provider,
    kycVerificationId: result.verificationId,
    kycVerifiedAt: result.status === 'VERIFIED' ? (result.verifiedAt ? new Date(result.verifiedAt) : new Date()) : null
  };
  let user = await prisma.user.update({ where: { id: userId }, data: patch });
  await audit(userId, result.status === 'VERIFIED' ? 'KYC_VERIFIED' : result.status === 'FAILED' ? 'KYC_FAILED' : 'KYC_STARTED', {
    status: result.status
  });

  if (result.status === 'VERIFIED') {
    user = await runAmlScreening(user);
  } else {
    const compliance = evaluateCompliance(user);
    user = await prisma.user.update({ where: { id: userId }, data: compliance });
  }
  return user;
}

function configGuardMock() {
  return config.kyc.provider === 'mock' || config.demoMode;
}

export async function handleKycWebhook(payload) {
  const ref = payload.verificationId || payload.id;
  const user = await prisma.user.findFirst({ where: { kycVerificationId: ref } });
  if (!user) throw new Error('Verification not found');
  const result = {
    provider: payload.provider || user.kycProvider,
    verificationId: ref,
    status: payload.status || 'REVIEW',
    country: payload.country,
    verifiedAt: payload.verifiedAt
  };
  return applyKycResult(user.id, result);
}
