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
  validateMilestone,
  reviewMilestone,
  getSettlementOptions,
  confirmSettlement,
  dashboardSummary,
  seedDemoContract
} from '../services/contractService.js';
import {
  getNettingPoolSummary,
  checkNettingStatus,
  cancelNettingObligation
} from '../services/nettingService.js';
import { getLiveForexRates, getLiveAmoyTelemetry } from '../services/settlementOptimizer.js';

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

    if (req.method === 'POST' && url.pathname === '/api/contracts/seed-demo') {
      const user = await requireAuth(req);
      const contract = await seedDemoContract(user);
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

        if (req.method === 'POST' && msSub === '/validate') {
          const user = await requireAuth(req);
          return sendJson(res, 200, await validateMilestone(id, milestoneId, user));
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

    // ── Netting Engine API Routes ──────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/settlement/netting/pool') {
      await requireAuth(req);
      return sendJson(res, 200, getNettingPoolSummary());
    }

    if (req.method === 'POST' && url.pathname === '/api/settlement/netting/check') {
      await requireAuth(req);
      const body = await readJsonBody(req);
      return sendJson(res, 200, checkNettingStatus(body.milestoneId, body.amount, body.country, body.fiat, body.asset));
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/settlement/netting/') && url.pathname.endsWith('/cancel')) {
      await requireAuth(req);
      const parts = url.pathname.split('/');
      const milestoneId = parts[parts.length - 2];
      return sendJson(res, 200, { success: cancelNettingObligation(milestoneId) });
    }

    // ── Live Network & Market Telemetry ────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/market/telemetry') {
      const [fx, amoy] = await Promise.all([getLiveForexRates(), getLiveAmoyTelemetry()]);
      return sendJson(res, 200, {
        network: {
          chainId: 80002,
          name: 'Polygon Amoy Testnet',
          blockNumber: amoy.blockNumber,
          gasPriceGwei: amoy.gasPriceGwei,
          rpc: 'https://polygon-amoy.drpc.org',
          explorer: 'https://amoy.polygonscan.com',
          status: 'CONNECTED'
        },
        forex: {
          usdInr: fx.INR || 94.54,
          usdEur: fx.EUR || 0.86,
          usdGbp: fx.GBP || 0.74,
          source: 'Open Exchange Rates (Live Interbank Feed)',
          lastUpdated: amoy.lastUpdated
        }
      });
    }

    return false;
  } catch (err) {
    handleAuthError(res, err);
    return true;
  }
}
