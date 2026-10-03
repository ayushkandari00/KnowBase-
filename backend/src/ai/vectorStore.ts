import { Document } from '@langchain/core/documents';
import { pgPool } from '../config/database.js';
import { env } from '../config/env.js';
import { generateEmbedding, generateEmbeddings } from './embeddings.js';
import { logger } from '../utils/logger.js';
import { DocumentMetadata } from '../types/index.js';

/**
 * VectorStore wraps pgvector operations for the document_chunks table.
 * We use raw parameterized SQL for vector operations that Prisma does not
 * natively support, while keeping all other DB operations through Prisma.
 *
 * Index: We use an HNSW index with cosine distance (vector_cosine_ops)
 * for efficient approximate nearest-neighbor search. HNSW provides
 * better query performance than IVFFlat for our use case.
 */
export class VectorStore {
  private readonly tableName = 'document_chunks';

  async initialize(): Promise<void> {
    const client = await pgPool.connect();
    try {
      // Ensure pgvector extension exists
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');

      // Add embedding column if it doesn't exist
      await client.query(`
        ALTER TABLE ${this.tableName}
        ADD COLUMN IF NOT EXISTS embedding vector(${env.EMBEDDING_DIMENSION})
      `);

      // Create HNSW index for cosine similarity
      // HNSW (Hierarchical Navigable Small World) provides better query
      // performance than IVFFlat for most use cases
      await client.query(`
        CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
        ON ${this.tableName}
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
      `);

      logger.info('Vector store initialized with HNSW index');
    } finally {
      client.release();
    }
  }

  async addDocuments(
    chunks: Array<{ id: string; content: string; metadata: DocumentMetadata }>
  ): Promise<void> {
    if (chunks.length === 0) return;

    logger.info(`Generating embeddings for ${chunks.length} chunks`);

    const texts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(texts);

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        const vectorStr = `[${embedding.join(',')}]`;

        await client.query(
          `UPDATE ${this.tableName}
           SET embedding = $1::vector
           WHERE id = $2`,
          [vectorStr, chunk.id]
        );
      }

      await client.query('COMMIT');
      logger.info(`Stored ${chunks.length} embeddings in vector store`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async similaritySearch(
    query: string,
    topK: number = env.VECTOR_SEARCH_TOP_K,
    threshold: number = env.VECTOR_SIMILARITY_THRESHOLD
  ): Promise<Array<Document & { similarity: number }>> {
    const queryEmbedding = await generateEmbedding(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const client = await pgPool.connect();
    try {
      /**
       * Cosine similarity = 1 - cosine_distance
       * pgvector's <=> operator computes cosine distance.
       * We filter by similarity >= threshold and order by distance ascending.
       */
      const result = await client.query(
        `SELECT
           dc.id,
           dc.content,
           dc.metadata,
           dc."documentId",
           dc."chunkIndex",
           d.filename,
           d."fileType",
           1 - (dc.embedding <=> $1::vector) AS similarity
         FROM ${this.tableName} dc
         JOIN documents d ON d.id = dc."documentId"
         WHERE dc.embedding IS NOT NULL
           AND 1 - (dc.embedding <=> $1::vector) >= $2
         ORDER BY dc.embedding <=> $1::vector ASC
         LIMIT $3`,
        [vectorStr, threshold, topK]
      );

      return result.rows.map((row) => ({
        pageContent: row.content as string,
        metadata: {
          ...(typeof row.metadata === 'object' ? row.metadata : {}),
          documentId: row.documentId as string,
          filename: row.filename as string,
          fileType: row.fileType as string,
          chunkIndex: row.chunkIndex as number,
          source: row.filename as string,
        } as Record<string, unknown>,
        similarity: parseFloat(row.similarity as string),
      }));
    } finally {
      client.release();
    }
  }

  async deleteDocumentVectors(documentId: string): Promise<void> {
    const client = await pgPool.connect();
    try {
      await client.query(
        `UPDATE ${this.tableName} SET embedding = NULL WHERE "documentId" = $1`,
        [documentId]
      );
      logger.info(`Cleared vectors for document: ${documentId}`);
    } finally {
      client.release();
    }
  }

  async getStats(): Promise<{ totalChunks: number; indexedChunks: number }> {
    const client = await pgPool.connect();
    try {
      const result = await client.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(embedding) AS indexed
        FROM ${this.tableName}
      `);
      return {
        totalChunks: parseInt(result.rows[0].total as string),
        indexedChunks: parseInt(result.rows[0].indexed as string),
      };
    } finally {
      client.release();
    }
  }
}

export const vectorStore = new VectorStore();
