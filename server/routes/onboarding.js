import { requireAuth, requireRole, requireKycVerified, requireComplianceApproved, handleAuthError } from '../middleware/auth.js';
import { sendJson, readJsonBody } from '../lib/http.js';
import { assignRole, assignCountry, getOnboardingState } from '../services/onboardingService.js';
import { startKyc, getKycStatus, completeMockKyc, completeKycFromCode, handleKycWebhook } from '../services/kycService.js';
import { runAmlScreening } from '../services/amlService.js';
import { publicUser } from '../models/user.js';
import { config } from '../config.js';
import { prisma } from '../db.js';

export async function handleOnboardingRoutes(req, res, url) {
  try {
    if (req.method === 'GET' && url.pathname === '/api/onboarding/status') {
      const user = await requireAuth(req);
      return sendJson(res, 200, getOnboardingState(user));
    }

    if (req.method === 'POST' && url.pathname === '/api/onboarding/role') {
      const user = await requireAuth(req);
      const body = await readJsonBody(req);
      const updated = await assignRole(user, body.role);
      return sendJson(res, 200, { user: publicUser(updated) });
    }

    if (req.method === 'POST' && url.pathname === '/api/onboarding/country') {
      const user = await requireAuth(req);
      const body = await readJsonBody(req);
      const updated = await assignCountry(user, body.country);
      return sendJson(res, 200, { user: publicUser(updated) });
    }

    if (req.method === 'POST' && url.pathname === '/api/kyc/start') {
      const user = await requireAuth(req);
      if (!user.role) return sendJson(res, 400, { error: 'Select a role first' });
      if (!user.country) return sendJson(res, 400, { error: 'Select country first' });
      const result = await startKyc(user);
      return sendJson(res, 200, {
        session: result.session,
        user: publicUser(result.user)
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/kyc/status') {
      const user = await requireAuth(req);
      await getKycStatus(user);
      const fresh = await prisma.user.findUnique({ where: { id: user.id } });
      return sendJson(res, 200, { user: publicUser(fresh) });
    }

    if (req.method === 'POST' && url.pathname === '/api/kyc/mock/complete') {
      if (config.kyc.provider !== 'mock' && !config.demoMode) {
        return sendJson(res, 403, { error: 'Mock KYC only in demo mode' });
      }
      const user = await requireAuth(req);
      const body = await readJsonBody(req);
      const updated = await completeMockKyc(user, body.outcome || 'VERIFIED');
      return sendJson(res, 200, { user: publicUser(updated) });
    }

    if (req.method === 'POST' && url.pathname === '/api/kyc/complete') {
      const user = await requireAuth(req);
      const body = await readJsonBody(req);
      const updated = await completeKycFromCode(user, body.code);
      return sendJson(res, 200, { user: publicUser(updated) });
    }

    if (req.method === 'POST' && url.pathname === '/api/kyc/webhook') {
      const body = await readJsonBody(req);
      const updated = await handleKycWebhook(body);
      return sendJson(res, 200, { user: publicUser(updated) });
    }

    if (req.method === 'POST' && url.pathname === '/api/aml/screen') {
      const user = await requireAuth(req);
      requireKycVerified(user);
      const updated = await runAmlScreening(user);
      return sendJson(res, 200, { user: publicUser(updated) });
    }

    if (req.method === 'GET' && url.pathname === '/api/compliance/status') {
      const user = await requireAuth(req);
      return sendJson(res, 200, {
        complianceStatus: user.complianceStatus,
        complianceReason: user.complianceReason,
        kycStatus: user.kycStatus,
        amlStatus: user.amlStatus
      });
    }

    // RBAC-protected demo endpoints
    if (req.method === 'POST' && url.pathname === '/api/projects') {
      const user = await requireAuth(req);
      requireRole('client')(user);
      requireKycVerified(user);
      requireComplianceApproved(user);
      return sendJson(res, 201, { ok: true, message: 'Project creation authorized for client' });
    }

    if (req.method === 'GET' && url.pathname === '/api/freelancer/projects') {
      const user = await requireAuth(req);
      requireRole('freelancer')(user);
      requireKycVerified(user);
      requireComplianceApproved(user);
      return sendJson(res, 200, { projects: [] });
    }

    if (req.method === 'GET' && url.pathname === '/api/arbitrator/disputes') {
      const user = await requireAuth(req);
      requireRole('arbitrator')(user);
      return sendJson(res, 200, { disputes: [] });
    }

    return false;
  } catch (err) {
    handleAuthError(res, err);
    return true;
  }
}
