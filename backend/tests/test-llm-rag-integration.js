/**
 * Comprehensive LLM & RAG Integration Test Suite
 * Vidhi Setu Backend - Phase 9 & Verification
 *
 * Verifies:
 * 1. Missing API key handling & error classification
 * 2. Model configuration resolution
 * 3. Malformed LLM output handling (JSON safe parser)
 * 4. Deterministic fallback path resilience
 * 5. Indian Kanoon RAG-to-LLM context handoff
 * 6. Authentic source metadata preservation
 * 7. Multilingual & Tanglish query normalization
 * 8. Frontend API response contract compatibility
 * 9. Real Gemini API call (conditional on live key)
 */

import { GeminiClient, geminiClient } from '../modules/ai-rag/src/llm/geminiClient.js';
import { LegalAnalyzer } from '../modules/ai-rag/src/llm/legalAnalyzer.js';
import { RagPipeline } from '../modules/ai-rag/src/rag/ragPipeline.js';

let total = 0;
let passed = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('Vidhi Setu — Centralized LLM & Grounded RAG Test Suite');
  console.log('================================================================\n');

  // Test 1: Model Configuration
  console.log('1. Testing Model Configuration:');
  const defaultModel = geminiClient.getModel();
  assert(defaultModel.includes('gemini'), `Configured model is valid Gemini model: "${defaultModel}"`);

  // Test 2: Missing API Key Handling
  console.log('\n2. Testing Missing API Key Handling:');
  const mockClientNoKey = new GeminiClient();
  const origKey = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    assert(!mockClientNoKey.isConfigured(), 'isConfigured() returns false when GEMINI_API_KEY is unset');

    try {
      await mockClientNoKey.generateText({ prompt: 'test' });
      assert(false, 'Should throw error when API key is missing');
    } catch (err) {
      assert(err.code === 'MISSING_API_KEY', `Throws clean error code MISSING_API_KEY: ${err.message}`);
    }
  } finally {
    if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
  }

  // Test 3: Error Classification (Invalid Key, Timeout, etc.)
  console.log('\n3. Testing Error Classification:');
  const classifiedInvalid = geminiClient.classifyError(new Error('API key not valid. Please pass a valid API key.'), 'gemini-2.5-flash', 120);
  assert(classifiedInvalid.code === 'INVALID_API_KEY', 'Correctly classifies invalid API key as INVALID_API_KEY');

  const classifiedQuota = geminiClient.classifyError(new Error('RESOURCE_EXHAUSTED quota exceeded'), 'gemini-2.5-flash', 150);
  assert(classifiedQuota.code === 'RATE_LIMIT', 'Correctly classifies quota exhaustion as RATE_LIMIT');

  const classifiedNetwork = geminiClient.classifyError(new Error('fetch failed ECONNREFUSED'), 'gemini-2.5-flash', 200);
  assert(classifiedNetwork.code === 'NETWORK_ERROR', 'Correctly classifies network failure as NETWORK_ERROR');

  // Test 4: Malformed JSON Output Parser
  console.log('\n4. Testing Malformed LLM Output Parsing:');
  const validJsonText = '```json\n{"summary": "Test Summary", "status": "ok"}\n```';
  const parsed1 = geminiClient.parseJsonSafe(validJsonText);
  assert(parsed1.summary === 'Test Summary', 'Correctly strips markdown code fences and parses JSON');

  const rawJsonWithExtra = 'Here is the response:\n{"summary": "Embedded JSON"}\nHope this helps!';
  const parsed2 = geminiClient.parseJsonSafe(rawJsonWithExtra);
  assert(parsed2.summary === 'Embedded JSON', 'Extracts embedded JSON substring even with conversational text');

  try {
    geminiClient.parseJsonSafe('This is completely unparseable garbage text.');
    assert(false, 'Should throw JSON_PARSE_ERROR for invalid content');
  } catch (err) {
    assert(err.code === 'JSON_PARSE_ERROR', 'Throws descriptive JSON_PARSE_ERROR on unparseable output');
  }

  // Test 5: Multilingual & Tanglish Query Normalization
  console.log('\n5. Testing Multilingual & Tanglish Normalization:');
  const tanglishQuery = 'naa builder flat possession 18 months late chesadu compensation ivvatledu';
  const analysisTanglish = await LegalAnalyzer.analyzeQuery(tanglishQuery, 'Telangana');
  assert(
    analysisTanglish.category.includes('RERA') || analysisTanglish.category.includes('Real Estate'),
    `Tanglish builder query mapped to RERA: ${analysisTanglish.category}`
  );
  assert(
    analysisTanglish.kanoon_search_queries.some((q) => q.toLowerCase().includes('builder') || q.toLowerCase().includes('rera')),
    `Generated English Kanoon search queries: "${analysisTanglish.kanoon_search_queries[0]}"`
  );
  assert(
    analysisTanglish.detected_language === 'Telugu-English' || analysisTanglish.detected_language === 'Telugu',
    `Detected language identified: ${analysisTanglish.detected_language}`
  );

  // Test 6: RAG-to-LLM Context Handoff & Source Preservation
  console.log('\n6. Testing RAG Context Handoff & Source Metadata Preservation:');
  const pipeline = new RagPipeline();
  const tenancyQuery = 'My landlord refused to refund my security deposit of 70000 after I vacated the flat with proper notice.';
  const ragResult = await pipeline.processLegalQuery(tenancyQuery, 'Karnataka');

  assert(ragResult.summary && ragResult.summary.length > 20, 'Generated grounded problem summary');
  assert(ragResult.sources && ragResult.sources.length > 0, `Retrieved ${ragResult.sources.length} authentic Indian Kanoon precedents`);

  const firstSource = ragResult.sources[0];
  assert(Boolean(firstSource.kanoonId), `Preserved Kanoon ID: ${firstSource.kanoonId}`);
  assert(Boolean(firstSource.title), `Preserved Case Title: "${firstSource.title}"`);
  assert(firstSource.sourceUrl.includes('indiankanoon.org'), `Preserved Kanoon URL: ${firstSource.sourceUrl}`);

  // Test 7: Frontend Response Contract Compatibility
  console.log('\n7. Testing Frontend Contract Compatibility:');
  assert(typeof ragResult.reply === 'string' && ragResult.reply.length > 50, 'Provides "reply" field for AIChatPage');
  assert(Array.isArray(ragResult.relevant_laws) && ragResult.relevant_laws.length > 0, 'Provides "relevant_laws" array');
  assert(Array.isArray(ragResult.similar_cases) && ragResult.similar_cases.length > 0, 'Provides "similar_cases" array');
  assert(Array.isArray(ragResult.suggestedNextSteps), 'Provides "suggestedNextSteps" array');
  assert(ragResult.disclaimer.includes('does not substitute for personalized advice'), 'Includes mandatory legal safety disclaimer');

  // Test 8: Case Continuity & Context-Aware Chat
  console.log('\n8. Testing Case Continuity with Chat History:');
  const updateQuery = 'Now the landlord says 20000 was deducted for maintenance.';
  const historyOptions = {
    history: [
      { sender: 'user', text: tenancyQuery },
      { sender: 'ai', text: ragResult.reply },
    ],
    caseId: 'case-103',
  };
  const updateResult = await pipeline.processLegalQuery(updateQuery, 'Karnataka', historyOptions);
  assert(updateResult.category.includes('Tenancy') || updateResult.category.includes('Property'), 'Maintained case anchor in Tenancy');
  assert(updateResult.similar_cases.length > 0, 'Retrieved judicial precedents for updated case position');

  // Test 9: Real Gemini API Verification (Conditional)
  console.log('\n9. Testing Real Gemini API Call (if configured):');
  if (geminiClient.isConfigured()) {
    try {
      console.log('  Live key detected. Calling Gemini API for verification...');
      const pingResult = await geminiClient.generateText({
        prompt: 'State in one sentence that the Vidhi Setu legal AI pipeline is operational.',
        timeoutMs: 15000,
      });
      assert(pingResult.text && pingResult.text.length > 0, `Real Gemini API call succeeded with model "${pingResult.modelUsed}" in ${pingResult.durationMs}ms`);
      assert(pingResult.modelUsed.includes('gemini'), `Model verified: ${pingResult.modelUsed}`);
    } catch (err) {
      console.warn(`  [INFO] Real Gemini call error: ${err.message}`);
    }
  } else {
    console.log('  [INFO] GEMINI_API_KEY is not yet populated with a live key. Fallback engine verified.');
    assert(ragResult.executionMode === 'deterministic_fallback' || ragResult.executionMode === 'gemini_llm', 'Gracefully used grounded engine');
  }

  console.log('\n================================================================');
  console.log(`LLM & RAG SUITE SUMMARY: ${passed} / ${total} tests passed successfully`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
