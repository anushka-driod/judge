import crypto from 'node:crypto';
import db from '../config/db.js';

// Memory fallback layer
const memoryTickets = new Map(); // id -> ticket object

export const SupportModel = {
  /**
   * Generates a unique, standardized support request ID
   */
  generateRequestId() {
    const year = new Date().getFullYear();
    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `REQ-${year}-${hex}`;
  },

  /**
   * Create a new support ticket
   */
  async create({ id, userId, userName, userEmail, userPhone, category, subject, description, priority = 'medium' }) {
    const ticketId = id || this.generateRequestId();
    const now = new Date();

    const ticket = {
      id: ticketId,
      user_id: userId || null,
      userId: userId || null,
      user_name: userName || 'Citizen User',
      userName: userName || 'Citizen User',
      user_email: (userEmail || '').toLowerCase().trim(),
      userEmail: (userEmail || '').toLowerCase().trim(),
      user_phone: userPhone || null,
      userPhone: userPhone || null,
      category: category || 'General Legal Query',
      subject: subject || 'Support Request',
      description: description || '',
      status: 'open',
      priority: priority || 'medium',
      admin_notes: '',
      notification_sent: false,
      notification_error: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    memoryTickets.set(ticketId, ticket);

    try {
      const sql = `
        INSERT INTO support_tickets (
          id, user_id, user_name, user_email, user_phone, category, subject,
          description, status, priority, admin_notes, notification_sent, notification_error,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *;
      `;
      const result = await db.query(sql, [
        ticketId,
        userId || null,
        ticket.user_name,
        ticket.user_email,
        ticket.user_phone,
        ticket.category,
        ticket.subject,
        ticket.description,
        'open',
        ticket.priority,
        '',
        false,
        null,
        now,
        now,
      ]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {
      // Memory fallback active
    }

    return ticket;
  },

  /**
   * List all tickets with optional status filtering (for Admin Dashboard)
   */
  async listAll(statusFilter = null) {
    try {
      let sql = `SELECT * FROM support_tickets ORDER BY created_at DESC;`;
      const params = [];
      if (statusFilter && statusFilter !== 'all') {
        sql = `SELECT * FROM support_tickets WHERE LOWER(status) = LOWER($1) ORDER BY created_at DESC;`;
        params.push(statusFilter);
      }
      const result = await db.query(sql, params);
      if (result.rows && result.rows.length > 0) {
        return result.rows;
      }
    } catch (e) {}

    const list = Array.from(memoryTickets.values());
    if (statusFilter && statusFilter !== 'all') {
      return list.filter((t) => t.status.toLowerCase() === statusFilter.toLowerCase());
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * List tickets filed by a specific user
   */
  async listByUser(userId, userEmail) {
    try {
      const sql = `
        SELECT * FROM support_tickets
        WHERE user_id = $1 OR LOWER(user_email) = LOWER($2)
        ORDER BY created_at DESC;
      `;
      const result = await db.query(sql, [userId || '', (userEmail || '').toLowerCase().trim()]);
      if (result.rows && result.rows.length > 0) {
        return result.rows;
      }
    } catch (e) {}

    const normEmail = (userEmail || '').toLowerCase().trim();
    return Array.from(memoryTickets.values())
      .filter((t) => (userId && t.user_id === userId) || (normEmail && t.user_email === normEmail))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * Get single ticket by ID
   */
  async getById(ticketId) {
    try {
      const sql = `SELECT * FROM support_tickets WHERE id = $1 LIMIT 1;`;
      const result = await db.query(sql, [ticketId]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    return memoryTickets.get(ticketId) || null;
  },

  /**
   * Update ticket status and admin notes
   */
  async updateStatus(ticketId, { status, adminNotes }) {
    const ticket = await this.getById(ticketId);
    if (!ticket) return null;

    const now = new Date();
    const updatedStatus = status || ticket.status;
    const updatedNotes = adminNotes !== undefined ? adminNotes : ticket.admin_notes;

    ticket.status = updatedStatus;
    ticket.admin_notes = updatedNotes;
    ticket.updated_at = now.toISOString();
    memoryTickets.set(ticketId, ticket);

    try {
      const sql = `
        UPDATE support_tickets
        SET status = $1, admin_notes = $2, updated_at = $3
        WHERE id = $4
        RETURNING *;
      `;
      const result = await db.query(sql, [updatedStatus, updatedNotes, now, ticketId]);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
    } catch (e) {}

    return ticket;
  },

  /**
   * Update notification delivery status & failure tracking
   */
  async updateNotificationStatus(ticketId, { sent, error }) {
    const ticket = await this.getById(ticketId);
    if (!ticket) return null;

    ticket.notification_sent = Boolean(sent);
    ticket.notification_error = error || null;
    memoryTickets.set(ticketId, ticket);

    try {
      const sql = `
        UPDATE support_tickets
        SET notification_sent = $1, notification_error = $2
        WHERE id = $3;
      `;
      await db.query(sql, [Boolean(sent), error || null, ticketId]);
    } catch (e) {}

    return ticket;
  },
};

export default SupportModel;
