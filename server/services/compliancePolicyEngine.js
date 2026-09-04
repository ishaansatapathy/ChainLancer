export function evaluateCompliance({ kycStatus, amlStatus, amlRiskLevel }) {
  const now = new Date().toISOString();

  if (kycStatus === 'FAILED') {
    return { complianceStatus: 'REJECTED', complianceReason: 'KYC verification failed', complianceCheckedAt: now };
  }
  if (amlStatus === 'FAILED') {
    return { complianceStatus: 'REJECTED', complianceReason: 'AML screening failed', complianceCheckedAt: now };
  }
  if (kycStatus !== 'VERIFIED') {
    return {
      complianceStatus: kycStatus === 'REVIEW' ? 'REVIEW' : 'PENDING',
      complianceReason: 'Identity verification incomplete',
      complianceCheckedAt: now
    };
  }
  if (amlStatus === 'NOT_SCREENED') {
    return { complianceStatus: 'PENDING', complianceReason: 'AML screening pending', complianceCheckedAt: now };
  }
  if (amlStatus === 'MATCH') {
    return { complianceStatus: 'HOLD', complianceReason: 'AML match requires review', complianceCheckedAt: now };
  }
  if (amlStatus === 'REVIEW') {
    return { complianceStatus: 'REVIEW', complianceReason: 'AML review required', complianceCheckedAt: now };
  }
  if (amlStatus === 'CLEAR' && kycStatus === 'VERIFIED') {
    return { complianceStatus: 'APPROVED', complianceReason: 'KYC verified and AML clear', complianceCheckedAt: now };
  }
  return { complianceStatus: 'REVIEW', complianceReason: 'Manual compliance review required', complianceCheckedAt: now };
}
