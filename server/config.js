import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  jwtSecret: (process.env.JWT_SECRET || 'change-me-to-a-long-random-secret').trim(),
  jwtRefreshSecret: (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'change-me').trim(),
  demoMode: process.env.DEMO_MODE === 'true',
  databaseUrl: (process.env.DATABASE_URL || '').trim(),
  google: {
    clientId: (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim(),
    redirectUri: (process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api-auth/google/callback').trim()
  },
  kyc: {
    provider: (process.env.KYC_PROVIDER || 'mock').trim(),
    simpleKycBaseUrl: (process.env.SIMPLE_KYC_BASE_URL || 'http://localhost:8080').trim(),
    simpleKycApiKey: (process.env.SIMPLE_KYC_API_KEY || '').trim(),
    simpleKycTenant: (process.env.SIMPLE_KYC_TENANT || 'chainlancer').trim(),
    simpleKycRedirectUri: (process.env.SIMPLE_KYC_REDIRECT_URI || 'http://localhost:3000/kyc-callback').trim()
  },
  aml: {
    provider: (process.env.AML_PROVIDER || 'mock').trim(),
    yenteBaseUrl: (process.env.YENTE_BASE_URL || 'http://localhost:8001').trim()
  }
};

export const ROLES = ['client', 'freelancer', 'arbitrator', 'admin'];
