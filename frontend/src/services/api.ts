import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  User,
  Conversation,
  Message,
  Document,
  Source,
  Stats,
  Analytics,
  ChatResponse,
  Feedback,
} from '../types/index.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - attach JWT
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor - handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(email: string, password: string, role?: string) {
    const { data } = await this.client.post<{ user: User; token: string }>(
      '/api/auth/register',
      { email, password, role }
    );
    return data;
  }

  async login(email: string, password: string) {
    const { data } = await this.client.post<{ user: User; token: string }>('/api/auth/login', {
      email,
      password,
    });
    return data;
  }

  async getMe() {
    const { data } = await this.client.get<{ user: User }>('/api/auth/me');
    return data.user;
  }

  // Chat
  async sendMessage(question: string, conversationId?: string): Promise<ChatResponse> {
    const { data } = await this.client.post<ChatResponse>('/api/chat', {
      question,
      conversationId,
    });
    return data;
  }

  // Streaming chat
  streamMessage(
    question: string,
    conversationId: string | undefined,
    onToken: (token: string) => void,
    onDone: (data: { conversationId: string; messageId: string; sources: Source[] }) => void,
    onError: (error: string) => void
  ): EventSource {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ question });
    if (conversationId) params.set('conversationId', conversationId);
    if (token) params.set('token', token);

    const url = `${BASE_URL}/api/chat/stream?${params.toString()}`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener('token', (e) => {
      const data = JSON.parse(e.data) as { token: string };
      onToken(data.token);
    });

    eventSource.addEventListener('done', (e) => {
      const data = JSON.parse(e.data) as {
        conversationId: string;
        messageId: string;
        sources: Source[];
      };
      eventSource.close();
      onDone(data);
    });

    eventSource.addEventListener('error', (e) => {
      const msgEvent = e as MessageEvent;
      if (msgEvent.data) {
        const data = JSON.parse(msgEvent.data) as { message: string };
        onError(data.message);
      } else {
        onError('Connection error');
      }
      eventSource.close();
    });

    return eventSource;
  }

  // Conversations
  async getConversations() {
    const { data } = await this.client.get<{ conversations: Conversation[] }>('/api/conversations');
    return data.conversations;
  }

  async getConversation(id: string) {
    const { data } = await this.client.get<{ conversation: Conversation }>(
      `/api/conversations/${id}`
    );
    return data.conversation;
  }

  async deleteConversation(id: string) {
    await this.client.delete(`/api/conversations/${id}`);
  }

  async getMessages(conversationId: string) {
    const { data } = await this.client.get<{ messages: Message[] }>(
      `/api/conversations/${conversationId}/messages`
    );
    return data.messages;
  }

  // Feedback
  async submitFeedback(messageId: string, type: 'POSITIVE' | 'NEGATIVE', comment?: string) {
    const { data } = await this.client.post<{ feedback: Feedback }>(
      `/api/messages/${messageId}/feedback`,
      { type, comment }
    );
    return data.feedback;
  }

  // Documents
  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post<{ documentId: string; message: string }>(
      '/api/documents/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  }

  async getDocuments() {
    const { data } = await this.client.get<{ documents: Document[] }>('/api/documents');
    return data.documents;
  }

  async getDocument(id: string) {
    const { data } = await this.client.get<{ document: Document }>(`/api/documents/${id}`);
    return data.document;
  }

  async deleteDocument(id: string) {
    await this.client.delete(`/api/documents/${id}`);
  }

  async reindexDocument(id: string) {
    const { data } = await this.client.post<{ message: string }>(`/api/documents/${id}/reindex`);
    return data;
  }

  // Admin
  async getStats() {
    const { data } = await this.client.get<{ stats: Stats }>('/api/admin/stats');
    return data.stats;
  }

  async getAnalytics() {
    const { data } = await this.client.get<{ analytics: Analytics }>('/api/admin/analytics');
    return data.analytics;
  }
}

export const api = new ApiService();

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    return data?.error ?? data?.message ?? error.message ?? 'An error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
}
