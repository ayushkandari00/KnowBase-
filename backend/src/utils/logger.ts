type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// Read directly to avoid a circular import with config/env (which logs on failure).
const nodeEnv = process.env.NODE_ENV ?? 'development';
const minLevel: Level =
  (process.env.LOG_LEVEL as Level | undefined) ?? (nodeEnv === 'test' ? 'warn' : nodeEnv === 'production' ? 'info' : 'debug');

function serialize(meta: unknown): string {
  if (meta === undefined) return '';
  if (meta instanceof Error) return ` ${JSON.stringify({ error: meta.message })}`;
  try {
    return ` ${JSON.stringify(meta, (_k, v: unknown) => (v instanceof Error ? { error: v.message } : v))}`;
  } catch {
    return '';
  }
}

function log(level: Level, message: string, meta?: unknown): void {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}${serialize(meta)}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Minimal structured logger (no external dependency). */
export const logger = {
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
};
