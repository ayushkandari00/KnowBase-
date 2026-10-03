import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireCustomer } from '../middleware/roles.js';
import { validateBody } from '../middleware/validate.js';
import { chatMessageSchema, feedbackSchema } from '../schemas/chat.schemas.js';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// Send a message
router.post('/', validateBody(chatMessageSchema), requireCustomer, (req, res, next) =>
  chatController.chat(req, res, next)
);

// Conversation management
router.get('/conversations', requireCustomer, (req, res, next) =>
  chatController.listConversations(req, res, next)
);

router.get('/conversations/:id', requireCustomer, (req, res, next) =>
  chatController.getConversation(req, res, next)
);

router.delete('/conversations/:id', requireCustomer, (req, res, next) =>
  chatController.deleteConversation(req, res, next)
);

// Feedback on assistant messages
router.post('/messages/:messageId/feedback', validateBody(feedbackSchema), requireCustomer, (req, res, next) =>
  chatController.submitFeedback(req, res, next)
);

// Admin stats
router.get('/stats', requireAdmin, (req, res, next) =>
  chatController.getAdminStats(req, res, next)
);

export default router;
