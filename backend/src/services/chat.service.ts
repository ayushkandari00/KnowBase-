import { prisma } from '../prisma/client.js';
import { runRAGPipeline } from '../ai/graph.js';
import { NotFoundError, AuthorizationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { Source } from '../types/index.js';
import { FeedbackInput } from '../schemas/chat.schemas.js';

export class ChatService {
  /**
   * Process a chat message through the RAG pipeline.
   * Creates a conversation if none exists, persists both user and assistant messages.
   */
  async chat(
    userId: string,
    question: string,
    conversationId?: string
  ): Promise<{
    answer: string;
    sources: Source[];
    conversationId: string;
    messageId: string;
    isFallback: boolean;
  }> {
    // Get or create conversation
    let conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 20, // Load last 20 messages for history
            },
          },
        })
      : null;

    if (conversationId && !conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: question.substring(0, 80),
        },
        include: { messages: true },
      });
    }

    // Build conversation history for context
    const conversationHistory = conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: question,
      },
    });

    // Run RAG pipeline
    logger.info(`Running RAG pipeline for user ${userId}`, {
      conversationId: conversation.id,
      historyLength: conversationHistory.length,
    });

    const ragResult = await runRAGPipeline(question, conversationHistory);

    // Save assistant message with sources
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: ragResult.answer,
        sources: ragResult.sources as unknown as object[],
      },
    });

    // Update conversation title from first question if it was just created
    if (conversation.messages.length === 0) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: question.substring(0, 80) },
      }).catch(() => null);
    }

    return {
      answer: ragResult.answer,
      sources: ragResult.sources,
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      isFallback: ragResult.isFallback,
    };
  }

  async listConversations(userId: string) {
    return prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            sources: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    return conversation;
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    await prisma.conversation.delete({ where: { id: conversationId } });
    logger.info(`Conversation deleted: ${conversationId}`);
  }

  async submitFeedback(
    messageId: string,
    userId: string,
    input: FeedbackInput
  ): Promise<{ id: string }> {
    // Verify the message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { select: { userId: true } } },
    });

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    if (message.conversation.userId !== userId) {
      throw new AuthorizationError('Cannot submit feedback for another user\'s message');
    }

    const feedback = await prisma.feedback.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: {
        messageId,
        userId,
        type: input.type,
        comment: input.comment,
      },
      update: {
        type: input.type,
        comment: input.comment,
      },
    });

    return { id: feedback.id };
  }

  async getAdminStats() {
    const [totalConversations, totalMessages, feedbackStats] = await Promise.all([
      prisma.conversation.count(),
      prisma.message.count({ where: { role: 'ASSISTANT' } }),
      prisma.feedback.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
    ]);

    const positive = feedbackStats.find((f) => f.type === 'POSITIVE')?._count.type ?? 0;
    const negative = feedbackStats.find((f) => f.type === 'NEGATIVE')?._count.type ?? 0;

    return {
      totalConversations,
      totalMessages,
      feedback: { positive, negative, total: positive + negative },
    };
  }
}

export const chatService = new ChatService();
