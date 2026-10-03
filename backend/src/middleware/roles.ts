import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

/** Role-based authorization. Must run after `authenticate`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthenticationError());
    if (!roles.includes(req.user.role)) return next(new AuthorizationError());
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
