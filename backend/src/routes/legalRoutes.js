import { Router } from 'express';
import LegalController from '../controllers/legalController.js';

const router = Router();

// Indian Kanoon Legal Research & Judgment Retrieval
router.get('/search', LegalController.searchJudgments);
router.get('/document/:id', LegalController.getDocument);
router.get('/document/:id/metadata', LegalController.getDocumentMetadata);
router.get('/document/:id/fragments', LegalController.getDocumentFragments);
router.get('/document/:id/courtcopy', LegalController.getCourtCopy);

export default router;
