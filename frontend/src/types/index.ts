export interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
  updatedAt?: string;
}

export interface Source {
  documentId: string;
  filename: string;
  fileType: string;
  page?: number;
  chunkIndex: number;
  similarity: number;
  content?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources: Source[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
  messages?: Message[];
}

export interface Document {
  id: string;
  filename: string;
  fileType: string;
  status: 'UPLOADED' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  messageId: string;
  userId: string;
  type: 'POSITIVE' | 'NEGATIVE';
  comment?: string;
  createdAt: string;
}

export interface Stats {
  users: number;
  conversations: number;
  questions: number;
  documents: number;
  indexedChunks: number;
  totalChunks: number;
  feedback: {
    positive: number;
    negative: number;
    total: number;
  };
}

export interface Analytics {
  recentConversations: Array<{
    id: string;
    title: string;
    createdAt: string;
    user: { email: string };
    _count: { messages: number };
  }>;
  recentDocuments: Array<{
    id: string;
    filename: string;
    status: string;
    chunkCount: number;
    createdAt: string;
  }>;
  feedbackBreakdown: Array<{ type: string; _count: { type: number } }>;
  documentStatuses: Array<{ status: string; _count: { status: number } }>;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
  conversationId: string;
  messageId: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Array<{ field: string; message: string }>;
}
