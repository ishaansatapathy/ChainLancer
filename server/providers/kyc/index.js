import { randomUUID, createHash } from 'crypto';
import { config } from '../../config.js';

function kycWalletForUser(user) {
  if (user.walletAddress && /^0x[a-fA-F0-9]{40}$/.test(user.walletAddress)) {
    return user.walletAddress;
  }
  const hash = createHash('sha256').update(user.id).digest('hex');
  return `0x${hash.slice(0, 40)}`;
}

export class MockKycProvider {
  async startVerification(user) {
    return {
      provider: 'mock',
      verificationId: `mock_${randomUUID()}`,
      status: 'PENDING',
      redirectUrl: null,
      message: 'Mock KYC session started. Complete via POST /api/kyc/mock/complete in demo mode.'
    };
  }

  async getVerificationStatus(reference) {
    return {
      provider: 'mock',
      verificationId: reference,
      status: 'PENDING',
      country: null,
      verificationLevel: 'identity'
    };
  }

  async completeVerification(reference, outcome = 'VERIFIED') {
    const status = ['VERIFIED', 'FAILED', 'REVIEW', 'PENDING'].includes(outcome) ? outcome : 'VERIFIED';
    return {
      provider: 'mock',
      verificationId: reference,
      status,
      country: 'IN',
      verificationLevel: 'identity',
      verifiedAt: status === 'VERIFIED' ? new Date().toISOString() : null
    };
  }
}

/**
 * Adapter for p2pdotme/simple-kyc-oss widget flow:
 * POST /v1/widget/sessions → widget_url
 * POST /v1/widget/result   → credential (server-side only)
 * @see https://github.com/p2pdotme/simple-kyc-oss
 */
export class SimpleKycProvider {
  constructor() {
    this.baseUrl = config.kyc.simpleKycBaseUrl.replace(/\/$/, '');
    this.apiKey = config.kyc.simpleKycApiKey;
    this.tenant = config.kyc.simpleKycTenant;
    this.redirectUri = config.kyc.simpleKycRedirectUri;
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {})
    };
  }

  async startVerification(user) {
    if (!this.apiKey) {
      throw new Error('SIMPLE_KYC_API_KEY required for real KYC. Get it from simple-kyc-oss tenant admin.');
    }
    try {
      const state = randomUUID();
      const res = await fetch(`${this.baseUrl}/v1/widget/sessions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          tenant: this.tenant,
          wallet_pubkey: kycWalletForUser(user),
          country: user.country || 'IN',
          redirect_uri: this.redirectUri,
          state,
          external_user_id: user.id
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`simple-kyc ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return {
        provider: 'simple-kyc',
        verificationId: state,
        status: 'PENDING',
        redirectUrl: data.widget_url,
        state
      };
    } catch (err) {
      if (config.demoMode) {
        return new MockKycProvider().startVerification(user);
      }
      throw new Error(`KYC provider unavailable: ${err.message}`);
    }
  }

  async redeemCode(code) {
    const res = await fetch(`${this.baseUrl}/v1/widget/result`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ code })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`simple-kyc redeem failed: ${res.status} ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const verified = data.decision === 'approve' && Boolean(data.credential);
    return {
      provider: 'simple-kyc',
      verificationId: data.credential?.jti || `kyc_${code.slice(0, 12)}`,
      status: verified ? 'VERIFIED' : 'FAILED',
      country: data.credential?.country || null,
      verificationLevel: 'identity',
      verifiedAt: verified ? new Date().toISOString() : null
    };
  }

  async getVerificationStatus(reference) {
    return {
      provider: 'simple-kyc',
      verificationId: reference,
      status: 'PENDING',
      country: null,
      verificationLevel: 'identity'
    };
  }
}

export class EudiKycProvider {
  async startVerification(user) {
    return {
      provider: 'eudi',
      verificationId: `eudi_pending_${user.id}`,
      status: 'PENDING',
      redirectUrl: null,
      message: 'EU Digital Identity Wallet verifier — configure EUDI endpoint separately.'
    };
  }

  async getVerificationStatus(reference) {
    return {
      provider: 'eudi',
      verificationId: reference,
      status: 'REVIEW',
      country: 'EU',
      verificationLevel: 'credential'
    };
  }
}

export function createKycProvider() {
  const p = config.kyc.provider;
  if (p === 'simple-kyc') return new SimpleKycProvider();
  if (p === 'eudi') return new EudiKycProvider();
  return new MockKycProvider();
}
