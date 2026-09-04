import { requireAuth, handleAuthError } from '../middleware/auth.js';
import { sendJson, readJsonBody } from '../lib/http.js';
import { publicUser } from '../models/user.js';
import { getProfile, saveProfile } from '../services/profileService.js';
import {
  listContracts,
  getContract,
  createContract,
  advanceContractCompliance,
  prepareFundEscrow,
  attemptFundEscrow,
  participateContract,
  submitDeliverable,
  reviewMilestone,
  getSettlementOptions,
  confirmSettlement,
  dashboardSummary
} from '../services/contractService.js';

export async function handleAppRoutes(req, res, url) {
  try {
    if (req.method === 'GET' && url.pathname === '/api/profile') {
      const user = await requireAuth(req);
      return sendJson(res, 200, await getProfile(user));
    }

    if (req.method === 'PUT' && url.pathname === '/api/profile') {
      const user = await requireAuth(req);
      const body = await readJsonBody(req);
      return sendJson(res, 200, await saveProfile(user, body));
    }

    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      const user = await requireAuth(req);
      return sendJson(res, 200, { user: publicUser(user), ...(await dashboardSummary(user)) });
    }

    if (req.method === 'GET' && url.pathname === '/api/contracts') {
      const user = await requireAuth(req);
      return sendJson(res, 200, { contracts: await listContracts(user) });
    }

    if (req.method === 'POST' && url.pathname === '/api/contracts') {
      const user = await requireAuth(req);
      const body = await readJsonBody(req);
      const contract = await createContract(user, body);
      return sendJson(res, 201, { contract });
    }

    const contractMatch = url.pathname.match(/^\/api\/contracts\/([^/]+)(\/.*)?$/);
    if (contractMatch) {
      const id = contractMatch[1];
      const sub = contractMatch[2] || '';

      if (req.method === 'GET' && !sub) {
        const user = await requireAuth(req);
        return sendJson(res, 200, { contract: await getContract(id, user) });
      }

      if (req.method === 'POST' && sub === '/compliance') {
        const user = await requireAuth(req);
        return sendJson(res, 200, { contract: await advanceContractCompliance(id, user) });
      }

      if (req.method === 'GET' && sub === '/fund') {
        const user = await requireAuth(req);
        return sendJson(res, 200, await prepareFundEscrow(id, user));
      }

      if (req.method === 'POST' && sub === '/fund') {
        const user = await requireAuth(req);
        await attemptFundEscrow(id, user);
        return false;
      }

      if (req.method === 'POST' && sub === '/participate') {
        const user = await requireAuth(req);
        return sendJson(res, 200, { contract: await participateContract(id, user) });
      }

      const msMatch = sub.match(/^\/milestones\/([^/]+)(\/.*)?$/);
      if (msMatch) {
        const milestoneId = msMatch[1];
        const msSub = msMatch[2] || '';

        if (req.method === 'POST' && msSub === '/submit') {
          const user = await requireAuth(req);
          const body = await readJsonBody(req);
          return sendJson(res, 200, { contract: await submitDeliverable(id, milestoneId, user, body) });
        }

        if (req.method === 'POST' && msSub === '/review') {
          const user = await requireAuth(req);
          const body = await readJsonBody(req);
          return sendJson(res, 200, { contract: await reviewMilestone(id, milestoneId, user, body) });
        }

        if (req.method === 'GET' && msSub === '/settlement/options') {
          const user = await requireAuth(req);
          return sendJson(res, 200, await getSettlementOptions(id, milestoneId, user));
        }

        if (req.method === 'POST' && msSub === '/settlement/confirm') {
          const user = await requireAuth(req);
          const body = await readJsonBody(req);
          return sendJson(res, 200, await confirmSettlement(id, milestoneId, user, body));
        }
      }
    }

    return false;
  } catch (err) {
    handleAuthError(res, err);
    return true;
  }
}
