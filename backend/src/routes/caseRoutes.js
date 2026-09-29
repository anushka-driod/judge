import { Router } from 'express';
import CaseController from '../controllers/caseController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

import LawyerPortalController from '../controllers/lawyerPortalController.js';

const router = Router();

// Allow optional or required token for case endpoints
router.get('/', authenticateToken, CaseController.getCases);
router.post('/', authenticateToken, CaseController.createCase);
router.get('/:id', CaseController.getCaseById);

// Client explicit consent for lawyer case & document sharing
router.post('/:caseId/consent', authenticateToken, LawyerPortalController.grantConsent);
router.post('/:caseId/consent/revoke', authenticateToken, LawyerPortalController.revokeConsent);

export default router;
