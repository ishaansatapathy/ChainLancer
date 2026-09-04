export function createUserDefaults(overrides = {}) {
  return {
    role: null,
    country: null,
    walletAddress: null,
    walletChainId: null,
    walletVerified: false,
    walletVerifiedAt: null,
    walletNonce: null,
    walletNonceExpiresAt: null,
    walletPendingAddress: null,
    kycStatus: 'NOT_STARTED',
    kycProvider: null,
    kycVerificationId: null,
    kycVerifiedAt: null,
    amlStatus: 'NOT_SCREENED',
    amlRiskLevel: null,
    amlProvider: null,
    amlScreeningId: null,
    amlScreenedAt: null,
    amlMatchedEntities: [],
    complianceStatus: 'PENDING',
    complianceReason: null,
    complianceCheckedAt: null,
    ...overrides
  };
}

export function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    emailVerified: user.emailVerified,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    country: user.country,
    walletAddress: user.walletAddress,
    walletChainId: user.walletChainId || null,
    walletVerified: Boolean(user.walletVerified),
    walletVerifiedAt: user.walletVerifiedAt || null,
    kycStatus: user.kycStatus || 'NOT_STARTED',
    amlStatus: user.amlStatus || 'NOT_SCREENED',
    complianceStatus: user.complianceStatus || 'PENDING',
    complianceReason: user.complianceReason,
    onboardingComplete: Boolean(
      user.role &&
      user.kycStatus === 'VERIFIED' &&
      user.amlStatus === 'CLEAR' &&
      user.complianceStatus === 'APPROVED' &&
      user.walletVerified &&
      user.walletAddress
    )
  };
}
