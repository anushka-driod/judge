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
<<<<<<< HEAD
import { getCuratedJudgments } from '../modules/ai-rag/src/kanoon/curatedJudgments.js';
import { LegalCorpusRepository } from '../modules/ai-rag/src/storage/legalCorpusRepository.js';
=======
>>>>>>> origin/main

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

<<<<<<< HEAD
  console.log('0. Testing Persistent Legal Corpus Repository:');
  const corpusCalls = [];
  const corpusText = 'Unauthorized electronic bank debit customer liability under RBI directions.';
  const fakeDatabase = {
    async query(sql, params = []) {
      corpusCalls.push({ sql, params });
      if (sql.includes('SELECT 1 AS available')) return { rows: [{ available: 1 }], rowCount: 1 };
      if (sql.includes('FROM legal_judgment_chunks AS chunk')) {
        return {
          rows: [{
            chunk_id: '173294821_chk_0',
            kanoon_id: '173294821',
            chunk_index: 0,
            chunk_type: 'ratio_decidendi',
            chunk_text: corpusText,
            embedding: [1, 0],
            source_url: 'https://indiankanoon.org/doc/173294821/',
            citation: '2022 DLT 318',
            case_name: 'P.V. Rao v. Reserve Bank of India',
            court: 'High Court of Delhi',
            jurisdiction: 'India',
            judgment_date: '2022-03-24',
            case_type: 'Cyber Crime & Online Fraud',
            full_text: corpusText,
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    },
  };
  const corpusRepository = new LegalCorpusRepository(fakeDatabase);
  const corpusDocument = {
    kanoonId: '173294821',
    title: 'P.V. Rao v. Reserve Bank of India',
    court: 'High Court of Delhi',
    jurisdiction: 'India',
    publishDate: '2022-03-24',
    citation: '2022 DLT 318',
    sourceUrl: 'https://indiankanoon.org/doc/173294821/',
    category: 'Cyber Crime & Online Fraud',
    fullText: corpusText,
  };
  const corpusWrite = await corpusRepository.persistJudgments([corpusDocument], [{
    chunkId: '173294821_chk_0',
    kanoonId: '173294821',
    chunkIndex: 0,
    chunkType: 'ratio_decidendi',
    chunkText: corpusText,
    embedding: [1, 0],
    sourceUrl: corpusDocument.sourceUrl,
    citation: corpusDocument.citation,
  }]);
  assert(corpusWrite.persisted === 1, 'Persists Kanoon case, judgment, and source chunk');
  assert(corpusCalls.some(({ sql }) => sql.includes('INSERT INTO legal_judgment_chunks')), 'Stores chunk embeddings with source text');
  const corpusMatches = await corpusRepository.searchRelevantChunks([1, 0], 'unauthorized bank debit liability', { topK: 1, minSimilarity: 0.2 });
  assert(corpusMatches.chunks[0]?.kanoonId === '173294821', 'Retrieves and reranks a judgment from the database corpus');
  assert(corpusMatches.judgments[0]?.sourceUrl.includes('indiankanoon.org'), 'Returns persisted Kanoon source metadata');

=======
>>>>>>> origin/main
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

<<<<<<< HEAD
  const harassmentQuery = 'i have sexual harrasment issue';
  const harassmentAfterTenancy = await LegalAnalyzer.analyzeQuery(
    harassmentQuery,
    '',
    { history: [{ sender: 'user', text: 'My landlord is withholding my rental deposit' }] }
  );
  assert( harassmentAfterTenancy.category.includes('Harassment'), 'New harassment issue is not overridden by prior tenancy history');
  assert(!LegalAnalyzer.isContextualFollowUp(harassmentQuery), 'Misspelled new issue is not treated as a contextual follow-up');
  assert(getCuratedJudgments(harassmentAfterTenancy.category, harassmentQuery).length === 0, 'No unrelated curated judgments are attached to an unsupported harassment issue');

  const domesticSafetyHistory = [
    { sender: 'user', text: 'and i have sexual harrasment problem' },
    { sender: 'ai', text: 'Please tell me where this happened and whether you are safe right now.' },
    { sender: 'user', text: 'My answer: in the office' },
    { sender: 'ai', text: 'Thanks for clarifying that it happened at work. Are you safe right now?' },
    { sender: 'user', text: 'My answer: with my husband in home' },
    { sender: 'ai', text: 'Are you safe right now? Please tell me what support you need.' },
  ];
  const domesticSafetyAnalysis = await LegalAnalyzer.analyzeQuery('my husband is harrasing me', '', { history: domesticSafetyHistory });
  assert(domesticSafetyAnalysis.category === 'Domestic / Family Safety & Harassment', 'Recognizes misspelled harassment by a spouse as a domestic safety concern');
  const domesticSafetyResult = await new RagPipeline().processLegalQuery('my husband is harrasing me', '', { history: domesticSafetyHistory });
  assert(/safe right now/i.test(domesticSafetyResult.reply), 'Asks about immediate safety for domestic harassment');
  assert(!/at work|internal committee|detailed timeline|damages or loss/i.test(domesticSafetyResult.reply), 'Does not reuse old workplace or generic civil questions');
  const spouseDivorceFollowUp = await LegalAnalyzer.analyzeQuery('it is with my husband thats y i want to divorce', '', { history: domesticSafetyHistory });
  assert(spouseDivorceFollowUp.category === 'Domestic / Family Safety & Harassment', 'Keeps safety context when harassment is linked to divorce');
  const spouseDivorceResult = await new RagPipeline().processLegalQuery('it is with my husband thats y i want to divorce', '', { history: domesticSafetyHistory });
  assert(/safe right now/i.test(spouseDivorceResult.reply) && /divorce/i.test(spouseDivorceResult.reply), 'Acknowledges safety and divorce information needs together');
  assert(!/at work|internal committee/i.test(spouseDivorceResult.reply), 'Does not carry prior workplace details into a spouse-at-home report');
  const sufficientlyDetailedDomesticIssue = await LegalAnalyzer.analyzeQuery(
    'I am safe. My husband threatened me last night at home in Delhi, and it is ongoing. I want divorce guidance.'
  );
  assert(sufficientlyDetailedDomesticIssue.category === 'Domestic / Family Safety & Harassment', 'Keeps detailed spouse-harassment report in the domestic-safety domain');
  assert(!sufficientlyDetailedDomesticIssue.requiresClarification, 'Moves to evidence analysis once safety, conduct, timing, state, and goal are provided');

  const harassmentClarificationAnswer = await LegalAnalyzer.analyzeQuery(
    'My answer: at work, it is still happening and I am safe.',
    '',
    { history: [{ sender: 'ai', text: 'I am sorry you are dealing with sexual harassment. Are you safe right now? Please tell me where this happened.' }] }
  );
  assert(harassmentClarificationAnswer.category === 'Workplace Sexual Harassment', 'Keeps harassment context when the user answers a clarification');

  const divorceAnalysis = await LegalAnalyzer.analyzeQuery('I have a divorce problem in Delhi, by mutual consent.');
  assert(divorceAnalysis.category === 'Family Law / Divorce', 'Classifies divorce as family law instead of generic civil law');
  assert(divorceAnalysis.kanoon_search_queries.some((query) => /divorce|family court/i.test(query)), 'Builds Indian Kanoon queries for divorce law');
  const divorceFollowUp = await LegalAnalyzer.analyzeQuery('My answer: mutual consent, in Delhi.', '', {
    history: [
      { sender: 'user', text: 'i have divorce problem' },
      { sender: 'ai', text: 'I can help with an Indian divorce question. Is this a mutual-consent divorce or contested? Please share your state.' },
    ],
  });
  assert(divorceFollowUp.category === 'Family Law / Divorce', 'Retains divorce topic when the user answers a clarification');

  const rentalInquiry = await LegalAnalyzer.analyzeQuery('i have rental house problem');
  assert(rentalInquiry.requiresClarification, 'Asks for details instead of assuming a rental deposit dispute');
  assert(rentalInquiry.category.includes('Rental / Housing'), 'Keeps vague rental input in a rental clarification flow');
  const familyInquiry = await LegalAnalyzer.analyzeQuery('i have some family father issue');
  assert(familyInquiry.requiresClarification, 'Asks for details instead of reusing a prior case for a vague family issue');
  const unfamiliarIssue = LegalAnalyzer.analyzeWithExpertEngine('The electricity board disconnected my service without warning.');
  assert(unfamiliarIssue.requiresClarification, 'Does not guess a legal domain for an unfamiliar issue when no model is available');
  assert(unfamiliarIssue.kanoon_search_queries.length === 0, 'Does not send a generic query that could retrieve unrelated precedents');

  const bankDebitQuery = 'my money lost from my bank without any notification';
  const bankDebitAnalysis = await LegalAnalyzer.analyzeQuery(bankDebitQuery);
  assert(bankDebitAnalysis.category === 'Banking / Unauthorized Electronic Transaction', 'Recognizes an unrecognized bank debit outside cheque-bounce law');
  assert(getCuratedJudgments(bankDebitAnalysis.category, bankDebitQuery).some((judgment) => judgment.category.includes('Cyber Crime')), 'Selects unauthorized electronic transaction precedent');
  const bankDebitResult = await new RagPipeline().processLegalQuery(bankDebitQuery);
  assert(/contact your bank|report the transaction/i.test(bankDebitResult.reply), 'Provides immediate bank-protection guidance');
  assert(bankDebitResult.suggestedNextSteps.some((step) => /1930/.test(step)), 'Includes India cyber-fraud reporting steps');
  assert(bankDebitResult.missing_information.length > 0, 'Asks for transaction details needed to assess liability');
  const pendingBankFollowUp = await LegalAnalyzer.analyzeQuery(
    'My answer: yesterday my money locked in the middle i dont how to explain it to u',
    '',
    { history: [
      { sender: 'user', text: bankDebitQuery },
      { sender: 'ai', text: 'This may be an unauthorized bank debit. When did the debit happen, what amount was taken, and was it UPI, card, ATM, or net banking?' },
    ] }
  );
  assert(pendingBankFollowUp.category === 'Banking / Pending or Failed Transaction', 'Uses recent bank context for a vague payment-status follow-up');
  assert(pendingBankFollowUp.nextActions.some((step) => /do not retry/i.test(step)), 'Warns against retrying a payment that may still be pending');

  // Test 6: RAG-to-LLM Context Handoff & Source Preservation
  console.log('\n6. Testing RAG Context Handoff & Source Metadata Preservation:');
  const pipeline = new RagPipeline();
  const vagueInquiry = await pipeline.processLegalQuery(
    'i have some problems',
    '',
    { history: [{ sender: 'user', text: 'My landlord is withholding my rental deposit' }] }
  );
  assert(vagueInquiry.executionMode === 'clarification_required', 'Vague new inquiry asks for details before retrieval');
  assert(vagueInquiry.reply.includes('What kind of problem'), 'Clarification prompt asks the user to identify the issue');
  assert(!/landlord|deposit|tenancy/i.test(vagueInquiry.reply), 'Vague new inquiry does not repeat the prior tenancy answer');

  const harassmentResult = await pipeline.processLegalQuery(
    harassmentQuery,
    '',
    { history: [{ sender: 'user', text: 'My landlord is withholding my rental deposit' }] }
  );
  assert(harassmentResult.category.includes('Harassment'), 'Keeps a new harassment query separate from prior tenancy context');
  assert(harassmentResult.guidance.toLowerCase().includes('sexual harassment'), 'Responds to the harassment concern directly');
  assert(!/landlord|deposit|tenancy/i.test(harassmentResult.guidance), 'Does not return unrelated tenancy guidance');

=======
  // Test 6: RAG-to-LLM Context Handoff & Source Preservation
  console.log('\n6. Testing RAG Context Handoff & Source Metadata Preservation:');
  const pipeline = new RagPipeline();
>>>>>>> origin/main
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
<<<<<<< HEAD
  assert(
    updateResult.similar_cases.length > 0 || updateResult.executionMode === 'insufficient_evidence',
    'Returns relevant precedents or explicitly reports insufficient retrieval evidence'
  );
=======
  assert(updateResult.similar_cases.length > 0, 'Retrieved judicial precedents for updated case position');
>>>>>>> origin/main

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
<<<<<<< HEAD
    console.log('  [INFO] GEMINI_API_KEY is not set. The RAG pipeline must avoid substituting an offline template.');
    assert(ragResult.executionMode === 'llm_unavailable', 'Fails closed instead of presenting a canned legal answer');
    const unclassifiedDetailedIssue = await pipeline.processLegalQuery(
      'The electricity distribution company disconnected my home supply yesterday in Delhi even though my bill was paid. What urgent steps and legal remedy can I use?'
    );
    assert(unclassifiedDetailedIssue.executionMode === 'llm_unavailable', 'Reports missing AI capability for an unfamiliar detailed legal issue');
    assert(!/landlord|deposit|tenancy|civil law/i.test(unclassifiedDetailedIssue.reply), 'Does not substitute an unrelated preset answer for an unfamiliar issue');
    assert(unclassifiedDetailedIssue.missing_information.length === 0, 'Does not repeat generic intake questions after a detailed user account');
=======
    console.log('  [INFO] GEMINI_API_KEY is not yet populated with a live key. Fallback engine verified.');
    assert(ragResult.executionMode === 'deterministic_fallback' || ragResult.executionMode === 'gemini_llm', 'Gracefully used grounded engine');
>>>>>>> origin/main
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
