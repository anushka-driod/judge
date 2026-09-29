import { Router } from 'express';
import { LawyerCaseController } from '../controllers/lawyerCaseController.js';

const router = Router();

// 1. Legal Knowledge Base & Case Relationships
router.get('/legal/laws', LawyerCaseController.getLaws);
router.get('/legal/laws/:id', LawyerCaseController.getLawById);
router.get('/legal/precedents', LawyerCaseController.getPrecedents);
router.get('/legal/cases/:id/relationships', LawyerCaseController.getCaseRelationships);
router.post('/legal/cases/relationships', LawyerCaseController.addCaseRelationship);

// 2. Lawyer Directory & Recommendations
router.get('/lawyers', LawyerCaseController.getLawyers);
router.get('/lawyers/recommendations', LawyerCaseController.getRecommendations);
router.get('/lawyers/:id', LawyerCaseController.getLawyerById);

// 3. Consultations
router.post('/consultations', LawyerCaseController.bookConsultation);

// 4. Case Action Plans & Self-Help Roadmaps
router.get('/cases/:id/actions', LawyerCaseController.getActionPlan);
router.patch('/cases/:id/actions/:actionId', LawyerCaseController.updateActionStatus);

// 5. Case Documents Vault & Verification
router.post('/cases/:id/documents', LawyerCaseController.registerDocument);
router.get('/cases/:id/documents', LawyerCaseController.getDocuments);
router.patch('/cases/:id/documents/:docId/verify', LawyerCaseController.verifyDocument);

// 6. Case Tracking, Timeline & Resolution
router.get('/cases/:id/timeline', LawyerCaseController.getTimeline);
router.patch('/cases/:id/status', LawyerCaseController.updateCaseStatus);
router.post('/cases/:id/resolve', LawyerCaseController.resolveCase);

// 7. Reminders & Deadlines
router.post('/reminders', LawyerCaseController.createReminder);
router.get('/reminders', LawyerCaseController.getReminders);
router.patch('/reminders/:id/dismiss', LawyerCaseController.dismissReminder);

// 8. Second Opinions
router.post('/second-opinions', LawyerCaseController.requestSecondOpinion);

// 9. Complaints & Grievances
router.post('/complaints', LawyerCaseController.fileComplaint);

// 10. Admin Management Panel
router.post('/admin/lawyers/:id/verify', LawyerCaseController.adminVerifyLawyer);
router.post('/admin/lawyers/:id/reject', LawyerCaseController.adminRejectLawyer);
router.get('/admin/complaints', LawyerCaseController.adminGetComplaints);
router.patch('/admin/complaints/:id', LawyerCaseController.adminUpdateComplaint);

export default router;
