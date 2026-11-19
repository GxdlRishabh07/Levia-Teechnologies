import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (flowspace/.env)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // MySQL 8 (local) / TiDB Cloud Serverless (production)
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('flowspace'),
  DB_SSL: z
    .preprocess((val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        return ['true', '1', 'yes'].includes(val.trim().toLowerCase());
      }
      return false;
    }, z.boolean())
    .default(false),

  // JWT Auth
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters')
    .default('flowspace-dev-jwt-secret-change-in-production-2026'),

  // Groq AI (Qwen / Llama + Whisper)
  GROQ_API_KEY: z.string().optional().default(''),
  GROQ_MODEL: z.string().optional().default('qwen/qwen3.8-27b'),

  // Pusher Channels (Realtime)
  PUSHER_APP_ID: z.string().optional().default(''),
  PUSHER_KEY: z.string().optional().default(''),
  PUSHER_SECRET: z.string().optional().default(''),
  PUSHER_CLUSTER: z.string().optional().default('ap2'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Failed to validate environment variables');
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isDev: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
  hasPusher: Boolean(
    parsed.data.PUSHER_APP_ID &&
      parsed.data.PUSHER_KEY &&
      parsed.data.PUSHER_SECRET &&
      parsed.data.PUSHER_CLUSTER
  ),
  hasGroq: Boolean(parsed.data.GROQ_API_KEY),
};

export default env;
