import { requireAuth, handleAuthError } from '../middleware/auth.js';
import { sendJson, readJsonBody } from '../lib/http.js';
import { publicUser } from '../models/user.js';
import {
  createWalletChallengeForAddress,
  verifyWalletOwnership,
  getWalletProfile
} from '../services/walletService.js';

export async function handleWalletRoutes(req, res, url) {
  try {
    if (req.method === 'POST' && url.pathname === '/api/users/me/wallet/challenge') {
      const user = await requireAuth(req);
      const body = await readJsonBody(req);
      const challenge = await createWalletChallengeForAddress(user, body.walletAddress);
      return sendJson(res, 200, challenge);
    }

    if (req.method === 'POST' && url.pathname === '/api/users/me/wallet/verify') {
      const user = await requireAuth(req);
      const body = await readJsonBody(req);
      const updated = await verifyWalletOwnership(user, body);
      return sendJson(res, 200, {
        user: publicUser(updated),
        wallet: getWalletProfile(updated)
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/users/me/wallet') {
      const user = await requireAuth(req);
      return sendJson(res, 200, getWalletProfile(user));
    }

    return false;
  } catch (err) {
    handleAuthError(res, err);
    return true;
  }
}
