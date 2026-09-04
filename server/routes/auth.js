import { promisify } from 'util';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { createUserDefaults, publicUser } from '../models/user.js';
import { audit } from '../services/auditService.js';
import {
  clearCookie,
  cookie,
  issueCookies,
  parseCookies,
  resolveUser
} from '../middleware/auth.js';
import { handleAuthError } from '../middleware/auth.js';
import { sendJson, sendJsonWithCookies, redirect, readJsonBody } from '../lib/http.js';

const scryptAsync = promisify(scrypt);
const COOKIE_STATE = 'thread_oauth_state';

function readGoogleConfig() {
  if (!config.google.clientId || !config.google.clientSecret) return null;
  return config.google;
}

function sanitizeRedirectPath(value) {
  if (!value || typeof value !== 'string') return '/onboarding';
  if (!value.startsWith('/') || value.startsWith('//')) return '/onboarding';
  return value;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  if (!stored?.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const key = await scryptAsync(password, salt, 64);
  const actual = Buffer.from(hash, 'hex');
  return actual.length === key.length && timingSafeEqual(actual, key);
}

async function upsertGoogleUser(payload) {
  const email = String(payload.email || '').toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        ...createUserDefaults(),
        email,
        fullName: payload.name?.trim() || email.split('@')[0],
        profileImageUrl: payload.picture || null,
        emailVerified: Boolean(payload.email_verified),
        authProvider: 'google',
        providerId: payload.sub,
        tokenVersion: '0'
      }
    });
    await audit(user.id, 'LOGIN', { provider: 'google' });
    return user;
  }
  if (user.authProvider === 'local') throw new Error('An account with this email already exists. Sign in with your password first.');
  user = await prisma.user.update({
    where: { id: user.id },
    data: {
      providerId: user.providerId || payload.sub,
      profileImageUrl: user.profileImageUrl || payload.picture,
      emailVerified: user.emailVerified || Boolean(payload.email_verified)
    }
  });
  await audit(user.id, 'LOGIN', { provider: 'google' });
  return user;
}

export async function handleAuthRoutes(req, res, url) {
  try {
    if (req.method === 'GET' && url.pathname === '/api-auth/google') {
    const cfg = readGoogleConfig();
    if (!cfg) return redirect(res, `/auth?error=${encodeURIComponent('Google OAuth not configured')}`);
    const nonce = randomUUID();
    const returnTo = sanitizeRedirectPath(url.searchParams.get('state'));
    const state = Buffer.from(JSON.stringify({ nonce, returnTo, redirectUri: cfg.redirectUri }), 'utf8').toString('base64url');
    const client = new OAuth2Client({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, redirectUri: cfg.redirectUri });
    const authUrl = client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state
    });
    redirect(res, authUrl, [cookie(COOKIE_STATE, nonce, 'Max-Age=600')]);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api-auth/google/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookies = parseCookies(req.headers.cookie || '');
    let oauthState = null;
    try {
      oauthState = JSON.parse(Buffer.from(state || '', 'base64url').toString('utf8'));
    } catch {
      oauthState = null;
    }
    if (!oauthState?.nonce || cookies[COOKIE_STATE] !== oauthState.nonce) {
      return redirect(res, `/auth?error=${encodeURIComponent('Session expired')}`, [clearCookie(COOKIE_STATE)]);
    }
    const cfg = readGoogleConfig();
    const client = new OAuth2Client({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, redirectUri: cfg.redirectUri });
    const { tokens } = await client.getToken({ code, redirect_uri: oauthState.redirectUri || cfg.redirectUri });
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: cfg.clientId });
    const payload = ticket.getPayload();
    const user = await upsertGoogleUser(payload);
    const dest = sanitizeRedirectPath(oauthState.returnTo);
    return redirect(res, dest, [clearCookie(COOKIE_STATE), ...issueCookies(user)]);
  }

  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    const user = await resolveUser(req);
    if (!user) return sendJson(res, 401, { user: null });
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    return sendJsonWithCookies(res, 200, { ok: true }, [clearCookie('jwt'), clearCookie('jwt_refresh')]);
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
    const body = await readJsonBody(req);
    const email = String(body.email || '').toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return sendJson(res, 409, { error: 'Account already exists' });
    const user = await prisma.user.create({
      data: {
        ...createUserDefaults(),
        email,
        fullName: String(body.fullName || '').trim(),
        authProvider: 'local',
        passwordHash: await hashPassword(body.password),
        emailVerified: true,
        tokenVersion: '0'
      }
    });
    await audit(user.id, 'LOGIN', { provider: 'local', signup: true });
    return sendJsonWithCookies(res, 201, { user: publicUser(user) }, issueCookies(user));
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/signin') {
    const body = await readJsonBody(req);
    const email = String(body.email || '').toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return sendJson(res, 401, { error: 'Invalid email or password' });
    }
    await audit(user.id, 'LOGIN', { provider: 'local' });
    return sendJsonWithCookies(res, 200, { user: publicUser(user) }, issueCookies(user));
  }

  return false;
  } catch (err) {
    handleAuthError(res, err);
    return true;
  }
}

export default handleAuthRoutes;
