import type { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

/** Metadata carried by every LangChain Document from loader to API response. */
export interface ChunkMetadata {
  documentId: string;
  filename: string;
  fileType: SupportedFileType;
  source: string;
  pageNumber?: number;
  chunkIndex: number;
  [key: string]: unknown;
}

export type SupportedFileType = 'pdf' | 'txt' | 'md';

/** A source citation returned to clients. Built only from retrieved chunks. */
export interface Source {
  documentId: string;
  filename: string;
  fileType: string;
  page?: number;
  chunkIndex: number;
  similarity: number;
  snippet: string;
}

export interface HistoryMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export interface ChatResult {
  conversationId: string;
  userMessageId: string;
  messageId: string;
  answer: string;
  sources: Source[];
  isFallback: boolean;
  standaloneQuestion: string;
}
