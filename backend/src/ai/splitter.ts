import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface SplitterOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export async function splitDocuments(
  documents: Document[],
  options: SplitterOptions = {}
): Promise<Document[]> {
  const chunkSize = options.chunkSize ?? env.CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? env.CHUNK_OVERLAP;

  logger.info(`Splitting ${documents.length} documents`, { chunkSize, chunkOverlap });

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  const chunks = await splitter.splitDocuments(documents);

  // Add chunk index to metadata while preserving all existing metadata
  const chunksWithIndex = chunks.map((chunk, index) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      chunkIndex: index,
    },
  }));

  logger.info(`Generated ${chunksWithIndex.length} chunks from ${documents.length} documents`);

  return chunksWithIndex;
}
