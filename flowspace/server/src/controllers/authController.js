import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { withTransaction } from '../config/db.js';
import userRepo from '../repositories/userRepo.js';
import workspaceRepo from '../repositories/workspaceRepo.js';
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

export default {
  signup,
  login,
  logout,
  me,
};
