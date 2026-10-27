import { Router } from 'express';
import { LawyerPortalController } from '../controllers/lawyerPortalController.js';
import PaymentController from '../controllers/paymentController.js';
import SupportController from '../controllers/supportController.js';
import { authenticateToken, requireRoles } from '../middleware/authMiddleware.js';

import { LawyerPortalService } from '../services/lawyerPortalService.js';

const router = Router();

// Protected Admin Endpoints (Require valid token and role ADMIN)
router.use(authenticateToken);
router.use(requireRoles('admin'));

// Lawyer Application Review & Lifecycle
router.get('/lawyers', LawyerPortalController.adminGetLawyers);
router.get('/lawyers/:id', LawyerPortalController.adminGetLawyerById);
router.post('/lawyers/:id/review', LawyerPortalController.adminReviewLawyer);
router.post('/lawyers/:id/approve', LawyerPortalController.adminApproveLawyer);
router.post('/lawyers/:id/reject', LawyerPortalController.adminRejectLawyer);
router.post('/lawyers/:id/request-info', LawyerPortalController.adminRequestInfo);
router.post('/lawyers/:id/suspend', LawyerPortalController.adminSuspendLawyer);
router.post('/lawyers/:id/retry-notification', LawyerPortalController.adminRetryNotification);
router.post('/lawyers/:id/retry-status-notification', LawyerPortalController.adminRetryStatusNotification);

// Advocate Aliases (Supports frontend AdminVerificationPage)
router.get('/advocates', LawyerPortalController.adminGetLawyers);
router.get('/advocates/:id', LawyerPortalController.adminGetLawyerById);
router.post('/advocates/:id/retry-notification', LawyerPortalController.adminRetryNotification);
router.post('/advocates/:id/retry-status-notification', LawyerPortalController.adminRetryStatusNotification);
router.post('/advocates/:id/status', async (req, res) => {
  try {
    const rawStatus = (req.body.status || '').toUpperCase();
    const statusMap = {
      VERIFIED: 'VERIFIED',
      APPROVED: 'VERIFIED',
      REJECTED: 'REJECTED',
      SUSPENDED: 'SUSPENDED',
      UNDER_REVIEW: 'UNDER_REVIEW',
      REQUIRES_INFORMATION: 'PENDING',
      REQUEST_INFO: 'PENDING',
      PENDING: 'PENDING',
    };
    const targetStatus = statusMap[rawStatus] || rawStatus;
    const remarks = req.body.remarks || `Status updated to ${targetStatus}`;
    const updated = await LawyerPortalService.adminUpdateLawyerStatus(
      req.params.id,
      targetStatus,
      remarks,
      req.user.email
    );
    res.json({ success: true, message: `Advocate status updated to ${targetStatus}.`, lawyer: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Consultation Payment Escrow & Refund Administration
router.get('/payments', PaymentController.getAdminPayments);
router.post('/payments/:id/refund', PaymentController.processAdminRefund);

// Support Requests Administration
router.get('/support', SupportController.adminListTickets);
router.get('/support/:id', SupportController.adminGetTicket);
router.patch('/support/:id', SupportController.adminUpdateTicket);

// Audit Logs
router.get('/audit-logs', LawyerPortalController.adminGetAuditLogs);

export default router;
