import dotenv from 'dotenv';
if (!(process.env.NODE_ENV === 'test' && process.env.VIDHISETU_TEST_MODE === 'isolated')) {
  dotenv.config();
}
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
import conversationRoutes from './routes/conversationRoutes.js';
import UploadController from './controllers/uploadController.js';
import SupportController from './controllers/supportController.js';
import { authenticateToken, requireCitizenOrApproved } from './middleware/authMiddleware.js';
import ConversationModel from './models/conversationModel.js';

// Member 3: AI + RAG + Legal Research Pipeline
import { RagPipeline } from '../modules/ai-rag/src/rag/ragPipeline.js';
import { AgentOrchestrator } from '../modules/ai-rag/src/agent/agentOrchestrator.js';
import { networkManager } from './services/networkManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../../dist');

const app = express();
const ragPipeline = new RagPipeline();
const agentOrchestrator = new AgentOrchestrator();



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

const isAllowedTunnelOrCloud = (origin) => {
  if (!origin) return true;
  return /^(https?:\/\/)?([a-zA-Z0-9-]+\.)*(trycloudflare\.com|loca\.lt|ngrok-free\.app|ngrok\.io|vercel\.app|onrender\.com|railway\.app)(:\d+)?$/i.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV !== 'production' ||
      process.env.ALLOW_ALL_CORS === 'true' ||
      isAllowedTunnelOrCloud(origin)
    ) {
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
// 2. Healthcheck Route
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    project: 'EarnLaw (VidhiSetu)',
    status: 'online',
    version: '2.0.0',
    unified_engine: 'Single Localhost Architecture',
    offline_ready: true,
    active_subsystems: [
      'Member 1: React 19 Frontend Client',
      'Member 2: Core Auth, Persistence & AnuDB',
      'Member 3: AI Legal Research & Kanoon RAG Pipeline (Offline Capable)',
      'Member 4: Lawyer Matching Engine & Case Management',
    ],
    timestamp: new Date().toISOString(),
  });
});


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


// 3. Mount Member 2: Auth Routes
app.use('/api/auth', authRoutes);

// 4. Mount Member 2 & 4: User-Isolated Case Routes
app.use('/api/cases', caseRoutes);

// 4b. Mount Permanent Chat Conversations & Messages Routes
app.use('/api/conversations', requireCitizenOrApproved, conversationRoutes);

// 5. Mount Indian Kanoon Legal Research & Judgments Service
app.use('/api/legal', legalRoutes);

// 6. Mount Member 3: Agentic AI Legal Guidance & Workflow Orchestrator
app.post(['/api/legal/analyze', '/api/ai/chat'], authenticateToken, requireCitizenOrApproved, async (req, res) => {
  const query = req.body.query || req.body.message || '';
  const jurisdiction = req.body.jurisdiction || '';
  const conversationId = req.body.conversationId || req.body.caseId || null;
  const userId = req.user?.id || null;

  if (!query || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Message or query parameter is required.',
      code: 'INVALID_QUERY',
    });
  }

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication is required.' });
  }
  if (conversationId && !(await ConversationModel.getById(conversationId, userId))) {
    return res.status(404).json({ success: false, error: 'Conversation not found or access denied.' });
  }

  try {
    const result = await agentOrchestrator.execute({
      query,
      jurisdiction,
      conversationId,
      userId,
      history: req.body.history || [],
      attachedDocs: req.body.attachedDocs || [],
      language: req.body.language || null,
    });
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Agent Orchestrator] Execution error:', err.message);
    try {
      const analysis = await ragPipeline.processLegalQuery(query, jurisdiction, {
        history: req.body.history || [],
        attachedDocs: req.body.attachedDocs || [],
        caseId: conversationId,
        language: req.body.language || null,
      });
      res.json({
        success: true,
        reply: analysis.guidance,
        detectedLaws: analysis.relevant_laws || analysis.relevantLaws || [],
        detectedPrecedents: analysis.similar_cases || analysis.relevantJudgments || [],
        suggestedNextSteps: analysis.suggestedNextSteps || (analysis.missing_information || []).map((m) => `Clarify: ${m}`),
        ...analysis,
        timestamp: new Date().toISOString(),
      });
    } catch (fallbackErr) {
      res.status(500).json({
        success: false,
        error: err.message,
        code: 'AGENT_PIPELINE_ERROR',
      });
    }
  }
});


// 6b. SSE Streaming Agentic Legal Guidance & Chat Endpoint
app.post('/api/ai/chat/stream', authenticateToken, requireCitizenOrApproved, async (req, res) => {
  const query = req.body.query || req.body.message || '';
  const jurisdiction = req.body.jurisdiction || '';
  const conversationId = req.body.conversationId || req.body.caseId || null;
  const userId = req.user?.id || null;

  if (!query || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Message or query parameter is required.',
      code: 'INVALID_QUERY',
    });
  }

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication is required.' });
  }
  if (conversationId && !(await ConversationModel.getById(conversationId, userId))) {
    return res.status(404).json({ success: false, error: 'Conversation not found or access denied.' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  try {
    let clientDisconnected = false;
    res.on('close', () => {
      clientDisconnected = true;
    });

    const agentResult = await agentOrchestrator.execute({
      query,
      jurisdiction,
      conversationId,
      userId,
      history: req.body.history || [],
      attachedDocs: req.body.attachedDocs || [],
      language: req.body.language || null,
      onProgress: (progressEvent) => {
        if (!clientDisconnected && !res.writableEnded && !res.destroyed) {
          res.write(`data: ${JSON.stringify(progressEvent)}\n\n`);
          if (typeof res.flush === 'function') res.flush();
        }
      },
    });

    // Send full meta payload with agent steps, plan, laws, precedents, notice
    const metaPayload = {
      type: 'meta',
      language: agentResult.language,
      languageCode: agentResult.languageCode,
      executionPlan: agentResult.executionPlan,
      agentSteps: agentResult.agentSteps,
      detectedLaws: agentResult.detectedLaws,
      detectedPrecedents: agentResult.detectedPrecedents,
      suggestedNextSteps: agentResult.suggestedNextSteps,
      legalNoticeDraft: agentResult.legalNoticeDraft,
      executionTimeMs: agentResult.executionTimeMs,
      modelUsed: 'VidhiSetu Multi-Step Agentic Engine',
    };

    if (!clientDisconnected && !res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify(metaPayload)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    }

    // Stream text in words/tokens
    const replyText = agentResult.reply || 'Legal analysis completed.';
    const tokens = replyText.split(/(\s+)/);
    for (let i = 0; i < tokens.length; i += 2) {
      if (clientDisconnected || res.writableEnded || res.destroyed) break;
      const burst = (tokens[i] || '') + (tokens[i + 1] || '');
      if (!burst) continue;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: burst })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
      await new Promise((r) => setTimeout(r, 2));
    }

    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: 'done', fullReply: replyText, meta: metaPayload })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
      res.end();
    }
  } catch (err) {
    console.error('[Agent Stream] Error:', err.message);
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


// 6. Mount Dedicated Lawyer Portal & Admin Oversight Routes
app.use('/api/lawyer', lawyerRoutes);
app.use('/api/admin', adminRoutes);

// Verification documents are private and only available to their applicant or an admin.
app.get('/api/uploads/verification-docs/:filename', authenticateToken, UploadController.getVerificationDocument);

// Support Requests & Inquiries
app.post('/api/support', SupportController.createTicket);
app.get('/api/support/my-tickets', authenticateToken, SupportController.listMyTickets);

// 7. Mount Consultation Payment Lifecycle & Financial Ledger Routes
app.use('/api', paymentRoutes);

// 8. Mount Member 4: Lawyer Directory, Consultations, Actions, Documents, Timeline, Reminders, Complaints
app.use('/api', lawyerCaseRoutes);


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
});

export default app;
