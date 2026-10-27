import ConversationModel from '../models/conversationModel.js';

export const ConversationController = {
  /**
   * GET /api/conversations
   */
  async listUserConversations(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required to view conversations.' });
      }

      const list = await ConversationModel.listByUser(userId);
      res.json({ success: true, count: list.length, conversations: list });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/conversations
   */
  async createConversation(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required to create conversation.' });
      }

      const { id, title, category, isPinned, metadata, initialMessage } = req.body;
      const conversation = await ConversationModel.createConversation({
        id,
        userId,
        title: title || 'New Legal Consultation',
        category: category || 'General Legal Guidance',
        isPinned: Boolean(isPinned),
        metadata: metadata || {},
      });

      if (initialMessage) {
        await ConversationModel.addMessage({
          conversationId: conversation.id,
          userId,
          sender: initialMessage.sender || 'user',
          text: initialMessage.text,
          meta: initialMessage.meta || {},
        });
      }

      res.status(201).json({ success: true, conversation });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/conversations/:id
   */
  async getConversation(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const conversation = await ConversationModel.getById(id, userId);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found or access denied.' });
      }

      const messages = await ConversationModel.getMessages(id, userId);
      res.json({
        success: true,
        conversation: {
          ...conversation,
          messages,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/conversations/:id/messages
   */
  async addMessage(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { id: msgId, sender, text, meta } = req.body;

      if (!text && !meta) {
        return res.status(400).json({ success: false, error: 'Message content is required.' });
      }

      // Check conversation ownership
      const conv = await ConversationModel.getById(id, userId);
      if (!conv) {
        return res.status(404).json({ success: false, error: 'Conversation not found or access denied.' });
      }

      const message = await ConversationModel.addMessage({
        id: msgId,
        conversationId: id,
        userId,
        sender: sender || 'user',
        text: text || '',
        meta: meta || {},
      });

      res.status(201).json({ success: true, message });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  /**
   * PATCH /api/conversations/:id
   */
  async updateConversation(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { title, isPinned, category } = req.body;

      const updated = await ConversationModel.update(id, userId, {
        title,
        isPinned,
        category,
      });

      res.json({ success: true, conversation: updated });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, error: err.message });
    }
  },

  /**
   * DELETE /api/conversations/:id
   */
  async deleteConversation(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const result = await ConversationModel.delete(id, userId);
      res.json(result);
    } catch (err) {
      res.status(err.status || 400).json({ success: false, error: err.message });
    }
  },
};

export default ConversationController;
