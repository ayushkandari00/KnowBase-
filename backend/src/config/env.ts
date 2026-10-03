import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralised, validated configuration.
 *
 * Every tunable (embedding dimension, top-k, similarity threshold, chunking
 * parameters, upload limits, ...) is defined here exactly once. Nothing else
 * in the codebase should read `process.env` directly.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // OpenAI-compatible LLM endpoint
  LLM_API_KEY: z.string().min(1, 'LLM_API_KEY is required'),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  LLM_BASE_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),

  // Embeddings (defaults to the same OpenAI-compatible endpoint/key as the LLM)
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().max(16_000).default(1536),
  EMBEDDING_API_KEY: z.string().optional(),
  EMBEDDING_BASE_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),

  // Retrieval
  VECTOR_SEARCH_TOP_K: z.coerce.number().int().min(1).max(50).default(5),
  VECTOR_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),

  // Conversational memory: number of previous messages used for reformulation / generation
  CHAT_HISTORY_LIMIT: z.coerce.number().int().min(0).max(50).default(6),

  // Ingestion
  CHUNK_SIZE: z.coerce.number().int().min(100).default(1000),
  CHUNK_OVERLAP: z.coerce.number().int().min(0).default(200),
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  UPLOAD_DIR: z.string().default('uploads'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  CHAT_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a readable message; never print secret values.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

if (parsed.data.CHUNK_OVERLAP >= parsed.data.CHUNK_SIZE) {
  console.error('Invalid environment configuration: CHUNK_OVERLAP must be smaller than CHUNK_SIZE');
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
