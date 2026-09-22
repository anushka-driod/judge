import { Router } from 'express';
import CaseController from '../controllers/caseController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Allow optional or required token for case endpoints
router.get('/', authenticateToken, CaseController.getCases);
router.post('/', authenticateToken, CaseController.createCase);
router.get('/:id', CaseController.getCaseById);

export default router;
