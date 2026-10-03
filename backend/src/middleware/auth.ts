import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AuthenticationError } from '../utils/errors.js';

const tokenPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  role: z.enum(['CUSTOMER', 'ADMIN']),
});

/**
 * Verifies the `Authorization: Bearer <jwt>` header and attaches `req.user`.
 * Expired and malformed tokens produce distinct error codes so the client can
 * react appropriately (e.g. redirect to login on TOKEN_EXPIRED).
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AuthenticationError('Missing bearer token'));
  }

  try {
    const decoded = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET, { algorithms: ['HS256'] });
    const payload = tokenPayloadSchema.parse(decoded);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthenticationError('Session expired, please log in again', 'TOKEN_EXPIRED'));
    }
    next(new AuthenticationError('Invalid token', 'INVALID_TOKEN'));
  }
}

/** Returns the authenticated user or throws (for use in controllers behind `authenticate`). */
export function requireUser(req: Request) {
  if (!req.user) throw new AuthenticationError();
  return req.user;
}
