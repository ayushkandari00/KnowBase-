import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { env, isTest } from '../config/env.js';

const message = (msg: string) => ({ error: { message: msg, code: 'RATE_LIMITED' } });

/** Global API limiter. */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  message: message('Too many requests, please try again later'),
});

/** Strict limiter for login/register to slow down credential stuffing. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  message: message('Too many authentication attempts, please try again later'),
});

/** Per-user limiter for LLM-backed endpoints (they cost money). */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.CHAT_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'anonymous',
  message: message('You are sending messages too quickly, please slow down'),
});
