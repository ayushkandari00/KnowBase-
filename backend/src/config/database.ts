import { prisma } from '../prisma/client.js';
import { logger } from '../utils/logger.js';

/** Verifies PostgreSQL connectivity and that the pgvector extension is installed. */
export async function checkDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
  const ext = await prisma.$queryRaw<Array<{ extversion: string }>>`
    SELECT extversion FROM pg_extension WHERE extname = 'vector'
  `;
  if (ext.length === 0) {
    throw new Error('pgvector extension is not installed. Run `npx prisma migrate deploy`.');
  }
  logger.info(`Database connected (pgvector ${ext[0]!.extversion})`);
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
