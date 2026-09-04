import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { ApiError, sendJson } from '../lib/http.js';

const COOKIE_JWT = 'jwt';
const COOKIE_REFRESH = 'jwt_refresh';

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key) out[key] = decodeURIComponent(rest.join('='));
  }
  return out;
}

export function cookie(name, value, extra = '') {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  if (extra) parts.push(extra);
  return parts.join('; ');
}

export function clearCookie(name) {
  return cookie(name, '', 'Max-Age=0');
}

export function issueCookies(user) {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, emailVerified: user.emailVerified },
    config.jwtSecret,
    { expiresIn: '15m', algorithm: 'HS256' }
  );
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
      role: user.role,
      emailVerified: user.emailVerified,
      tokenVersion: user.tokenVersion || '0'
    },
    config.jwtRefreshSecret,
    { expiresIn: '30d', algorithm: 'HS256' }
  );
  return [
    cookie(COOKIE_JWT, accessToken, 'Max-Age=900'),
    cookie(COOKIE_REFRESH, refreshToken, 'Max-Age=2592000')
  ];
}

export async function resolveUser(req) {
  const cookies = parseCookies(req.headers.cookie || '');

  if (cookies[COOKIE_JWT]) {
    try {
      const decoded = jwt.verify(cookies[COOKIE_JWT], config.jwtSecret, { algorithms: ['HS256'] });
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user) return user;
    } catch {
      // fall through
    }
  }

  if (!cookies[COOKIE_REFRESH]) return null;
  try {
    const decoded = jwt.verify(cookies[COOKIE_REFRESH], config.jwtRefreshSecret, { algorithms: ['HS256'] });
    if (decoded.type !== 'refresh') return null;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || (user.tokenVersion || '0') !== (decoded.tokenVersion || '0')) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(req) {
  const user = await resolveUser(req);
  if (!user) throw new ApiError(401, 'Authentication required');
  return user;
}

export function requireRole(...roles) {
  return (user) => {
    if (!roles.includes(user.role)) {
      throw new ApiError(403, `Requires role: ${roles.join(' or ')}`);
    }
    return user;
  };
}

export function requireKycVerified(user) {
  if (user.kycStatus !== 'VERIFIED') {
    throw new ApiError(403, 'KYC verification required');
  }
  return user;
}

export function requireComplianceApproved(user) {
  if (user.complianceStatus !== 'APPROVED') {
    throw new ApiError(403, `Compliance status: ${user.complianceStatus || 'PENDING'}`);
  }
  return user;
}

export function handleAuthError(res, err) {
  const status = err.status || 500;
  sendJson(res, status, { error: err.message || 'Internal server error' });
}
