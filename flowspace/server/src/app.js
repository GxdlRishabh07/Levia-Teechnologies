import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { checkDbHealth } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import { requireMembership } from './middleware/membership.js';
import { apiLimiter, authLimiter, aiLimiter } from './middleware/rateLimit.js';
import {
  notFoundHandler,
  errorHandler,
  asyncHandler,
} from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import realtimeRoutes from './routes/realtimeRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

export const app = express();

// Trust first proxy (Vercel serverless edge / local reverse proxy)
app.set('trust proxy', 1);

// Security & request parsing middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    const dbHealth = await checkDbHealth();
    return res.status(dbHealth.ok ? 200 : 503).json({
      status: dbHealth.ok ? 'ok' : 'degraded',
      db: dbHealth,
      aiConfigured: env.hasGroq,
      realtimeConfigured: env.hasPusher,
      timestamp: new Date().toISOString(),
    });
  })
);

// Route mounting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/realtime', apiLimiter, realtimeRoutes);
app.use(
  '/api/workspaces/:wid/ai',
  aiLimiter,
  requireAuth,
  requireMembership,
  aiRoutes
);
app.use('/api/workspaces', apiLimiter, workspaceRoutes);

// 404 & central error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
