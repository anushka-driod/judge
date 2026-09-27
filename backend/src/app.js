import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Domain Routers
import authRoutes from './routes/authRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import legalRoutes from './routes/legalRoutes.js';
import lawyerCaseRoutes from '../modules/lawyer-case/src/routes/index.js';
import lawyerRoutes from './routes/lawyerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// Member 3: AI + RAG + Legal Research Pipeline
import { RagPipeline } from '../modules/ai-rag/src/rag/ragPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../../dist');

const app = express();
const ragPipeline = new RagPipeline();

// 1. Security & Parsing Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 2. Healthcheck Route
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    project: 'EarnLaw (VidhiSetu)',
    status: 'online',
    version: '2.0.0',
    unified_engine: 'Single Localhost Architecture',
    active_subsystems: [
      'Member 1: React 19 Frontend Client',
      'Member 2: Core Auth, Persistence & AnuDB',
      'Member 3: AI Legal Research & Kanoon RAG Pipeline',
      'Member 4: Lawyer Matching Engine & Case Management',
    ],
    timestamp: new Date().toISOString(),
  });
});

// 3. Mount Member 2: Auth Routes
app.use('/api/auth', authRoutes);

// 4. Mount Member 2 & 4: User-Isolated Case Routes
app.use('/api/cases', caseRoutes);

// 5. Mount Indian Kanoon Legal Research & Judgments Service
app.use('/api/legal', legalRoutes);

// 6. Mount Member 3: AI Legal Guidance & RAG Chat
app.post(['/api/legal/analyze', '/api/ai/chat'], async (req, res) => {
  const query = req.body.query || req.body.message || '';
  const jurisdiction = req.body.jurisdiction || '';
  const options = {
    history: req.body.history || [],
    attachedDocs: req.body.attachedDocs || [],
    caseId: req.body.caseId || null,
    language: req.body.language || null,
  };

  if (!query || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Message or query parameter is required.',
      code: 'INVALID_QUERY',
    });
  }

  try {
    const analysis = await ragPipeline.processLegalQuery(query, jurisdiction, options);
    res.json({
      success: true,
      reply: analysis.guidance,
      detectedLaws: analysis.relevant_laws,
      detectedPrecedents: analysis.similar_cases,
      suggestedNextSteps: analysis.suggestedNextSteps || (analysis.missing_information || []).map((m) => `Clarify: ${m}`),
      ...analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[AI Chat] Pipeline error:', err.message);
    res.status(err.status || 500).json({
      success: false,
      error: err.message,
      code: err.code || 'AI_PIPELINE_ERROR',
    });
  }
});

// 6. Mount Dedicated Lawyer Portal & Admin Oversight Routes
app.use('/api/lawyer', lawyerRoutes);
app.use('/api/admin', adminRoutes);

// 7. Mount Consultation Payment Lifecycle & Financial Ledger Routes
app.use('/api', paymentRoutes);

// 8. Mount Member 4: Lawyer Directory, Consultations, Actions, Documents, Timeline, Reminders, Complaints
app.use('/api', lawyerCaseRoutes);

// 7. Serve Static Frontend Production Assets (Single Localhost Unified Serving)
app.use(express.static(distPath));

// 8. Client-side Single-Page-App (SPA) Fallback for React Router navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
