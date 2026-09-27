import { Router } from 'express';
import { LawyerPortalController } from '../controllers/lawyerPortalController.js';
import { authenticateToken, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Public Lawyer Auth
router.post('/register', LawyerPortalController.register);
router.post('/login', LawyerPortalController.login);

// Protected Lawyer Endpoints (Require valid token and role LAWYER)
router.use(authenticateToken);
router.use(requireRoles('lawyer', 'admin'));

router.get('/me', LawyerPortalController.getMe);
router.put('/profile', LawyerPortalController.updateProfile);

// Dashboard
router.get('/dashboard', LawyerPortalController.getDashboard);

// Requests
router.get('/requests', LawyerPortalController.getRequests);
router.get('/requests/:id', LawyerPortalController.getRequestById);
router.post('/requests/:id/accept', LawyerPortalController.acceptRequest);
router.post('/requests/:id/reject', LawyerPortalController.rejectRequest);
router.post('/requests/:id/more-info', LawyerPortalController.requestMoreInfo);

// Cases & Workspaces
router.get('/cases', LawyerPortalController.getCases);
router.get('/cases/:caseId', LawyerPortalController.getCaseById);
router.get('/cases/:caseId/documents', LawyerPortalController.getCaseDocuments);
router.get('/cases/:caseId/research', LawyerPortalController.getCaseAiResearch);

// Messages / Chat
router.get('/cases/:caseId/messages', LawyerPortalController.getMessages);
router.post('/cases/:caseId/messages', LawyerPortalController.sendMessage);

// Timeline
router.get('/cases/:caseId/timeline', LawyerPortalController.getTimeline);
router.post('/cases/:caseId/timeline', LawyerPortalController.addTimelineEvent);

// Action Plan
router.get('/cases/:caseId/action-plan', LawyerPortalController.getActionPlan);
router.post('/cases/:caseId/action-plan', LawyerPortalController.addActionItem);
router.patch('/cases/:caseId/action-plan/:actionId', LawyerPortalController.updateActionItem);

// Notes (Separates Lawyer-Private from Client-Visible)
router.get('/cases/:caseId/notes', LawyerPortalController.getCaseNotes);
router.post('/cases/:caseId/notes', LawyerPortalController.addCaseNote);

// Availability & Consultations
router.get('/availability', LawyerPortalController.getAvailability);
router.put('/availability', LawyerPortalController.updateAvailability);
router.get('/consultations', LawyerPortalController.getConsultations);

// Earnings & Payments
router.get('/earnings', LawyerPortalController.getEarnings);
router.get('/payments', LawyerPortalController.getEarnings);

// Calls
router.post('/calls/initiate', LawyerPortalController.initiateCall);
router.post('/calls/:callId/end', LawyerPortalController.endCall);

export default router;
