import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../prisma/client.js';
import { vectorStore } from '../ai/vectorStore.js';
import { loadDocument } from '../ai/loaders.js';
import { splitDocuments } from '../ai/splitter.js';
import { DocumentProcessingError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { DocumentMetadata } from '../types/index.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export class DocumentService {
  /**
   * Persist the uploaded file record and start async processing.
   * Returns immediately after saving so the HTTP response is fast.
   */
  async createDocument(file: Express.Multer.File): Promise<{
    id: string;
    filename: string;
    fileType: string;
    status: string;
  }> {
    const fileType = path.extname(file.originalname).replace('.', '').toLowerCase();

    if (!['pdf', 'txt', 'md', 'markdown'].includes(fileType)) {
      // Remove the uploaded file
      await fs.unlink(file.path).catch(() => null);
      throw new DocumentProcessingError(
        `Unsupported file type: .${fileType}. Supported: pdf, txt, md`
      );
    }

    const document = await prisma.document.create({
      data: {
        filename: file.originalname,
        fileType,
        status: 'UPLOADED',
      },
      select: {
        id: true,
        filename: true,
        fileType: true,
        status: true,
      },
    });

    // Rename the temp multer file to include document ID for traceability
    const newPath = path.join(UPLOADS_DIR, `${document.id}-${file.originalname}`);
    await fs.rename(file.path, newPath).catch(async () => {
      // Fallback: keep original path
    });

    // Kick off processing in the background (do not await)
    this.processDocument(document.id, newPath, file.originalname, fileType).catch(
      (err: unknown) => {
        logger.error(`Background processing failed for document ${document.id}`, { err });
      }
    );

    return document;
  }

  /**
   * Full document processing pipeline:
   * 1. Load the file with the appropriate loader
   * 2. Split into chunks
   * 3. Store chunks in Prisma
   * 4. Generate + store embeddings in pgvector
   * 5. Update document status
   */
  async processDocument(
    documentId: string,
    filePath: string,
    filename: string,
    fileType: string
  ): Promise<void> {
    logger.info(`Starting document processing: ${documentId} (${filename})`);

    try {
      // Mark as processing
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      // Load document
      const docs = await loadDocument({ documentId, filename, fileType, filePath });

      // Split into chunks
      const chunks = await splitDocuments(docs);

      // Persist chunks to database
      const chunkRecords = await Promise.all(
        chunks.map((chunk, index) =>
          prisma.documentChunk.create({
            data: {
              documentId,
              content: chunk.pageContent,
              chunkIndex: index,
              metadata: chunk.metadata as Record<string, unknown>,
            },
          })
        )
      );

      // Generate and store embeddings
      const chunkData = chunkRecords.map((record, index) => ({
        id: record.id,
        content: chunks[index].pageContent,
        metadata: chunks[index].metadata as DocumentMetadata,
      }));

      await vectorStore.addDocuments(chunkData);

      // Mark as indexed
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'INDEXED',
          chunkCount: chunkRecords.length,
        },
      });

      logger.info(`Document processed successfully: ${documentId} (${chunkRecords.length} chunks)`);
    } catch (error) {
      logger.error(`Document processing failed: ${documentId}`, { error });

      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      }).catch(() => null);

      throw error;
    }
  }

  async listDocuments() {
    return prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        fileType: true,
        status: true,
        chunkCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getDocument(documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    return document;
  }

  async deleteDocument(documentId: string): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Clear vector embeddings first
    await vectorStore.deleteDocumentVectors(documentId);

    // Delete all chunks and the document (cascades via Prisma)
    await prisma.document.delete({ where: { id: documentId } });

    // Try to clean up the uploaded file
    const uploadedFile = path.join(UPLOADS_DIR, `${documentId}-${document.filename}`);
    await fs.unlink(uploadedFile).catch(() => null);

    logger.info(`Document deleted: ${documentId}`);
  }

  async getDocumentStats() {
    const [documentCount, vectorStats] = await Promise.all([
      prisma.document.count({ where: { status: 'INDEXED' } }),
      vectorStore.getStats(),
    ]);

    return {
      indexedDocuments: documentCount,
      totalChunks: vectorStats.totalChunks,
      indexedChunks: vectorStats.indexedChunks,
    };
  }
}

export const documentService = new DocumentService();
