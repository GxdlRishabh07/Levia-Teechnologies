import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import userRepo from '../repositories/userRepo.js';
import { AppError, asyncHandler } from './errorHandler.js';

export const COOKIE_NAME = 'flowspace_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Signs a 7-day JWT for an authenticated user.
 *
 * @param {{ id: number, email: string, name: string }} user
 * @returns {string}
 */
export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: Number(user.id),
      email: user.email,
      name: user.name,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Attaches the JWT in a first-party `httpOnly` cookie (`SameSite=Lax`, `Secure` in production).
 */
export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  });
}

/**
 * Clears the authentication cookie on logout.
 */
export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    path: '/',
  });
}

/**
 * Extracts the JWT from `req.cookies[COOKIE_NAME]` or `Authorization: Bearer <token>`.
 */
function extractToken(req) {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken && typeof cookieToken === 'string') {
    return cookieToken.trim();
  }

  const authHeader = req.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

/**
 * Express middleware that verifies the JWT and attaches `req.user`.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired authentication token');
  }

  const userId = Number(payload?.sub);
  if (!userId || Number.isNaN(userId)) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token payload');
  }

  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Account no longer exists');
  }

  req.user = user;
  next();
});

export default {
  COOKIE_NAME,
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
};
