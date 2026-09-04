export function profileDefaults(overrides = {}) {
  return {
    headline: '',
    about: '',
    skills: [],
    experience: '',
    portfolio: '',
    hourlyRate: '',
    availability: 'Available for work',
    preferredContractType: 'Milestone-based',
    preferredMilestoneStructure: 'Fixed deliverables',
    settlementAsset: 'USDC',
    settlementNetwork: 'Polygon',
    preferredFiat: 'INR',
    preferredPayoutMethod: 'Wallet',
    profileComplete: false,
    ...overrides
  };
}

export function publicProfile(user) {
  const p = user.profile || profileDefaults();
  return {
    fullName: user.fullName,
    email: user.email,
    country: user.country,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    headline: p.headline,
    about: p.about,
    skills: p.skills || [],
    experience: p.experience,
    portfolio: p.portfolio,
    hourlyRate: p.hourlyRate,
    availability: p.availability,
    preferredContractType: p.preferredContractType,
    preferredMilestoneStructure: p.preferredMilestoneStructure,
    settlementAsset: p.settlementAsset,
    settlementNetwork: p.settlementNetwork,
    preferredFiat: p.preferredFiat,
    preferredPayoutMethod: p.preferredPayoutMethod,
    profileComplete: Boolean(p.profileComplete),
    trust: {
      kyc: user.kycStatus === 'VERIFIED',
      wallet: Boolean(user.walletVerified),
      aml: user.amlStatus === 'CLEAR'
    }
  };
}
