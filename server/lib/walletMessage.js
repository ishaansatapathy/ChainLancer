import { getAddress, isAddress } from 'viem';

export const POLYGON_AMOY_CHAIN_ID = 80002;

export function buildWalletVerificationMessage(walletAddress, nonce) {
  const checksum = getAddress(walletAddress);
  return `ChainLancer Wallet Verification

I am linking this wallet to my ChainLancer account.

Wallet:
${checksum}

Nonce:
${nonce}

Purpose:
Wallet ownership verification

This signature does not authorize any transaction or transfer of funds.`;
}

export function normalizeAddress(address) {
  if (!address || !isAddress(address)) return null;
  return getAddress(address);
}
