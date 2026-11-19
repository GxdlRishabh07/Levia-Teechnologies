import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const RATE_LIMIT_PAYLOAD = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests, please try again shortly.',
  },
};

function createLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max: env.isTest ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    message: RATE_LIMIT_PAYLOAD,
  });
}

/**
 * General API rate limiter (300 requests per 15 minutes per IP).
 */
export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
});

/**
 * Stricter rate limiter for `/api/auth` routes (40 requests per 15 minutes per IP).
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
});

/**
 * Rate limiter for AI endpoints (`/api/workspaces/:wid/ai/*`, 30 requests per minute per IP).
 */
export const aiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
});

export default {
  apiLimiter,
  authLimiter,
  aiLimiter,
};
