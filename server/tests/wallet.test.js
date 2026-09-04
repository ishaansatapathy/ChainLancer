import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const testDir = mkdtempSync(path.join(tmpdir(), 'chainlancer-wallet-test-'));
process.env.TEST_DATA_DIR = testDir;

const { db } = await import('../db.js');
const { createUserDefaults } = await import('../models/user.js');
const {
  createWalletChallengeForAddress,
  verifyWalletOwnership
} = await import('../services/walletService.js');
const { normalizeAddress, buildWalletVerificationMessage } = await import('../lib/walletMessage.js');
const { requireAuth } = await import('../middleware/auth.js');

const account = privateKeyToAccount(generatePrivateKey());
const account2 = privateKeyToAccount(generatePrivateKey());

after(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('Wallet address validation', () => {
  test('valid address normalizes to checksum', () => {
    const lower = account.address.toLowerCase();
    assert.equal(normalizeAddress(lower), account.address);
  });

  test('invalid address rejected', () => {
    assert.equal(normalizeAddress('not-an-address'), null);
    assert.equal(normalizeAddress('0x123'), null);
  });
});

describe('Wallet challenge + verification', () => {
  let user;

  before(() => {
    user = db.users.upsert(createUserDefaults({
      id: 'wallet-user-1',
      email: 'wallet@test.com',
      fullName: 'Wallet User'
    }));
  });

  test('challenge creation returns message with nonce', () => {
    const challenge = createWalletChallengeForAddress(user, account.address);
    assert.ok(challenge.nonce);
    assert.ok(challenge.message.includes(challenge.nonce));
    assert.ok(challenge.message.includes(account.address));
  });

  test('successful signature verification links wallet', async () => {
    const challenge = createWalletChallengeForAddress(user, account.address);
    const signature = await account.signMessage({ message: challenge.message });
    const updated = await verifyWalletOwnership(user, {
      walletAddress: account.address,
      signature,
      nonce: challenge.nonce
    });
    assert.equal(updated.walletVerified, true);
    assert.equal(updated.walletAddress, account.address);
    assert.equal(updated.walletChainId, 80002);
  });

  test('replayed nonce rejected', async () => {
    const challenge = createWalletChallengeForAddress(user, account.address);
    const signature = await account.signMessage({ message: challenge.message });
    await verifyWalletOwnership(user, {
      walletAddress: account.address,
      signature,
      nonce: challenge.nonce
    });
    await assert.rejects(
      () => verifyWalletOwnership(user, {
        walletAddress: account.address,
        signature,
        nonce: challenge.nonce
      }),
      /challenge|nonce/i
    );
  });

  test('invalid signature rejected', async () => {
    const fresh = db.users.upsert(createUserDefaults({
      id: 'wallet-user-2',
      email: 'wallet2@test.com',
      fullName: 'Wallet Two'
    }));
    const challenge = createWalletChallengeForAddress(fresh, account2.address);
    const badSig = await account.signMessage({ message: challenge.message });
    await assert.rejects(
      () => verifyWalletOwnership(fresh, {
        walletAddress: account2.address,
        signature: badSig,
        nonce: challenge.nonce
      }),
      /verification failed/i
    );
  });

  test('wallet uniqueness enforced', async () => {
    const other = db.users.upsert(createUserDefaults({
      id: 'wallet-user-3',
      email: 'wallet3@test.com',
      fullName: 'Wallet Three'
    }));
    const challenge = createWalletChallengeForAddress(other, account.address);
    const signature = await account.signMessage({ message: challenge.message });
    await assert.rejects(
      () => verifyWalletOwnership(other, {
        walletAddress: account.address,
        signature,
        nonce: challenge.nonce
      }),
      /already linked/i
    );
  });

  test('expired nonce rejected', async () => {
    const expiredUser = db.users.upsert(createUserDefaults({
      id: 'wallet-user-4',
      email: 'wallet4@test.com',
      fullName: 'Wallet Four'
    }));
    const challenge = createWalletChallengeForAddress(expiredUser, account2.address);
    db.users.update(expiredUser.id, {
      walletNonceExpiresAt: new Date(Date.now() - 1000).toISOString()
    });
    const signature = await account2.signMessage({ message: challenge.message });
    await assert.rejects(
      () => verifyWalletOwnership(expiredUser, {
        walletAddress: account2.address,
        signature,
        nonce: challenge.nonce
      }),
      /expired/i
    );
  });
});

describe('Auth guards for wallet routes', () => {
  test('unauthenticated request throws 401', () => {
    assert.throws(() => requireAuth({ headers: {} }), (err) => err.status === 401);
  });
});

describe('Wallet message format', () => {
  test('message includes wallet and nonce', () => {
    const msg = buildWalletVerificationMessage(account.address, 'abc123');
    assert.match(msg, /ChainLancer Wallet Verification/);
    assert.match(msg, new RegExp(account.address));
    assert.match(msg, /abc123/);
  });
});
