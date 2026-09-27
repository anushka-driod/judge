import { Router } from 'express';
import { LawyerPortalController } from '../controllers/lawyerPortalController.js';
import PaymentController from '../controllers/paymentController.js';
import { authenticateToken, requireRoles } from '../middleware/authMiddleware.js';

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

// Consultation Payment Escrow & Refund Administration
router.get('/payments', PaymentController.getAdminPayments);
router.post('/payments/:id/refund', PaymentController.processAdminRefund);

// Audit Logs
router.get('/audit-logs', LawyerPortalController.adminGetAuditLogs);

export default router;
