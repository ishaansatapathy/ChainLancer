import { randomBytes } from 'crypto';
import { verifyMessage } from 'viem';
import { prisma } from '../db.js';
import { audit } from './auditService.js';
import { ApiError } from '../lib/http.js';
import {
  buildWalletVerificationMessage,
  normalizeAddress,
  POLYGON_AMOY_CHAIN_ID
} from '../lib/walletMessage.js';

const NONCE_TTL_MS = 10 * 60 * 1000;

export async function createWalletChallenge(user) {
  const nonce = randomBytes(32).toString('hex');
  const walletNonceExpiresAt = new Date(Date.now() + NONCE_TTL_MS);
  await prisma.user.update({
    where: { id: user.id },
    data: { walletNonce: nonce, walletNonceExpiresAt, walletPendingAddress: null }
  });
  return { nonce, expiresAt: walletNonceExpiresAt.toISOString() };
}

export async function createWalletChallengeForAddress(user, walletAddress) {
  const normalized = normalizeAddress(walletAddress);
  if (!normalized) throw new ApiError(400, 'Valid wallet address required');
  const { nonce, expiresAt } = await createWalletChallenge(user);
  await prisma.user.update({
    where: { id: user.id },
    data: { walletPendingAddress: normalized }
  });
  const message = buildWalletVerificationMessage(normalized, nonce);
  return { nonce, message, expiresAt, walletAddress: normalized };
}

export async function verifyWalletOwnership(user, { walletAddress, signature, nonce }) {
  const normalized = normalizeAddress(walletAddress);
  if (!normalized) throw new ApiError(400, 'Valid wallet address required');
  if (!signature || typeof signature !== 'string') throw new ApiError(400, 'Signature required');
  if (!nonce || typeof nonce !== 'string') throw new ApiError(400, 'Nonce required');

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh?.walletNonce) throw new ApiError(400, 'No active wallet challenge. Request a new one.');
  if (fresh.walletNonce !== nonce) throw new ApiError(400, 'Nonce mismatch');
  if (!fresh.walletNonceExpiresAt || Date.now() > new Date(fresh.walletNonceExpiresAt).getTime()) {
    throw new ApiError(400, 'Wallet challenge expired. Request a new one.');
  }

  const message = buildWalletVerificationMessage(normalized, nonce);
  const valid = await verifyMessage({
    address: normalized,
    message,
    signature
  });
  if (!valid) throw new ApiError(400, 'Signature verification failed');

  const taken = await prisma.user.findFirst({
    where: {
      id: { not: user.id },
      walletAddress: { equals: normalized, mode: 'insensitive' }
    }
  });
  if (taken) throw new ApiError(409, 'This wallet is already linked to another ChainLancer account');

  const now = new Date();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      walletAddress: normalized,
      walletChainId: String(POLYGON_AMOY_CHAIN_ID),
      walletVerified: true,
      walletVerifiedAt: now,
      walletNonce: null,
      walletNonceExpiresAt: null,
      walletPendingAddress: null
    }
  });

  await audit(user.id, 'WALLET_CONNECTED', {
    walletAddress: normalized,
    walletChainId: POLYGON_AMOY_CHAIN_ID,
    verified: true
  });

  return updated;
}

export function getWalletProfile(user) {
  return {
    walletAddress: user.walletAddress || null,
    walletChainId: user.walletChainId || null,
    walletVerified: Boolean(user.walletVerified),
    walletVerifiedAt: user.walletVerifiedAt || null
  };
}
