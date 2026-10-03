import { StrOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { getLLM } from './llm.js';
import { ragPrompt } from './prompts.js';
import { Source } from '../types/index.js';

export function formatDocsAsContext(docs: Document[]): string {
  if (docs.length === 0) return '';

  return docs
    .map((doc, index) => {
      const meta = doc.metadata;
      const source = `[Source ${index + 1}: ${meta.filename ?? 'Unknown'}, Page: ${meta.pageNumber ?? meta.page ?? 'N/A'}, Chunk: ${meta.chunkIndex ?? index}]`;
      return `${source}\n${doc.pageContent}`;
    })
    .join('\n\n---\n\n');
}

export function extractSources(docs: Document[]): Source[] {
  return docs.map((doc) => {
    const meta = doc.metadata;
    return {
      documentId: (meta.documentId as string) ?? '',
      filename: (meta.filename as string) ?? 'Unknown',
      fileType: (meta.fileType as string) ?? 'unknown',
      page: (meta.pageNumber as number) ?? (meta.page as number) ?? undefined,
      chunkIndex: (meta.chunkIndex as number) ?? 0,
      similarity: (meta.similarity as number) ?? 0,
      content: doc.pageContent.substring(0, 200),
    };
  });
}

export function createRAGChain(chatHistory: Array<{ role: string; content: string }> = []) {
  const llm = getLLM();
  const outputParser = new StrOutputParser();

  const chain = RunnableSequence.from([
    {
      context: (input: { context: string; question: string }) => input.context,
      question: (input: { context: string; question: string }) => input.question,
      chat_history: () =>
        chatHistory.map((m) => {
          if (m.role === 'USER' || m.role === 'user') {
            return new HumanMessage(m.content);
          }
          return new AIMessage(m.content);
        }),
    },
    ragPrompt,
    llm,
    outputParser,
  ]);

  return chain;
}
