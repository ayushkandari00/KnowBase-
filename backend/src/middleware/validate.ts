import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

type Part = 'body' | 'query' | 'params';

/**
 * Validates and coerces a request part with a Zod schema.
 * Parsed values are stored on `res.locals.validated[part]` (Express 5 makes
 * `req.query` read-only), and for `body` also replace `req.body`.
 */
export function validate(schema: ZodType, part: Part = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) return next(result.error);
    const store = (res.locals.validated ??= {}) as Record<Part, unknown>;
    store[part] = result.data;
    if (part === 'body') req.body = result.data;
    next();
  };
}

/** Typed accessor for values validated by `validate()`. */
export function validated<T>(res: Response, part: Part): T {
  return (res.locals.validated as Record<Part, unknown>)[part] as T;
}
