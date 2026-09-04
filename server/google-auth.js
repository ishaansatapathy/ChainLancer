import { promisify } from 'util';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

const COOKIE_STATE = 'thread_oauth_state';
const COOKIE_JWT = 'jwt';
const COOKIE_REFRESH = 'jwt_refresh';

function env(name, fallback = '') {
  return (process.env[name] || fallback).trim();
}

function readGoogleConfig() {
  const clientId = env('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = env('GOOGLE_OAUTH_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: env('GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:3000/api-auth/google/callback')
  };
}

function jwtSecret() {
  return env('JWT_SECRET', 'change-me-to-a-long-random-secret');
}

function refreshSecret() {
  return env('JWT_REFRESH_SECRET') || jwtSecret();
}

function isSecure() {
  return env('NODE_ENV') === 'production';
}

function cookie(name, value, extra = '') {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (isSecure()) parts.push('Secure');
  if (extra) parts.push(extra);
  return parts.join('; ');
}

function clearCookie(name) {
  return cookie(name, '', 'Max-Age=0');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key) out[key] = decodeURIComponent(rest.join('='));
  }
  return out;
}

function sanitizeRedirectPath(value) {
  if (!value || typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function redirect(res, location, cookies = []) {
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

function loadUsers() {
  if (!existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function upsertGoogleUser(payload) {
  const email = String(payload.email || '').toLowerCase().trim();
  const users = loadUsers();
  let user = users.find((row) => row.email === email);

  if (!user) {
    user = {
      id: randomUUID(),
      email,
      fullName: payload.name?.trim() || email.split('@')[0],
      profileImageUrl: payload.picture || null,
      emailVerified: Boolean(payload.email_verified),
      authProvider: 'google',
      providerId: payload.sub,
      tokenVersion: '0',
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  if (user.authProvider === 'local') {
    throw new Error('An account with this email already exists. Sign in with your password first.');
  }

  if (user.providerId && user.providerId !== payload.sub) {
    throw new Error('This email is linked to a different Google account.');
  }

  user.providerId = user.providerId || payload.sub;
  user.profileImageUrl = user.profileImageUrl || payload.picture || null;
  user.emailVerified = user.emailVerified || Boolean(payload.email_verified);
  user.fullName = user.fullName || payload.name?.trim() || email.split('@')[0];
  saveUsers(users);
  return user;
}

function issueCookies(user) {
  const accessToken = jwt.sign(
    { userId: user.id, emailVerified: user.emailVerified, role: user.role || 'user' },
    jwtSecret(),
    { expiresIn: '15m', algorithm: 'HS256' }
  );
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
      emailVerified: user.emailVerified,
      role: user.role || 'user',
      tokenVersion: user.tokenVersion || '0'
    },
    refreshSecret(),
    { expiresIn: '30d', algorithm: 'HS256' }
  );

  return [
    cookie(COOKIE_JWT, accessToken, `Max-Age=${15 * 60}`),
    cookie(COOKIE_REFRESH, refreshToken, `Max-Age=${30 * 24 * 60 * 60}`)
  ];
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    emailVerified: user.emailVerified,
    profileImageUrl: user.profileImageUrl,
    role: user.role || 'user'
  };
}

function resolveUser(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const access = cookies[COOKIE_JWT];
  const refresh = cookies[COOKIE_REFRESH];
  const users = loadUsers();

  if (access) {
    try {
      const decoded = jwt.verify(access, jwtSecret(), { algorithms: ['HS256'] });
      return users.find((user) => user.id === decoded.userId) || null;
    } catch {
      // try refresh
    }
  }

  if (!refresh) return null;
  try {
    const decoded = jwt.verify(refresh, refreshSecret(), { algorithms: ['HS256'] });
    if (decoded.type !== 'refresh') return null;
    const user = users.find((row) => row.id === decoded.userId);
    if (!user) return null;
    if ((user.tokenVersion || '0') !== (decoded.tokenVersion || '0')) return null;
    return user;
  } catch {
    return null;
  }
}

function signInError(message) {
  return `/auth.html?error=${encodeURIComponent(message)}`;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const key = await scryptAsync(password, salt, 64);
  const actual = Buffer.from(hash, 'hex');
  if (actual.length !== key.length) return false;
  return timingSafeEqual(actual, key);
}

function sanitizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

export function googleAuthMiddleware() {
  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api-auth/google') {
      const config = readGoogleConfig();
      if (!config) {
        return redirect(res, signInError('Google sign-in is not configured. Add GOOGLE_OAUTH_* to .env and restart.'));
      }

      try {
        const nonce = randomUUID();
        const returnTo = sanitizeRedirectPath(url.searchParams.get('state'));
        const redirectUri = config.redirectUri;
        const state = Buffer.from(JSON.stringify({ nonce, returnTo, redirectUri }), 'utf8').toString('base64url');
        const client = new OAuth2Client({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri
        });
        const authUrl = client.generateAuthUrl({
          access_type: 'online',
          scope: ['openid', 'email', 'profile'],
          prompt: 'select_account',
          state
        });
        return redirect(res, authUrl, [cookie(COOKIE_STATE, nonce, 'Max-Age=600')]);
      } catch {
        return redirect(res, signInError('Google sign-in failed to start. Check OAuth credentials and restart.'));
      }
    }

    if (req.method === 'GET' && url.pathname === '/api-auth/google/callback') {
      const oauthError = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const cookies = parseCookies(req.headers.cookie || '');

      if (oauthError) {
        const message =
          errorDescription?.trim() ||
          (oauthError === 'redirect_uri_mismatch'
            ? 'Google sign-in redirect URI mismatch. Use the same callback URL as Corsair.'
            : oauthError.replace(/_/g, ' '));
        return redirect(res, signInError(message), [clearCookie(COOKIE_STATE)]);
      }

      if (!code) {
        return redirect(
          res,
          signInError('Start sign-in from Get Started — do not open the callback URL directly.'),
          [clearCookie(COOKIE_STATE)]
        );
      }

      let oauthState = null;
      try {
        oauthState = JSON.parse(Buffer.from(state || '', 'base64url').toString('utf8'));
      } catch {
        oauthState = null;
      }

      const expectedNonce = cookies[COOKIE_STATE];
      if (!oauthState?.nonce || !expectedNonce || oauthState.nonce !== expectedNonce) {
        return redirect(res, signInError('Google sign-in session expired. Please try again.'), [
          clearCookie(COOKIE_STATE)
        ]);
      }

      const config = readGoogleConfig();
      if (!config) {
        return redirect(res, signInError('Google OAuth is not configured.'), [clearCookie(COOKIE_STATE)]);
      }

      try {
        const redirectUri = oauthState.redirectUri || config.redirectUri;
        const client = new OAuth2Client({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri
        });
        const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });
        if (!tokens.id_token) {
          throw new Error('Google sign-in did not return an ID token');
        }
        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: config.clientId
        });
        const payload = ticket.getPayload();
        if (!payload?.email) {
          throw new Error('Google account email not available');
        }

        const user = upsertGoogleUser(payload);
        const destination = sanitizeRedirectPath(oauthState.returnTo);
        const separator = destination.includes('?') ? '&' : '?';
        return redirect(res, `${destination}${separator}hero=1`, [
          clearCookie(COOKIE_STATE),
          ...issueCookies(user)
        ]);
      } catch (error) {
        return redirect(
          res,
          signInError(error.message || 'Google sign-in failed. Please try again.'),
          [clearCookie(COOKIE_STATE)]
        );
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const user = resolveUser(req);
      if (!user) return sendJson(res, 401, { user: null });

      const cookies = parseCookies(req.headers.cookie || '');
      if (!cookies[COOKIE_JWT] && cookies[COOKIE_REFRESH]) {
        res.setHeader('Set-Cookie', issueCookies(user));
      }
      return sendJson(res, 200, { user: publicUser(user) });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      return sendJsonWithCookies(res, 200, { ok: true }, [
        clearCookie(COOKIE_JWT),
        clearCookie(COOKIE_REFRESH)
      ]);
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
      try {
        const body = await readJsonBody(req);
        const email = sanitizeEmail(body.email);
        const fullName = String(body.fullName || '').trim();
        const password = body.password;

        if (!email || !email.includes('@')) return sendJson(res, 400, { error: 'Enter a valid email address.' });
        if (fullName.length < 2) return sendJson(res, 400, { error: 'Enter your full name.' });
        if (!validatePassword(password)) return sendJson(res, 400, { error: 'Password must be at least 8 characters.' });

        const users = loadUsers();
        if (users.some((row) => row.email === email)) {
          return sendJson(res, 409, { error: 'An account with this email already exists. Sign in instead.' });
        }

        const user = {
          id: randomUUID(),
          email,
          fullName,
          profileImageUrl: null,
          emailVerified: true,
          authProvider: 'local',
          providerId: null,
          passwordHash: await hashPassword(password),
          tokenVersion: '0',
          createdAt: new Date().toISOString()
        };
        users.push(user);
        saveUsers(users);
        return sendJsonWithCookies(res, 201, { user: publicUser(user) }, issueCookies(user));
      } catch (error) {
        return sendJson(res, 400, { error: error.message || 'Unable to create account.' });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/signin') {
      try {
        const body = await readJsonBody(req);
        const email = sanitizeEmail(body.email);
        const password = body.password;
        const user = loadUsers().find((row) => row.email === email);

        if (!user) return sendJson(res, 401, { error: 'Invalid email or password.' });
        if (user.authProvider === 'google') {
          return sendJson(res, 409, { error: 'This email is linked to Google. Continue with Google.' });
        }
        if (!(await verifyPassword(password, user.passwordHash))) {
          return sendJson(res, 401, { error: 'Invalid email or password.' });
        }

        return sendJsonWithCookies(res, 200, { user: publicUser(user) }, issueCookies(user));
      } catch (error) {
        return sendJson(res, 400, { error: error.message || 'Unable to sign in.' });
      }
    }

    next();
  };
}

function sendJsonWithCookies(res, status, data, cookies) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Set-Cookie', cookies);
  res.end(JSON.stringify(data));
}
