import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const testDir = mkdtempSync(path.join(tmpdir(), 'chainlancer-test-'));
process.env.TEST_DATA_DIR = testDir;
process.env.DEMO_MODE = 'true';
process.env.KYC_PROVIDER = 'mock';
process.env.AML_PROVIDER = 'mock';

const { prisma } = await import('../db.js');
const { evaluateCompliance } = await import('../services/compliancePolicyEngine.js');
const { assignRole } = await import('../services/onboardingService.js');
const { requireRole, requireAuth } = await import('../middleware/auth.js');
const { completeMockKyc } = await import('../services/kycService.js');
const { MockAMLProvider } = await import('../providers/aml/index.js');

after(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('CompliancePolicyEngine', () => {
  test('KYC pending blocks approval', () => {
    const r = evaluateCompliance({ kycStatus: 'PENDING', amlStatus: 'NOT_SCREENED' });
    assert.equal(r.complianceStatus, 'PENDING');
  });

  test('KYC verified + AML clear → approved', () => {
    const r = evaluateCompliance({ kycStatus: 'VERIFIED', amlStatus: 'CLEAR' });
    assert.equal(r.complianceStatus, 'APPROVED');
  });

  test('KYC verified + AML match → hold', () => {
    const r = evaluateCompliance({ kycStatus: 'VERIFIED', amlStatus: 'MATCH' });
    assert.equal(r.complianceStatus, 'HOLD');
  });

  test('AML review → compliance review', () => {
    const r = evaluateCompliance({ kycStatus: 'VERIFIED', amlStatus: 'REVIEW' });
    assert.equal(r.complianceStatus, 'REVIEW');
  });
});

describe('RBAC', () => {
  let client;
  let freelancer;

  before(async () => {
    client = await prisma.user.upsert({
      where: { email: 'client-test@chainlancer.io' },
      update: { role: 'client', kycStatus: 'VERIFIED', amlStatus: 'CLEAR', complianceStatus: 'APPROVED' },
      create: {
        id: 'user-client-test',
        email: 'client-test@chainlancer.io',
        fullName: 'Client User',
        role: 'client',
        kycStatus: 'VERIFIED',
        amlStatus: 'CLEAR',
        complianceStatus: 'APPROVED'
      }
    });
    freelancer = await prisma.user.upsert({
      where: { email: 'freelancer-test@chainlancer.io' },
      update: { role: 'freelancer', kycStatus: 'VERIFIED', amlStatus: 'CLEAR', complianceStatus: 'APPROVED' },
      create: {
        id: 'user-freelancer-test',
        email: 'freelancer-test@chainlancer.io',
        fullName: 'Freelancer User',
        role: 'freelancer',
        kycStatus: 'VERIFIED',
        amlStatus: 'CLEAR',
        complianceStatus: 'APPROVED'
      }
    });
  });

  test('client passes client role check', () => {
    assert.doesNotThrow(() => requireRole('client')(client));
  });

  test('client cannot pass freelancer role check', () => {
    assert.throws(() => requireRole('freelancer')(client), (err) => {
      assert.equal(err.status, 403);
      return true;
    });
  });

  test('freelancer cannot pass client role check', () => {
    assert.throws(() => requireRole('client')(freelancer), (err) => err.status === 403);
  });

  test('role assigned once — cannot change', async () => {
    await assert.rejects(() => assignRole(client, 'freelancer'), /already assigned/i);
  });
});

describe('KYC + AML flow', () => {
  test('mock KYC verified triggers AML and compliance', async () => {
    const user = await prisma.user.upsert({
      where: { email: 'kyc-test@chainlancer.io' },
      update: { kycStatus: 'NOT_STARTED', amlStatus: 'NOT_SCREENED', complianceStatus: 'PENDING' },
      create: {
        id: 'user-kyc-test',
        email: 'kyc-test@chainlancer.io',
        fullName: 'Demo User',
        role: 'client',
        country: 'IN'
      }
    });
    const updated = await completeMockKyc(user, 'VERIFIED');
    assert.equal(updated.kycStatus, 'VERIFIED');
    assert.equal(updated.amlStatus, 'CLEAR');
    assert.equal(updated.complianceStatus, 'APPROVED');
  });

  test('AML match name triggers hold', async () => {
    const provider = new MockAMLProvider();
    const result = await provider.screenIndividual({ fullName: 'sanctioned person', country: 'IN' });
    assert.equal(result.status, 'MATCH');
    const compliance = evaluateCompliance({ kycStatus: 'VERIFIED', amlStatus: result.status });
    assert.equal(compliance.complianceStatus, 'HOLD');
  });

  test('AML unavailable returns review not approved', async () => {
    const compliance = evaluateCompliance({ kycStatus: 'VERIFIED', amlStatus: 'REVIEW' });
    assert.notEqual(compliance.complianceStatus, 'APPROVED');
  });
});

describe('Auth guards', () => {
  test('unauthenticated request throws 401', async () => {
    const req = { headers: {} };
    await assert.rejects(() => requireAuth(req), (err) => err.status === 401);
  });
});
