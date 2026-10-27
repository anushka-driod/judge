import { Router } from 'express';
import ConversationController from '../controllers/conversationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// All conversation routes require authenticated citizen/advocate session
router.use(authenticateToken);

router.get('/', ConversationController.listUserConversations);
router.post('/', ConversationController.createConversation);
router.get('/:id', ConversationController.getConversation);
router.post('/:id/messages', ConversationController.addMessage);
router.patch('/:id', ConversationController.updateConversation);
router.delete('/:id', ConversationController.deleteConversation);

export default router;
