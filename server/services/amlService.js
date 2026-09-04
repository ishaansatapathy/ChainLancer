import { prisma } from '../db.js';
import { createAMLProvider } from '../providers/aml/index.js';
import { evaluateCompliance } from './compliancePolicyEngine.js';
import { audit } from './auditService.js';

const provider = createAMLProvider();

export async function runAmlScreening(user) {
  const result = await provider.screenIndividual({
    fullName: user.fullName,
    country: user.country,
    dateOfBirth: user.dateOfBirth
  });

  const patch = {
    amlStatus: result.status,
    amlRiskLevel: result.riskLevel,
    amlProvider: result.provider,
    amlScreeningId: result.screeningId,
    amlScreenedAt: result.screenedAt ? new Date(result.screenedAt) : new Date(),
    amlMatchedEntities: result.matchedEntities || []
  };

  let updated = await prisma.user.update({ where: { id: user.id }, data: patch });
  const compliance = evaluateCompliance(updated);
  updated = await prisma.user.update({ where: { id: user.id }, data: compliance });

  await audit(user.id, result.status === 'CLEAR' ? 'AML_CLEAR' : result.status === 'MATCH' ? 'AML_MATCH' : 'AML_SCREENED', {
    status: result.status,
    riskLevel: result.riskLevel,
    matchCount: (result.matchedEntities || []).length
  });

  if (updated.complianceStatus === 'APPROVED') {
    await audit(user.id, 'COMPLIANCE_APPROVED', { reason: updated.complianceReason });
  } else if (updated.complianceStatus === 'REVIEW') {
    await audit(user.id, 'COMPLIANCE_REVIEW', { reason: updated.complianceReason });
  }

  return updated;
}
