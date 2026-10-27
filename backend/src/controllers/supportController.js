import SupportModel from '../models/supportModel.js';
import EmailService from '../services/emailService.js';

export const SupportController = {
  /**
   * POST /api/support
   * Create a new support ticket (public or authenticated user)
   */
  async createTicket(req, res) {
    try {
      const { name, email, phone, category, subject, description, priority } = req.body;
      const user = req.user || null;

      const userEmail = email || user?.email;
      const userName = name || user?.name || 'Citizen User';
      const userPhone = phone || user?.phone || null;

      if (!userEmail || !subject || !description) {
        return res.status(400).json({
          success: false,
          error: 'Email address, subject, and issue description are required.',
        });
      }

      const ticket = await SupportModel.create({
        userId: user?.id || null,
        userName,
        userEmail,
        userPhone,
        category: category || 'General Legal Query',
        subject,
        description,
        priority: priority || 'medium',
      });

      // Dispatch to the configured administrator only.
      // STRICT PRIVACY RULE: Do not email entire private legal conversations automatically.
      const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
      
      try {
        await EmailService.sendSupportNotificationEmail?.(adminEmail, {
          requestId: ticket.id,
          category: ticket.category,
          subject: ticket.subject,
          description: ticket.description,
          userEmail: ticket.user_email || ticket.userEmail,
          userName: ticket.user_name || ticket.userName,
          priority: ticket.priority,
        });
        await SupportModel.updateNotificationStatus(ticket.id, { sent: true });
        ticket.notification_sent = true;
      } catch (notifyErr) {
        // Notification failure tracking (never breaks user request)
        console.warn(`[Support] Notification delivery to ${adminEmail} failed:`, notifyErr.message);
        await SupportModel.updateNotificationStatus(ticket.id, {
          sent: false,
          error: notifyErr.message || 'Notification delivery queued/failed.',
        });
        ticket.notification_sent = false;
        ticket.notification_error = notifyErr.message;
      }

      res.status(201).json({
        success: true,
        message: 'Support request submitted successfully.',
        ticket,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: `Failed to create support ticket: ${err.message}`,
      });
    }
  },

  /**
   * GET /api/support/my-tickets
   * Authenticated user lists their own submitted requests
   */
  async listMyTickets(req, res) {
    try {
      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const tickets = await SupportModel.listByUser(userId, userEmail);
      res.json({ success: true, count: tickets.length, tickets });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/admin/support
   * Protected Admin Dashboard: list all requests with optional status filtering
   */
  async adminListTickets(req, res) {
    try {
      const { status } = req.query;
      const tickets = await SupportModel.listAll(status);
      res.json({ success: true, count: tickets.length, tickets });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/admin/support/:id
   * Protected Admin Dashboard: get single support request by ID
   */
  async adminGetTicket(req, res) {
    try {
      const ticket = await SupportModel.getById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ success: false, error: 'Support request not found.' });
      }
      res.json({ success: true, ticket });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * PATCH /api/admin/support/:id
   * Protected Admin Dashboard: update ticket status and admin notes
   */
  async adminUpdateTicket(req, res) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      const updated = await SupportModel.updateStatus(id, { status, adminNotes });
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Support request not found.' });
      }

      res.json({
        success: true,
        message: `Support ticket ${id} updated to status "${updated.status}".`,
        ticket: updated,
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },
};

export default SupportController;
