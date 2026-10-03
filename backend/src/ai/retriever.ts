import { BaseRetriever, BaseRetrieverInput } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
import { vectorStore } from './vectorStore.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface RetrieverOptions extends BaseRetrieverInput {
  topK?: number;
  threshold?: number;
}

/**
 * Custom LangChain retriever that wraps our pgvector similarity search.
 * Returns LangChain Document objects with full metadata preserved.
 */
export class SupportKnowledgeRetriever extends BaseRetriever {
  lc_namespace = ['support', 'retrievers'];

  private topK: number;
  private threshold: number;

  // Store similarity scores alongside documents
  public lastRetrievedDocs: Array<Document & { similarity: number }> = [];

  constructor(options: RetrieverOptions = {}) {
    super(options);
    this.topK = options.topK ?? env.VECTOR_SEARCH_TOP_K;
    this.threshold = options.threshold ?? env.VECTOR_SIMILARITY_THRESHOLD;
  }

  async _getRelevantDocuments(
    query: string,
    _runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    logger.debug(`Retrieving documents for query: ${query.substring(0, 100)}`);

    try {
      const results = await vectorStore.similaritySearch(query, this.topK, this.threshold);

      // Store results with similarity for later source extraction
      this.lastRetrievedDocs = results;

      const docs = results.map(
        (r) =>
          new Document({
            pageContent: r.pageContent,
            metadata: {
              ...r.metadata,
              similarity: r.similarity,
            },
          })
      );

      logger.info(`Retrieved ${docs.length} relevant documents`);
      return docs;
    } catch (error) {
      logger.error('Retrieval failed', { error });
      return [];
    }
  }
}

export function createRetriever(options: RetrieverOptions = {}): SupportKnowledgeRetriever {
  return new SupportKnowledgeRetriever(options);
}
