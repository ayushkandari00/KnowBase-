import { createApp } from './app.js';
import { env } from './config/env.js';
import { testDatabaseConnection } from './config/database.js';
import { vectorStore } from './ai/vectorStore.js';
import { prisma } from './prisma/client.js';
import { logger } from './utils/logger.js';
import fs from 'fs';
import path from 'path';

async function bootstrap(): Promise<void> {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Test database connectivity
  await testDatabaseConnection();

  // Initialize pgvector store (adds column + HNSW index if missing)
  await vectorStore.initialize();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`🌐 CORS origin: ${env.CLIENT_URL}`);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal} — starting graceful shutdown`);

    server.close(async () => {
      try {
        await prisma.$disconnect();
        logger.info('Prisma disconnected');
      } catch (err) {
        logger.error('Error during Prisma disconnect', { err });
      }
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced exit after 10s timeout');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', { reason });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
