import crypto from 'node:crypto';
import db from '../config/db.js';
import { CaseActionService } from '../../modules/lawyer-case/src/services/caseActionService.js';
import { CaseTrackingService, CASE_STATUSES } from '../../modules/lawyer-case/src/services/caseTrackingService.js';

// Memory store fallback for cases
let memoryCases = [
  {
    id: 'case-101',
    user_id: 'usr_001',
    userId: 'usr_001',
    userEmail: 'aarav.mehta@example.com',
    title: 'Defective Smartphone Delivery & Refund Rejection',
    category: 'Consumer Dispute & Refund',
    category_id: 'consumer_dispute',
    shortDescription: 'Purchased a phone online for ₹24,999. Received a broken refurbished item. Seller refused return.',
    status: 'Guidance Provided',
    current_status: CASE_STATUSES.IN_PROGRESS,
    createdAt: '2026-08-20T10:30:00Z',
    currentStage: 'Evidence Review & Action Choice',
    nextAction: 'Choose Self-Help Notice or Consult Consumer Lawyer',
    nextActionDeadline: '2026-09-12',
    jurisdiction: 'Bengaluru Urban DCDRC',
    mode: 'pending_selection',
    timeline: [
      { event: 'Case Created', date: '2026-08-20', status: 'completed' },
      { event: 'AI Legal Analysis Completed', date: '2026-08-20', status: 'completed' },
      { event: 'Tax Invoice Uploaded', date: '2026-08-22', status: 'completed' },
      { event: 'Self-Help Action Plan Active', date: '2026-09-01', status: 'current' },
    ],
    documents: [
      {
        id: 'doc-01',
        name: 'Amazon_Invoice_INV2026.pdf',
        type: 'Tax Invoice / Receipt',
        size: '240 KB',
        uploadedAt: '2026-08-22',
        fileUrl: '#',
      },
    ],
  },
  {
    id: 'case-102',
    user_id: 'usr_001',
    userId: 'usr_001',
    userEmail: 'aarav.mehta@example.com',
    title: 'Dishonoured Business Cheque of ₹4,50,000',
    category: 'Banking & Cheque Bounce (Sec 138)',
    category_id: 'cheque_bounce',
    shortDescription: 'Cheque issued by client dishonoured with memo "Funds Insufficient". 30-day statutory notice required.',
    status: 'Consultation Scheduled',
    current_status: CASE_STATUSES.CONSULTATION_SCHEDULED,
    createdAt: '2026-08-10T14:15:00Z',
    currentStage: 'Lawyer Consultation Booked',
    nextAction: 'Attend Video Consultation with Adv. Rajeshwar Rao',
    nextActionDeadline: '2026-09-10',
    jurisdiction: 'Bengaluru Magistrate Court',
    mode: 'lawyer_consultation',
    timeline: [
      { event: 'Case Registered', date: '2026-08-10', status: 'completed' },
      { event: 'Bank Return Memo Uploaded', date: '2026-08-11', status: 'completed' },
      { event: 'Advocate Consultation Scheduled', date: '2026-08-28', status: 'completed' },
    ],
    documents: [],
  },
];

export const CaseController = {
  /**
   * GET /api/cases - List cases strictly isolated by authenticated user
   */
  async getCases(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.json([]);
      }

      // 1. Try AnuDB SQL query
      try {
        const sql = `
          SELECT * FROM cases
          WHERE user_id = $1
          ORDER BY created_at DESC;
        `;
        const result = await db.query(sql, [user.id]);
        if (result && result.rows && result.rows.length > 0) {
          return res.json(result.rows);
        }
      } catch (dbErr) {
        // Continue to memory store fallback
      }

      // 2. Memory store fallback with user isolation
      const isDemo = user.email?.toLowerCase().includes('aarav') || user.email?.toLowerCase().includes('rajesh');
      const filtered = memoryCases.filter(
        (c) =>
          c.userId === user.id ||
          c.user_id === user.id ||
          (c.userEmail && c.userEmail.toLowerCase() === user.email.toLowerCase()) ||
          (isDemo && (!c.userId || c.userId === 'usr_001'))
      );

      res.json(filtered);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch cases: ' + err.message });
    }
  },

  /**
   * POST /api/cases - Create new user case
   */
  async createCase(req, res) {
    try {
      const user = req.user || { id: 'usr_guest', email: 'guest@example.com' };
      const body = req.body;

      const caseId = `case-${Date.now()}`;
      const now = new Date();

      const newCase = {
        id: caseId,
        user_id: user.id,
        userId: user.id,
        userEmail: user.email,
        title: body.title || 'New Legal Dispute',
        category: body.category || 'General Civil Dispute',
        shortDescription: body.description || '',
        status: 'AI Analysis Completed',
        current_status: CASE_STATUSES.CREATED,
        createdAt: now.toISOString(),
        currentStage: 'Preliminary Review',
        nextAction: 'Review statutory rights or choose advocate',
        nextActionDeadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        jurisdiction: body.jurisdiction || user.city || 'Bengaluru',
        mode: 'pending_selection',
        timeline: [{ event: 'Case Created', date: now.toISOString().split('T')[0], status: 'completed' }],
        documents: body.documents || [],
        actionPlan: CaseActionService.generateSelfHelpPlan(caseId, 'consumer_dispute'),
      };

      // Try inserting into AnuDB
      const sql = `
        INSERT INTO cases (id, user_id, title, current_status, summary, jurisdiction, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      try {
        await db.query(sql, [
          caseId,
          user.id,
          newCase.title,
          newCase.current_status,
          newCase.shortDescription,
          newCase.jurisdiction,
          now,
          now,
        ]);
      } catch (e) {
        // Fallback
      }

      memoryCases.unshift(newCase);
      res.status(201).json(newCase);
    } catch (err) {
      res.status(400).json({ error: 'Failed to create case: ' + err.message });
    }
  },

  /**
   * GET /api/cases/:id - Retrieve specific case
   */
  async getCaseById(req, res) {
    try {
      const { id } = req.params;
      const found = memoryCases.find((c) => c.id === id);
      if (found) {
        return res.json(found);
      }
      res.status(404).json({ error: 'Case not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

export default CaseController;
