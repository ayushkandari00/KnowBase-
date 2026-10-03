import { z } from 'zod';

export const MAX_QUESTION_LENGTH = 2000;

const question = z
  .string()
  .trim()
  .min(1, 'Question is required')
  .max(MAX_QUESTION_LENGTH, `Question must be at most ${MAX_QUESTION_LENGTH} characters`);

export const chatBodySchema = z.object({
  question,
  conversationId: z.string().uuid('Invalid conversation id').optional(),
});

/** Query string for `GET /api/chat/stream` (SSE). */
export const chatStreamQuerySchema = chatBodySchema;

export const feedbackSchema = z.object({
  type: z.enum(['POSITIVE', 'NEGATIVE']),
  comment: z.string().trim().max(1000).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export type ChatInput = z.infer<typeof chatBodySchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
