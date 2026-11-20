import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { withTransaction, query } from '../config/db.js';
import userRepo from '../repositories/userRepo.js';
import workspaceRepo from '../repositories/workspaceRepo.js';
import passwordResetRepo from '../repositories/passwordResetRepo.js';
import emailService from '../services/emailService.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import {
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
} from '../middleware/auth.js';

const BCRYPT_ROUNDS = 10;

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash: _pw, ...safeUser } = user;
  return safeUser;
}

/**
 * POST /api/auth/signup
 */
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, workspaceName } = req.body;

  const existing = await userRepo.findByEmail(email);
  if (existing) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_EXISTS',
      'An account with this email already exists'
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const firstName = String(name).trim().split(/\s+/)[0] || 'Team';
  const defaultWsName =
    workspaceName && workspaceName.trim()
      ? workspaceName.trim()
      : `${firstName}'s Workspace`;

  const user = await withTransaction(async (conn) => {
    const newUser = await userRepo.createUser(
      { name, email, passwordHash },
      conn
    );
    await workspaceRepo.createWorkspaceWithOwner(
      {
        name: defaultWsName,
        ownerId: newUser.id,
      },
      conn
    );
    return newUser;
  });

  const workspaces = await workspaceRepo.listUserWorkspaces(user.id);
  const token = signAuthToken(user);
  setAuthCookie(res, token);

  return res.status(201).json({
    user: sanitizeUser(user),
    workspaces,
    activeWorkspaceId: workspaces[0]?.id || null,
  });
});

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userRepo.findByEmail(email);
  if (!user || !user.passwordHash) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  let workspaces = await workspaceRepo.listUserWorkspaces(user.id);
  if (workspaces.length === 0) {
    const firstName = String(user.name).trim().split(/\s+/)[0] || 'Team';
    await workspaceRepo.createWorkspaceWithOwner({
      name: `${firstName}'s Workspace`,
      ownerId: user.id,
    });
    workspaces = await workspaceRepo.listUserWorkspaces(user.id);
  }

  const safeUser = sanitizeUser(user);
  const token = signAuthToken(safeUser);
  setAuthCookie(res, token);

  return res.status(200).json({
    user: safeUser,
    workspaces,
    activeWorkspaceId: workspaces[0]?.id || null,
  });
});

/**
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
});

/**
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  const workspaces = await workspaceRepo.listUserWorkspaces(req.user.id);

  return res.status(200).json({
    user: sanitizeUser(req.user),
    workspaces,
    activeWorkspaceId: workspaces[0]?.id || null,
    realtime: {
      enabled: env.hasPusher,
      key: env.PUSHER_KEY || null,
      cluster: env.PUSHER_CLUSTER || 'ap2',
    },
  });
});

/**
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const user = await userRepo.findByEmail(normalizedEmail);
  let resetUrl;

  if (user) {
    // 1. Invalidate existing active tokens
    await passwordResetRepo.invalidateUserTokens(user.id);

    // 2. Generate 32-byte cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // 3. Compute SHA-256 hash
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 4. Set expiration 1 hour from now
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    // 5. Save to passwordResetRepo
    await passwordResetRepo.createResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // 6. Construct reset URL
    resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // 7. Dispatch password reset email
    await emailService.sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.name,
      resetUrl,
    });
  }

  // Always respond with success to prevent user enumeration while aiding testing
  return res.status(200).json({
    success: true,
    ok: true,
    message: 'If an account exists with that email, a password reset link has been sent.',
    resetUrl: (env.isDev || env.isTest) ? resetUrl : undefined,
  });
});

/**
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // 1. Compute SHA-256 hash of provided token
  const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex');

  // 2. Find valid token
  const validToken = await passwordResetRepo.findValidToken(tokenHash);
  if (!validToken) {
    return res.status(400).json({ error: 'Invalid or expired password reset link.' });
  }

  // 3. Hash new password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // 4. In a database transaction:
  await withTransaction(async (conn) => {
    // Update user's password_hash in users
    await userRepo.updatePassword(validToken.userId, passwordHash, conn);

    // Mark token as used (used_at = NOW())
    await passwordResetRepo.markTokenUsed(validToken.id, conn);

    // Remove refresh tokens for this user in refresh_tokens if table exists
    try {
      await query('DELETE FROM refresh_tokens WHERE user_id = ?', [validToken.userId], conn);
    } catch {
      // Table may not exist in current schema
    }
  });

  return res.status(200).json({
    success: true,
    ok: true,
    message: 'Your password has been reset successfully. Please log in with your new password.',
  });
});

export default {
  signup,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
};
