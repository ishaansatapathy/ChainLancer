import { config, ROLES } from '../config.js';
import { prisma } from '../db.js';
import { createUserDefaults, publicUser } from '../models/user.js';
import { audit } from './auditService.js';
import { evaluateCompliance } from './compliancePolicyEngine.js';

export async function assignRole(user, role) {
  if (!ROLES.includes(role)) throw new Error('Invalid role');
  if (user.role && user.role !== role) throw new Error('Role already assigned');
  const updated = await prisma.user.update({ where: { id: user.id }, data: { role } });
  await audit(user.id, 'ROLE_ASSIGNED', { role });
  return updated;
}

export async function assignCountry(user, country) {
  const code = String(country || '').toUpperCase().slice(0, 2);
  if (!code || code.length !== 2) throw new Error('Valid country code required');
  return prisma.user.update({ where: { id: user.id }, data: { country: code } });
}

export function getOnboardingState(user) {
  const steps = {
    role: Boolean(user.role),
    country: Boolean(user.country),
    kyc: user.kycStatus === 'VERIFIED',
    aml: user.amlStatus === 'CLEAR',
    compliance: user.complianceStatus === 'APPROVED',
    wallet: Boolean(user.walletVerified && user.walletAddress)
  };
  const nextStep = !steps.role
    ? 'role'
    : !steps.country
      ? 'country'
      : user.kycStatus !== 'VERIFIED'
        ? 'kyc'
        : user.amlStatus === 'NOT_SCREENED'
          ? 'aml'
          : user.complianceStatus !== 'APPROVED'
            ? 'compliance'
            : !steps.wallet
              ? 'wallet'
              : 'complete';
  return { steps, nextStep, user: publicUser(user) };
}

export async function ensureUserDefaults(user) {
  const defaults = createUserDefaults(user);
  return prisma.user.update({ where: { id: user.id }, data: defaults });
}
