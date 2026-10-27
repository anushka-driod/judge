import { request } from './api';

export const conversationService = {
  /**
   * Fetch all saved conversations for the authenticated user
   */
  async getConversations() {
    return request('/conversations');
  },

  /**
   * Create a new persistent conversation
   */
  async createConversation({ id, title, category, isPinned = false, initialMessage = null, metadata = {} }) {
    return request('/conversations', {
      method: 'POST',
      body: JSON.stringify({ id, title, category, isPinned, initialMessage, metadata }),
    });
  },

  /**
   * Fetch single conversation with all its messages
   */
  async getConversationById(id) {
    return request(`/conversations/${id}`);
  },

  /**
   * Persist a new message into a conversation
   */
  async addMessage(conversationId, { id, sender, text, meta = {} }) {
    return request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ id, sender, text, meta }),
    });
  },

  /**
   * Update conversation title, pin status, or category
   */
  async updateConversation(conversationId, { title, isPinned, category }) {
    return request(`/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, isPinned, category }),
    });
  },

  /**
   * Permanently delete conversation (with backend ownership enforcement)
   */
  async deleteConversation(conversationId) {
    return request(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  },
};

export default conversationService;
