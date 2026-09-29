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
<<<<<<< HEAD
import { networkManager } from './services/networkManager.js';
=======
>>>>>>> origin/main

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../../dist');

const app = express();
const ragPipeline = new RagPipeline();

<<<<<<< HEAD
// 1. Security & Parsing Middlewares - Configured CORS with FRONTEND_URL & credentials
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL,
  process.env.API_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}));
app.options('*', cors());

// Allow large documents, evidence scans, agreements up to 200MB
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
=======
// 1. Security & Parsing Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
>>>>>>> origin/main

// 2. Healthcheck Route
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    project: 'EarnLaw (VidhiSetu)',
    status: 'online',
    version: '2.0.0',
    unified_engine: 'Single Localhost Architecture',
<<<<<<< HEAD
    offline_ready: true,
    active_subsystems: [
      'Member 1: React 19 Frontend Client',
      'Member 2: Core Auth, Persistence & AnuDB',
      'Member 3: AI Legal Research & Kanoon RAG Pipeline (Offline Capable)',
=======
    active_subsystems: [
      'Member 1: React 19 Frontend Client',
      'Member 2: Core Auth, Persistence & AnuDB',
      'Member 3: AI Legal Research & Kanoon RAG Pipeline',
>>>>>>> origin/main
      'Member 4: Lawyer Matching Engine & Case Management',
    ],
    timestamp: new Date().toISOString(),
  });
});

<<<<<<< HEAD
// 2b. System Network & Offline Status
app.get(['/api/system/status', '/api/network/status'], async (req, res) => {
  const isOnline = await networkManager.checkConnectivity();
  res.json({
    project: 'VidhiSetu AI Legal Platform',
    isOnline,
    offlineMode: networkManager.forcedOffline || !isOnline,
    localKnowledgeBase: 'Active',
    curatedPrecedents: 'Loaded & Grounded',
    memoryLayer: 'Active',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/system/toggle-offline', (req, res) => {
  const { offline } = req.body;
  networkManager.setOfflineMode(offline !== undefined ? offline : !networkManager.forcedOffline);
  res.json({
    success: true,
    offlineMode: networkManager.forcedOffline,
    isOnline: networkManager.isOnline(),
  });
});

=======
>>>>>>> origin/main
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
<<<<<<< HEAD
      detectedLaws: analysis.relevant_laws || analysis.relevantLaws || [],
      detectedPrecedents: analysis.similar_cases || analysis.relevantJudgments || [],
=======
      detectedLaws: analysis.relevant_laws,
      detectedPrecedents: analysis.similar_cases,
>>>>>>> origin/main
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

<<<<<<< HEAD
// 6b. SSE Streaming Legal Guidance & Chat Endpoint
app.post('/api/ai/chat/stream', async (req, res) => {
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

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  try {
    const analysis = await ragPipeline.processLegalQuery(query, jurisdiction, options);
    const replyText = analysis.guidance || analysis.reply || 'I have analyzed your situation under Indian legal principles.';

    // Send metadata payload first (detected laws, precedents, rights, next steps, self-help)
    const metaPayload = {
      type: 'meta',
      detectedLaws: analysis.relevant_laws || analysis.relevantLaws || [],
      detectedPrecedents: analysis.similar_cases || analysis.relevantJudgments || [],
      possibleRights: analysis.possible_rights || analysis.possibleRights || [],
      suggestedNextSteps: analysis.suggestedNextSteps || (analysis.missing_information || []).map((m) => `Clarify: ${m}`),
      missingInformation: analysis.missing_information || analysis.missingEvidence || [],
      selfHelp: analysis.selfHelp || null,
      category: analysis.category,
      modelUsed: analysis.modelUsed || (networkManager.isOnline() ? 'Gemini 2.5 Flash' : 'VidhiSetu Indian Legal Engine (Local RAG)'),
      isOffline: Boolean(analysis.isOffline || !networkManager.isOnline()),
    };
    res.write(`data: ${JSON.stringify(metaPayload)}\n\n`);
    if (typeof res.flush === 'function') res.flush();

    // Stream text in words/tokens with socket disconnect detection on response
    let clientDisconnected = false;
    res.on('close', () => {
      clientDisconnected = true;
    });

    const tokens = replyText.split(/(\s+)/);
    // Progressive rapid streaming in small word bursts
    for (let i = 0; i < tokens.length; i += 2) {
      if (clientDisconnected || res.writableEnded || res.destroyed) break;
      const burst = (tokens[i] || '') + (tokens[i + 1] || '');
      if (!burst) continue;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: burst })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
      await new Promise((r) => setTimeout(r, 2));
    }

    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: 'done', fullReply: replyText })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    }
  } catch (err) {
    console.error('[AI Chat Stream] Error:', err.message);
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    }
  } finally {
    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  }
});

=======
>>>>>>> origin/main
// 6. Mount Dedicated Lawyer Portal & Admin Oversight Routes
app.use('/api/lawyer', lawyerRoutes);
app.use('/api/admin', adminRoutes);

// 7. Mount Consultation Payment Lifecycle & Financial Ledger Routes
app.use('/api', paymentRoutes);

// 8. Mount Member 4: Lawyer Directory, Consultations, Actions, Documents, Timeline, Reminders, Complaints
app.use('/api', lawyerCaseRoutes);

<<<<<<< HEAD
// 9. Catch Unmatched /api/* routes cleanly with JSON instead of hanging
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route ${req.method} ${req.path} not found.`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// 10. Serve Static Frontend Production Assets (Single Localhost Unified Serving)
app.use(express.static(distPath));

// 11. Client-side Single-Page-App (SPA) Fallback for React Router navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('<!doctype html><html><head><meta charset="utf-8"/><title>VidhiSetu AI</title></head><body><div id="root"></div><script>window.location.reload();</script></body></html>');
    }
  });
});

// 12. Global Catch-All Server Error Middleware (Prevents website from ever crashing or hanging)
app.use((err, req, res, next) => {
  console.error('[Global Server Error Middleware Caught]:', err.message || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'An unexpected server error occurred.',
    code: err.code || 'INTERNAL_SERVER_ERROR',
  });
=======
// 7. Serve Static Frontend Production Assets (Single Localhost Unified Serving)
app.use(express.static(distPath));

// 8. Client-side Single-Page-App (SPA) Fallback for React Router navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
>>>>>>> origin/main
});

export default app;
