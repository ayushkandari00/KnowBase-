import { Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service.js';
import { AuthRequest } from '../types/index.js';
import { ChatMessageInput, FeedbackInput } from '../schemas/chat.schemas.js';

export class ChatController {
  async chat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { question, conversationId } = req.body as ChatMessageInput;
      const userId = req.user!.id;

      const result = await chatService.chat(userId, question, conversationId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversations = await chatService.listConversations(req.user!.id);
      res.status(200).json({ conversations });
    } catch (error) {
      next(error);
    }
  }

  async getConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const conversation = await chatService.getConversation(id, req.user!.id);
      res.status(200).json({ conversation });
    } catch (error) {
      next(error);
    }
  }

  async deleteConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await chatService.deleteConversation(id, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async submitFeedback(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { messageId } = req.params;
      const input = req.body as FeedbackInput;
      const result = await chatService.submitFeedback(messageId, req.user!.id, input);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAdminStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await chatService.getAdminStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
