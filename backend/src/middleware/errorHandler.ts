import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env, isProduction } from '../config/env.js';

interface ErrorBody {
  error: { message: string; code: string; details?: unknown; stack?: string };
}

/** Maps any thrown error to a consistent JSON shape. Never leaks stack traces in production. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const { status, body } = toResponse(err);

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}`, err instanceof Error ? { message: err.message, stack: err.stack } : err);
  } else {
    logger.debug(`${req.method} ${req.originalUrl} -> ${status} ${body.error.code}`);
  }

  if (!isProduction && err instanceof Error && status >= 500) body.error.stack = err.stack;

  if (res.headersSent) {
    // Streaming responses: the SSE handler deals with its own errors.
    res.end();
    return;
  }
  res.status(status).json(body);
}

function toResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return { status: err.statusCode, body: { error: { message: err.message, code: err.code, details: err.details } } };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          message: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
      },
    };
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? `File exceeds the maximum size of ${Math.round(env.MAX_FILE_SIZE / 1024 / 1024)} MB` : err.message;
    return { status: err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, body: { error: { message, code: err.code } } };
  }

  // Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    return { status: 400, body: { error: { message: 'Malformed JSON body', code: 'INVALID_JSON' } } };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return { status: 404, body: { error: { message: 'Resource not found', code: 'NOT_FOUND' } } };
    if (err.code === 'P2002') return { status: 409, body: { error: { message: 'Resource already exists', code: 'CONFLICT' } } };
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return { status: 503, body: { error: { message: 'Database unavailable', code: 'DATABASE_UNAVAILABLE' } } };
  }

  return {
    status: 500,
    body: { error: { message: isProduction ? 'Internal server error' : err instanceof Error ? err.message : 'Unknown error', code: 'INTERNAL_ERROR' } },
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { message: `Route ${req.method} ${req.path} not found`, code: 'ROUTE_NOT_FOUND' } });
}
