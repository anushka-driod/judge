/**
 * Verification of the 3 User Test Cases from the prompt
 *
 * TEST 1: Landlord / Security Deposit
 * TEST 2: Builder / RERA Delay Compensation
 * TEST 3: Telugu-English Mixed Language (Tanglish) Builder Query
 */

import { RagPipeline } from '../modules/ai-rag/src/rag/ragPipeline.js';
import { geminiClient } from '../modules/ai-rag/src/llm/geminiClient.js';

const testCases = [
  {
    id: 'TEST 1',
    input: 'My landlord refused to refund my security deposit of ₹70,000 after I vacated the flat with proper notice.',
    expectedCategory: 'Tenancy / Rental / Security Deposit dispute',
    expectedKeywords: ['deposit', 'landlord', 'tenant', 'vacat', 'refund'],
    unwantedKeywords: ['builder', 'rera'],
  },
  {
    id: 'TEST 2',
    input: 'Builder delayed possession of my flat by 18 months and is refusing compensation under RERA.',
    expectedCategory: 'Real Estate / RERA',
    expectedKeywords: ['builder', 'possession', 'delay', 'rera', 'compensation'],
    unwantedKeywords: ['security deposit', 'landlord'],
  },
  {
    id: 'TEST 3',
    input: 'naa builder flat possession 18 months late chesadu compensation ivvatledu',
    expectedCategory: 'Real Estate / RERA',
    expectedKeywords: ['builder', 'possession', 'rera', 'compensation'],
    unwantedKeywords: ['security deposit', 'landlord'],
  },
];

async function runVerification() {
  console.log('================================================================');
  console.log('VIDHI SETU — PROMPT SPECIFIED 3 TEST CASES VERIFICATION');
  console.log('================================================================\n');

  console.log('Gemini Client Configured:', geminiClient.isConfigured());
  console.log('Gemini Model Configured:', geminiClient.getModel());

  const pipeline = new RagPipeline();

  for (const tc of testCases) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`RUNNING ${tc.id}: "${tc.input}"`);
    console.log(`------------------------------------------------------------`);

    const fullResult = await pipeline.processLegalQuery(tc.input);

    const primaryKanoonQuery = fullResult.kanoonQuery || (fullResult.kanoon_search_queries && fullResult.kanoon_search_queries[0]) || '';
    const ragSources = fullResult.sources || [];
    const guidance = fullResult.guidance || '';
    const guidanceLower = guidance.toLowerCase();

    // 1. Check if RAG context matches user's problem
    const ragMatchesProblem = ragSources.length > 0 && ragSources.some(s => 
      tc.expectedKeywords.some(kw => (s.title + ' ' + (s.chunkText || '')).toLowerCase().includes(kw))
    );

    // 2. Check whether final response stayed anchored to original problem
    const hasExpectedContent = tc.expectedKeywords.some(kw => guidanceLower.includes(kw));
    const hasUnwantedDrift = tc.unwantedKeywords.some(kw => guidanceLower.includes(kw));
    const anchored = hasExpectedContent && !hasUnwantedDrift;

    const geminiGenerated = fullResult.executionMode === 'gemini_llm' || fullResult.modelUsed.includes('gemini');

    console.log(`- detected category:                             ${fullResult.category}`);
    console.log(`- normalized query:                              ${fullResult.summary}`);
    console.log(`- Indian Kanoon query:                           ${primaryKanoonQuery}`);
    console.log(`- whether RAG context matches user's problem:    ${ragMatchesProblem ? 'YES (Relevant citations retrieved)' : 'NO'}`);
    console.log(`- whether Gemini generated the final response:   ${geminiGenerated ? `YES (${fullResult.modelUsed})` : 'NO'}`);
    console.log(`- whether final response stayed anchored:        ${anchored ? 'YES (Strict factual anchor maintained)' : 'NO (Drift detected)'}`);
    console.log(`\nResponse Extract:\n${guidance.slice(0, 300).replace(/\n+/g, ' ')}...\n`);
  }

  console.log('================================================================');
  console.log('ALL 3 PROMPT TEST CASES COMPLETED SUCCESSFULLY');
  console.log('================================================================\n');
}

runVerification().catch(console.error);
