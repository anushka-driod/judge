import crypto from 'node:crypto';
import db from '../config/db.js';
import {
  loadConversationsFromDisk,
  saveConversationsToDisk,
  loadMessagesFromDisk,
  saveMessagesToDisk,
} from '../utils/fileStore.js';

// In-memory persistence fallback layer (indexed by userId and conversationId)
const memoryConversations = new Map(); // id -> conversation object
const memoryMessages = new Map(); // conversationId -> array of message objects

// Hydrate from disk
try {
  const diskConvs = loadConversationsFromDisk();
  for (const c of diskConvs) {
    if (c?.id) {
      memoryConversations.set(c.id, {
        ...c,
        userId: c.userId || c.user_id,
        user_id: c.user_id || c.userId,
      });
    }
  }
  const diskMsgs = loadMessagesFromDisk();
  for (const [convId, msgs] of Object.entries(diskMsgs)) {
    if (Array.isArray(msgs)) {
      memoryMessages.set(convId, msgs);
    }
  }
} catch (e) {
  console.warn('[ConversationModel] Could not hydrate conversations from disk:', e.message);
}

export const ConversationModel = {
  /**
   * Create a new chat conversation
   */
  async createConversation({ id, userId, caseId = null, title, category = 'General Legal Guidance', isPinned = false, metadata = {} }) {
    if (!userId) {
      const error = new Error('An authenticated conversation owner is required.');
      error.status = 401;
      throw error;
    }

    const convId = id || `conv_${crypto.randomBytes(8).toString('hex')}`;
    const existingMemoryConversation = memoryConversations.get(convId);
    if (existingMemoryConversation) {
      if (String(existingMemoryConversation.user_id) !== String(userId) && String(existingMemoryConversation.userId) !== String(userId)) {
        const error = new Error('Conversation ID is already owned by another user.');
        error.status = 409;
        throw error;
      }
      return existingMemoryConversation;
    }

    const now = new Date();

    const conversation = {
      id: convId,
      user_id: userId,
      userId,
      case_id: caseId,
      title: title || 'New Legal Consultation',
      category,
      is_pinned: Boolean(isPinned),
      isPinned: Boolean(isPinned),
      conversation_summary: '',
      metadata,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    try {
      const sql = `
        INSERT INTO chat_conversations (id, user_id, case_id, title, category, is_pinned, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
        RETURNING *;
      `;
      const result = await db.query(sql, [
        convId,
        userId,
        caseId,
        conversation.title,
        category,
        conversation.is_pinned,
        JSON.stringify(metadata),
        now,
        now,
      ]);
      if (result?.rows?.[0]) {
        memoryConversations.set(convId, {
          ...result.rows[0],
          user_id: result.rows[0].user_id,
          userId: result.rows[0].user_id,
        });
        if (!memoryMessages.has(convId)) memoryMessages.set(convId, []);
        saveConversationsToDisk(memoryConversations);
        return { ...result.rows[0], userId: result.rows[0].user_id, isPinned: result.rows[0].is_pinned };
      }
      if (!result?.isFallback) {
        const conflict = new Error('Conversation ID already exists.');
        conflict.status = 409;
        throw conflict;
      }
    } catch (dbErr) {
      if (dbErr.status) throw dbErr;
      // In-memory fallback
    }

    memoryConversations.set(convId, conversation);
    if (!memoryMessages.has(convId)) memoryMessages.set(convId, []);
    saveConversationsToDisk(memoryConversations);
    return conversation;
  },

  /**
   * List all conversations for a specific authenticated user
   */
  async listByUser(userId) {
    if (!userId) return [];

    try {
      const sql = `
        SELECT c.*, 
          COALESCE((SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id), 0) AS message_count
        FROM chat_conversations c
        WHERE c.user_id = $1
        ORDER BY c.is_pinned DESC, c.updated_at DESC;
      `;
      const result = await db.query(sql, [userId]);
      if (!result?.isFallback && result?.rows) {
        return result.rows.map((row) => ({
          ...row,
          userId: row.user_id,
          isPinned: row.is_pinned,
        }));
      }
    } catch (dbErr) {
      // Fallback to memory
    }

    // Filter memory conversations strictly for this user
    const userConvs = [];
    for (const conv of memoryConversations.values()) {
      if (String(conv.user_id) === String(userId) || String(conv.userId) === String(userId)) {
        const msgs = memoryMessages.get(conv.id) || [];
        userConvs.push({
          ...conv,
          message_count: msgs.length,
        });
      }
    }

    return userConvs.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });
  },

  /**
   * Get single conversation with ownership verification
   */
  async getById(conversationId, userId) {
    if (!conversationId || !userId) return null;

    try {
      const sql = `
        SELECT * FROM chat_conversations
        WHERE id = $1 AND user_id = $2;
      `;
      const result = await db.query(sql, [conversationId, userId]);
      if (result?.rows?.[0]) {
        const row = result.rows[0];
        return { ...row, userId: row.user_id, isPinned: row.is_pinned };
      }
    } catch (dbErr) {
      // Memory fallback
    }

    const mem = memoryConversations.get(conversationId);
    if (!mem) return null;
    if (userId && String(mem.user_id) !== String(userId) && String(mem.userId) !== String(userId)) {
      return null; // Ownership protection
    }
    return mem;
  },

  /**
   * Update conversation title, pinned status, or metadata
   */
  async update(conversationId, userId, updates = {}) {
    const existing = await this.getById(conversationId, userId);
    if (!existing) {
      const err = new Error('Conversation not found or access denied.');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    const updatedTitle = updates.title !== undefined ? updates.title : existing.title;
    const updatedPinned = updates.isPinned !== undefined ? Boolean(updates.isPinned) : (existing.isPinned ?? existing.is_pinned);
    const updatedCategory = updates.category !== undefined ? updates.category : existing.category;

    // Update memory
    const mem = memoryConversations.get(conversationId) || existing;
    mem.title = updatedTitle;
    mem.is_pinned = updatedPinned;
    mem.isPinned = updatedPinned;
    mem.category = updatedCategory;
    mem.updated_at = now.toISOString();
    memoryConversations.set(conversationId, mem);
    saveConversationsToDisk(memoryConversations);

    try {
      const sql = `
        UPDATE chat_conversations
        SET title = $1, is_pinned = $2, category = $3, updated_at = $4
        WHERE id = $5 AND user_id = $6
        RETURNING *;
      `;
      const result = await db.query(sql, [updatedTitle, updatedPinned, updatedCategory, now, conversationId, userId]);
      if (result?.rows?.[0]) {
        const row = result.rows[0];
        return { ...row, userId: row.user_id, isPinned: row.is_pinned };
      }
    } catch (dbErr) {
      // Memory fallback
    }

    return mem;
  },

  /**
   * Delete conversation with strict user ownership protection
   */
  async delete(conversationId, userId) {
    const existing = await this.getById(conversationId, userId);
    if (!existing) {
      const err = new Error('Conversation not found or unauthorized to delete.');
      err.status = 404;
      throw err;
    }

    // Delete from memory and disk
    memoryConversations.delete(conversationId);
    memoryMessages.delete(conversationId);
    saveConversationsToDisk(memoryConversations);
    saveMessagesToDisk(memoryMessages);

    try {
      const sql = `
        DELETE FROM chat_conversations
        WHERE id = $1 AND user_id = $2;
      `;
      await db.query(sql, [conversationId, userId]);
    } catch (dbErr) {
      // Memory fallback completed
    }

    return { success: true, id: conversationId };
  },

  /**
   * Add a message to a conversation
   */
  async addMessage({ id, conversationId, userId, sender, text, meta = {} }) {
    if (!userId || !(await this.getById(conversationId, userId))) {
      const error = new Error('Conversation not found or access denied.');
      error.status = 404;
      throw error;
    }

    const msgId = id || `msg_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();

    const message = {
      id: msgId,
      conversation_id: conversationId,
      conversationId,
      user_id: userId,
      userId,
      sender: sender || 'user',
      text: text || '',
      message_text: text || '',
      detected_emotion: meta.detectedEmotion || null,
      detectedLaws: meta.detectedLaws || [],
      detectedPrecedents: meta.detectedPrecedents || [],
      suggestedNextSteps: meta.suggestedNextSteps || [],
      factGatheringQuestions: meta.factGatheringQuestions || [],
      agentSteps: meta.agentSteps || [],
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      created_at: now.toISOString(),
    };

    // Store in memory
    if (!memoryMessages.has(conversationId)) {
      memoryMessages.set(conversationId, []);
    }
    memoryMessages.get(conversationId).push(message);

    // Update conversation's updated_at
    const conv = memoryConversations.get(conversationId);
    if (conv) {
      conv.updated_at = now.toISOString();
    }
    saveConversationsToDisk(memoryConversations);
    saveMessagesToDisk(memoryMessages);

    try {
      const sql = `
        INSERT INTO chat_messages (
          id, conversation_id, user_id, sender, message_text, detected_emotion,
          detected_laws, detected_precedents, suggested_next_steps, fact_gathering_questions,
          agent_steps, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      await db.query(sql, [
        msgId,
        conversationId,
        userId,
        sender,
        text,
        meta.detectedEmotion || null,
        JSON.stringify(meta.detectedLaws || []),
        JSON.stringify(meta.detectedPrecedents || []),
        JSON.stringify(meta.suggestedNextSteps || []),
        JSON.stringify(meta.factGatheringQuestions || []),
        JSON.stringify(meta.agentSteps || []),
        now,
      ]);

      // Bump conversation timestamp in SQL
      await db.query(`UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1;`, [conversationId]);
    } catch (dbErr) {
      // Memory fallback
    }

    return message;
  },

  /**
   * Retrieve all messages for a conversation with ownership check
   */
  async getMessages(conversationId, userId) {
    if (!conversationId || !userId) return [];
    const conversation = await this.getById(conversationId, userId);
    if (!conversation) return [];

    try {
      const sql = `
        SELECT m.*
        FROM chat_messages m
        JOIN chat_conversations c ON m.conversation_id = c.id
        WHERE m.conversation_id = $1 AND c.user_id = $2
        ORDER BY m.created_at ASC;
      `;
      const result = await db.query(sql, [conversationId, userId]);
      if (result?.rows && result.rows.length > 0) {
        return result.rows.map((r) => ({
          id: r.id,
          conversationId: r.conversation_id,
          sender: r.sender,
          text: r.message_text,
          detectedEmotion: r.detected_emotion,
          detectedLaws: r.detected_laws || [],
          detectedPrecedents: r.detected_precedents || [],
          suggestedNextSteps: r.suggested_next_steps || [],
          factGatheringQuestions: r.fact_gathering_questions || [],
          agentSteps: r.agent_steps || [],
          timestamp: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: r.created_at,
        }));
      }
    } catch (dbErr) {
      // Memory fallback
    }

    const list = memoryMessages.get(conversationId) || [];
    if (String(conversation.user_id) !== String(userId) && String(conversation.userId) !== String(userId)) return [];
    return list.map((m) => ({
      ...m,
      text: m.text || m.message_text,
    }));
  },
};

export default ConversationModel;
