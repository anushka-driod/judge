import { allowTestServer } from './helpers/safeTestEnvironment.js';
allowTestServer('http://localhost:5000');
/**
 * Phase 7 Automated Test Suite: Real Agentic AI Workflow, Tool Invocations & Language Adaptation
 * 
 * Verifies:
 * 1. Explicitly permitted agent tools (Statute search, Kanoon search, Notice draft, Limitation calculation, Action item)
 * 2. Multi-step execution planning (IDENTIFY_GOAL -> FETCH_HISTORY -> QUERY_STATUTES -> SEARCH_PRECEDENTS -> DRAFT_NOTICE -> SYNTHESIZE)
 * 3. Automatic multilingual language adaptation (English, Telugu script \u0C00-\u0C7F, Hindi Devanagari \u0900-\u097F)
 * 4. Grounded statutory accuracy without hallucination
 * 5. Full HTTP REST (/api/ai/chat) and SSE Streaming (/api/ai/chat/stream) integration
 */

import assert from 'node:assert';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import AgentTools from '../modules/ai-rag/src/agent/agentTools.js';
import { AgentOrchestrator } from '../modules/ai-rag/src/agent/agentOrchestrator.js';

const API_BASE = 'http://localhost:5000';
const SERVER_JWT_SECRET = 'f1d04cd2f0adad6edc11b66083e4fe2f537d2a696ae3f770bcd256a4df9ba5f56bb11a8aa8d174c8bda886debce6b6c312a565cee180292dc45c8dc95c5e366d';
const TEST_TOKEN = jwt.sign(
  { id: 'usr_39401de8a6a71a91', email: 'signin.test.1793018045596@gmail.com', role: 'user' },
  SERVER_JWT_SECRET,
  { expiresIn: '1h' }
);

function postJson(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(endpoint, API_BASE);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': `Bearer ${TEST_TOKEN}`,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = { raw };
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function postStream(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(endpoint, API_BASE);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': `Bearer ${TEST_TOKEN}`,
        },
      },
      (res) => {
        let raw = '';
        const events = [];
        res.on('data', (c) => {
          const chunkStr = c.toString('utf-8');
          raw += chunkStr;
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              try {
                events.push(JSON.parse(trimmed.slice(5).trim()));
              } catch (_) {}
            }
          }
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, events, raw });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runPhase7Tests() {
  console.log('====================================================');
  console.log('VIDHISETU PHASE 7: REAL AGENTIC AI & MULTI-STEP WORKFLOW TESTS');
  console.log('====================================================\n');

  const orchestrator = new AgentOrchestrator();

  // Test 1: Permitted Tool - search_laws_and_statutes
  console.log('1. Testing tool search_laws_and_statutes...');
  const statutesRes = await AgentTools.search_laws_and_statutes({ query: 'cheque bounce dishonour 138 notice', category: 'Banking' });
  assert(statutesRes.statutes.length > 0, 'Should find at least one statute for cheque bounce');
  assert(statutesRes.statutes.some((s) => s.act.includes('Negotiable Instruments') || s.section.includes('138')), 'Should identify Section 138 NI Act');
  console.log(`   ✓ Found ${statutesRes.statutes.length} relevant statute(s): "${statutesRes.statutes[0].title}"`);

  // Test 2: Permitted Tool - search_kanoon_precedents
  console.log('2. Testing tool search_kanoon_precedents...');
  const precedentsRes = await AgentTools.search_kanoon_precedents({ query: 'cheque dishonour notice', maxResults: 2 });
  assert(precedentsRes.precedents.length > 0, 'Should retrieve Kanoon court precedents');
  assert(precedentsRes.precedents[0].title && precedentsRes.precedents[0].court, 'Precedent should include title and court');
  console.log(`   ✓ Retrieved precedent: "${precedentsRes.precedents[0].title}" (${precedentsRes.precedents[0].court})`);

  // Test 3: Permitted Tool - draft_legal_notice
  console.log('3. Testing tool draft_legal_notice...');
  const noticeRes = await AgentTools.draft_legal_notice({
    recipientName: 'M/s XYZ Logistics Ltd',
    amount: '1,50,000',
    grievance: 'Unjustified withholding of security deposit and breach of commercial lease',
    demandDays: 15,
    statuteRef: 'Transfer of Property Act, 1882 & Section 73 Indian Contract Act',
  });
  assert(noticeRes.noticeDrafted === true, 'Notice drafting tool should succeed');
  assert(noticeRes.noticeText.includes('₹1,50,000'), 'Draft notice should include specific demand amount');
  assert(noticeRes.noticeText.includes('15 (fifteen) days'), 'Draft notice should state 15-day statutory cure period');
  assert(noticeRes.noticeText.includes('M/s XYZ Logistics Ltd'), 'Draft notice should address recipient');
  console.log('   ✓ Successfully drafted statutory pre-litigation legal demand notice');

  // Test 4: Permitted Tool - calculate_limitation_deadline
  console.log('4. Testing tool calculate_limitation_deadline under Limitation Act 1963...');
  const deadlineCheque = await AgentTools.calculate_limitation_deadline({
    eventDate: '2026-03-01',
    causeOfAction: 'Cheque bounce memo received',
  });
  assert(deadlineCheque.calculatedDeadline, 'Should calculate concrete deadline date');
  assert(deadlineCheque.statutoryRule.includes('Section 138'), 'Should cite Section 138 NI Act limitation rule');

  const deadlineConsumer = await AgentTools.calculate_limitation_deadline({
    eventDate: '2026-01-15',
    causeOfAction: 'Defective laptop purchase consumer dispute',
  });
  assert.strictEqual(deadlineConsumer.limitationYears, 2, 'Consumer forum limitation is 2 years under CPA 2019');
  console.log(`   ✓ Limitation calculated: Cheque rule="${deadlineCheque.statutoryRule.slice(0, 50)}..."`);
  console.log(`   ✓ Consumer limitation verified: ${deadlineConsumer.limitationYears} years (Section 69 CPA 2019)`);

  // Test 5: Automatic Language Adaptation - Telugu
  console.log('5. Testing Automatic Language Adaptation for Telugu Query...');
  const teluguQuery = 'నా అద్దె డిపాజిట్ 70,000 వాపస్ ఇవ్వడం లేదు, లీగల్ నోటీసు పంపాలి';
  const teluguLang = orchestrator.detectLanguage(teluguQuery);
  assert.strictEqual(teluguLang.language, 'Telugu', 'Should accurately detect Telugu language');
  assert.strictEqual(teluguLang.code, 'te', 'Language code should be te');

  const teluguResult = await orchestrator.execute({ query: teluguQuery, jurisdiction: 'Telangana' });
  assert(teluguResult.success === true, 'Telugu execution should succeed');
  assert(teluguResult.executionPlan.length >= 4, 'Execution plan should have multi-step workflow');
  assert(teluguResult.agentSteps.length >= 4, 'Should execute multiple agent tools');
  // Check Telugu script characters \u0C00-\u0C7F
  const hasTeluguScript = /[\u0C00-\u0C7F]/.test(teluguResult.reply);
  assert(hasTeluguScript, 'Response must be synthesized in authentic Telugu script (తెలుగు లిపి)');
  assert(teluguResult.legalNoticeDraft, 'Legal notice must be drafted');
  console.log(`   ✓ Telugu detected and synthesized (${teluguResult.agentSteps.length} tools executed)`);
  console.log(`   ✓ Sample Telugu excerpt: "${teluguResult.reply.slice(0, 60)}..."`);

  // Test 6: Automatic Language Adaptation - Hindi
  console.log('6. Testing Automatic Language Adaptation for Hindi Query...');
  const hindiQuery = 'मेरा चेक बाउंस हो गया है, 138 के तहत कानूनी प्रक्रिया क्या है और नोटिस कैसे भेजें';
  const hindiLang = orchestrator.detectLanguage(hindiQuery);
  assert.strictEqual(hindiLang.language, 'Hindi', 'Should accurately detect Hindi language');
  assert.strictEqual(hindiLang.code, 'hi', 'Language code should be hi');

  const hindiResult = await orchestrator.execute({ query: hindiQuery, jurisdiction: 'Delhi' });
  assert(hindiResult.success === true, 'Hindi execution should succeed');
  // Check Devanagari script characters \u0900-\u097F
  const hasDevanagariScript = /[\u0900-\u097F]/.test(hindiResult.reply);
  assert(hasDevanagariScript, 'Response must be synthesized in authentic Hindi Devanagari script (हिंदी)');
  console.log(`   ✓ Hindi detected and synthesized (${hindiResult.agentSteps.length} tools executed)`);
  console.log(`   ✓ Sample Hindi excerpt: "${hindiResult.reply.slice(0, 60)}..."`);

  // Test 7: HTTP REST Endpoint /api/ai/chat (Agent Orchestrated)
  console.log('7. Testing Live HTTP Endpoint POST /api/ai/chat...');
  const restRes = await postJson('/api/ai/chat', {
    query: 'Landlord refused to return my rental security deposit of 85000 after lease expiry',
    jurisdiction: 'Karnataka',
  });
  assert.strictEqual(restRes.status, 200, `Expected HTTP 200 from /api/ai/chat, got ${restRes.status}`);
  assert(restRes.data.success === true, 'Response should indicate success');
  assert(Array.isArray(restRes.data.executionPlan), 'Response must include executionPlan array');
  assert(restRes.data.executionPlan.length >= 4, 'Execution plan must contain multiple planned steps');
  assert(Array.isArray(restRes.data.agentSteps), 'Response must include agentSteps array');
  assert(restRes.data.agentSteps.length >= 3, 'Agent must have executed at least 3 tools');
  assert(Array.isArray(restRes.data.detectedLaws) && restRes.data.detectedLaws.length > 0, 'Must include detected Indian laws');
  assert(Array.isArray(restRes.data.detectedPrecedents), 'Must include detected court precedents');
  assert(restRes.data.reply && restRes.data.reply.length > 50, 'Must include grounded legal guidance reply');
  console.log(`   ✓ /api/ai/chat verified: Plan=${restRes.data.executionPlan.length} steps, Tools=${restRes.data.agentSteps.length} executed, ExecutionTime=${restRes.data.executionTimeMs}ms`);

  // Test 8: HTTP SSE Streaming Endpoint /api/ai/chat/stream
  console.log('8. Testing Live SSE Streaming Endpoint POST /api/ai/chat/stream...');
  const streamRes = await postStream('/api/ai/chat/stream', {
    query: 'Builder failed to deliver possession of flat after 12 months delay',
    jurisdiction: 'Maharashtra',
  });
  assert.strictEqual(streamRes.status, 200, `Expected HTTP 200 for SSE stream, got ${streamRes.status}`);
  assert(streamRes.events.length > 0, 'Stream must produce parsed SSE events');
  const metaEvent = streamRes.events.find((e) => e.type === 'meta');
  assert(metaEvent, 'Stream must dispatch type: "meta" event with agent execution details');
  assert(Array.isArray(metaEvent.executionPlan), 'meta event must include executionPlan');
  assert(Array.isArray(metaEvent.agentSteps), 'meta event must include agentSteps');
  const doneEvent = streamRes.events.find((e) => e.type === 'done');
  assert(doneEvent, 'Stream must finish with type: "done" event');
  assert(doneEvent.fullReply, 'done event must provide full accumulated reply text');
  console.log(`   ✓ /api/ai/chat/stream verified: Received ${streamRes.events.length} SSE events with plan, steps, and full token stream.`);

  console.log('\n====================================================');
  console.log('>>> ALL PHASE 7 AGENTIC AI TESTS PASSED 100%! <<<');
  console.log('====================================================');
}

runPhase7Tests().catch((err) => {
  console.error('\n❌ PHASE 7 TEST FAILED:', err);
  process.exit(1);
});
import './helpers/safeTestEnvironment.js';
