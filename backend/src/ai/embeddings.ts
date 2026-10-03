import { OpenAIEmbeddings } from '@langchain/openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let embeddingsInstance: OpenAIEmbeddings | null = null;

export function getEmbeddings(): OpenAIEmbeddings {
  if (!embeddingsInstance) {
    embeddingsInstance = new OpenAIEmbeddings({
      modelName: env.EMBEDDING_MODEL,
      openAIApiKey: env.LLM_API_KEY,
      configuration: {
        baseURL: env.LLM_BASE_URL,
        apiKey: env.LLM_API_KEY,
      },
      dimensions: env.EMBEDDING_DIMENSION,
    });
  }
  return embeddingsInstance;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embeddings = getEmbeddings();
    const embedding = await embeddings.embedQuery(text);
    return embedding;
  } catch (error) {
    logger.error('Failed to generate embedding', { error });
    throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = getEmbeddings();
    const results = await embeddings.embedDocuments(texts);
    return results;
  } catch (error) {
    logger.error('Failed to generate embeddings', { error });
    throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
