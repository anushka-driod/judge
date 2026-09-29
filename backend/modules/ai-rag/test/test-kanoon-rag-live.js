/**
 * Live Indian Kanoon + Vidhi Setu AI/RAG Pipeline Verification
 * Tests the complete flow for the two requested test cases:
 * Test Case 1: Landlord refusing security deposit refund after notice
 * Test Case 2: Builder delayed possession refusing RERA compensation
 */

import { RagPipeline } from '../src/rag/ragPipeline.js';
import { LegalAnalyzer } from '../src/llm/legalAnalyzer.js';
import { KanoonClient } from '../src/kanoon/kanoonClient.js';
import { JudgmentProcessor } from '../src/processing/judgmentProcessor.js';
import { VectorEngine } from '../src/embeddings/vectorEngine.js';

let totalAssertions = 0;
let passedAssertions = 0;

function check(condition, message) {
  totalAssertions++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedAssertions++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

async function testCase1() {
  console.log('\n================================================================');
  console.log('TEST CASE 1: Landlord Refused Security Deposit Refund');
  console.log('Query: "My landlord refused to refund my security deposit after I vacated the flat with proper notice."');
  console.log('================================================================');

  const query = 'My landlord refused to refund my security deposit after I vacated the flat with proper notice.';
  const pipeline = new RagPipeline();

  // 1. Legal Problem Extraction
  const analysis = await LegalAnalyzer.analyzeQuery(query, 'Karnataka');
  check(analysis.category.includes('Tenancy') || analysis.category.includes('Property'), `Category correctly identified: ${analysis.category}`);
  check(analysis.legal_issues.some((i) => i.toLowerCase().includes('security deposit') || i.toLowerCase().includes('deposit')), 'Legal issues highlight security deposit');
  check(analysis.kanoon_search_queries.length >= 1, `Generated Kanoon queries: ${JSON.stringify(analysis.kanoon_search_queries)}`);

  // 2. Full RAG Pipeline execution
  const startTime = Date.now();
  const ragResult = await pipeline.processLegalQuery(query, 'Karnataka');
  const duration = Date.now() - startTime;
  console.log(`  Pipeline finished in ${duration}ms`);

  // 3. Kanoon judgments retrieved & metadata preserved
  check(ragResult.sources.length > 0, `Retrieved ${ragResult.sources.length} authentic source cases`);
  const leadSource = ragResult.sources[0];
  check(leadSource.kanoonId && leadSource.kanoonId.length > 0, `Preserved document ID: ${leadSource.kanoonId}`);
  check(leadSource.title && leadSource.title.length > 0, `Preserved title: "${leadSource.title}"`);
  check(leadSource.court && leadSource.court.length > 0, `Preserved court: "${leadSource.court}"`);
  check(leadSource.sourceUrl && leadSource.sourceUrl.startsWith('https://indiankanoon.org/doc/'), `Valid Kanoon URL: ${leadSource.sourceUrl}`);
  check(leadSource.chunkText && leadSource.chunkText.length > 0, `Retrieved relevant chunk extract (${leadSource.chunkText.length} chars)`);

  // 4. Grounded AI Guidance
  check(ragResult.guidance.includes('Key Legal Principles') || ragResult.guidance.length > 100, 'Guidance includes legal principles');
  check(ragResult.guidance.includes(leadSource.caseTitle || leadSource.title) || ragResult.guidance.includes('precedent'), 'Guidance references retrieved legal context');
  check(ragResult.guidance.toLowerCase().includes('applicability depends'), 'Guidance contains factual applicability note');

  // 5. Disclaimer & Non-Proof
  check(ragResult.disclaimer.toLowerCase().includes('does not substitute for personalized advice'), 'Safety disclaimer attached');
  check(ragResult.disclaimer.toLowerCase().includes('applicability of cited precedents depends'), 'Disclaimer clarifies applicability depends on factual similarity');

  // 6. Security: Token not exposed
  const serialized = JSON.stringify(ragResult);
  const token = process.env.INDIANKANOON_API_TOKEN || process.env.INDIAN_KANOON_API_TOKEN || '';
  if (token && token.length > 5) {
    check(!serialized.includes(token), 'Security: Indian Kanoon API token is NOT exposed in result payload');
  }
}

async function testCase2() {
  console.log('\n================================================================');
  console.log('TEST CASE 2: Builder Delayed Possession Refusing RERA Compensation');
  console.log('Query: "Builder delayed possession of my flat and is refusing compensation under RERA."');
  console.log('================================================================');

  const query = 'Builder delayed possession of my flat and is refusing compensation under RERA.';
  const pipeline = new RagPipeline();

  // 1. Legal Problem Extraction
  const analysis = await LegalAnalyzer.analyzeQuery(query, 'Maharashtra');
  check(analysis.category.includes('RERA') || analysis.category.includes('Real Estate'), `Category correctly identified: ${analysis.category}`);
  check(analysis.legal_issues.some((i) => i.toLowerCase().includes('rera') || i.toLowerCase().includes('delay')), 'Legal issues highlight RERA / delayed possession');
  check(analysis.kanoon_search_queries.length >= 1, `Generated Kanoon queries: ${JSON.stringify(analysis.kanoon_search_queries)}`);

  // 2. Full RAG Pipeline execution
  const startTime = Date.now();
  const ragResult = await pipeline.processLegalQuery(query, 'Maharashtra');
  const duration = Date.now() - startTime;
  console.log(`  Pipeline finished in ${duration}ms`);

  // 3. Kanoon judgments retrieved & metadata preserved
  check(ragResult.sources.length > 0, `Retrieved ${ragResult.sources.length} authentic source cases`);
  const leadSource = ragResult.sources[0];
  check(leadSource.kanoonId && leadSource.kanoonId.length > 0, `Preserved document ID: ${leadSource.kanoonId}`);
  check(leadSource.title && leadSource.title.length > 0, `Preserved title: "${leadSource.title}"`);
  check(leadSource.court && leadSource.court.length > 0, `Preserved court: "${leadSource.court}"`);
  check(leadSource.sourceUrl && leadSource.sourceUrl.startsWith('https://indiankanoon.org/doc/'), `Valid Kanoon URL: ${leadSource.sourceUrl}`);
  check(leadSource.chunkText && leadSource.chunkText.length > 0, `Retrieved relevant chunk extract (${leadSource.chunkText.length} chars)`);

  // 4. Grounded AI Guidance
  check(ragResult.guidance.includes('Section 18') || ragResult.guidance.includes('RERA'), 'Guidance highlights RERA rights / Section 18');
  check(ragResult.guidance.includes(leadSource.caseTitle || leadSource.title) || ragResult.guidance.includes('precedent'), 'Guidance references retrieved legal context');
  check(ragResult.guidance.toLowerCase().includes('applicability depends'), 'Guidance contains factual applicability note');

  // 5. Disclaimer & Non-Proof
  check(ragResult.disclaimer.toLowerCase().includes('does not substitute for personalized advice'), 'Safety disclaimer attached');
  check(ragResult.disclaimer.toLowerCase().includes('applicability of cited precedents depends'), 'Disclaimer clarifies applicability depends on factual similarity');

  // 6. Security: Token not exposed
  const serialized = JSON.stringify(ragResult);
  const token = process.env.INDIANKANOON_API_TOKEN || process.env.INDIAN_KANOON_API_TOKEN || '';
  if (token && token.length > 5) {
    check(!serialized.includes(token), 'Security: Indian Kanoon API token is NOT exposed in result payload');
  }
}

async function run() {
  try {
    await testCase1();
    await testCase2();

    console.log('\n================================================================');
    console.log(`LIVE RAG PIPELINE RESULTS: ${passedAssertions} / ${totalAssertions} assertions passed`);
    console.log('================================================================\n');

    if (passedAssertions !== totalAssertions) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution fatal error:', err);
    process.exit(1);
  }
}

run();
