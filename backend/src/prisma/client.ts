import { PrismaClient } from '@prisma/client';
import { isProduction, env } from '../config/env.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Shared Prisma client (singleton, survives tsx watch reloads in development). */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (!isProduction) globalForPrisma.prisma = prisma;
