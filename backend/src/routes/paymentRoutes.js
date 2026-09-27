import { Router } from 'express';
import PaymentController from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// 1. Payment Initiation (Server calculates fee & creates gateway order)
router.post('/consultations/payments/initiate', PaymentController.initiatePayment);

// 2. Cryptographic Server-Side Payment Verification (HMAC SHA-256)
router.post('/consultations/payments/verify', PaymentController.verifyPayment);
router.post('/consultations/payments/sandbox-signature', PaymentController.generateSandboxSignature);

// 3. Payment Failure / Drop Logger
router.post('/consultations/payments/failure', PaymentController.handlePaymentFailure);

// 4. Citizen Consultation Cancellation & Refund Evaluation
router.post('/consultations/:id/cancel', PaymentController.cancelConsultation);

// 5. Tax Invoice / Receipt Generation
router.get('/consultations/:id/invoice', PaymentController.getInvoice);

// 6. Citizen Payment History
router.get('/citizen/payments', PaymentController.getCitizenPayments);

// 7. Admin Payment Ledger & Refunds
router.get('/admin/payments', PaymentController.getAdminPayments);
router.post('/admin/payments/:id/refund', PaymentController.processAdminRefund);

export default router;
