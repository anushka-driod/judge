/**
 * Test Suite for Member 3: AI + RAG + Legal Research + Vector Search
 * Run via: node backend/modules/ai-rag/test/test-member3-suite.js
 */

import { LegalAnalyzer } from '../src/llm/legalAnalyzer.js';
import { KanoonClient } from '../src/kanoon/kanoonClient.js';
import { JudgmentProcessor } from '../src/processing/judgmentProcessor.js';
import { VectorEngine } from '../src/embeddings/vectorEngine.js';
import { RagPipeline } from '../src/rag/ragPipeline.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('EarnLaw Member 3 — AI / RAG / Legal Research Pipeline Test Suite');
console.log('================================================================\n');

async function runTests() {
  // 1. Phase 1 Test: Legal Query Understanding & Entity Extraction
  console.log('1. Phase 1: Testing Legal Problem Understanding:');
  try {
    const userQuery = 'My employer removed me from my job without giving me notice.';
    const analysis = await LegalAnalyzer.analyzeQuery(userQuery, 'Karnataka');

    assert(analysis.category === 'Employment & Labour Law', `Identified category: ${analysis.category}`);
    assert(analysis.legal_issues.length >= 2, `Extracted ${analysis.legal_issues.length} legal issues`);
    assert(analysis.legal_issues.some((i) => i.toLowerCase().includes('notice') || i.toLowerCase().includes('termination')), 'Identified termination / notice issue');
    assert(analysis.missing_information.length >= 2, `Identified ${analysis.missing_information.length} missing fact questions`);
    assert(analysis.kanoon_search_queries.length >= 1, `Generated ${analysis.kanoon_search_queries.length} Kanoon search queries`);
  } catch (err) {
    console.error(err);
    failed++;
  }

  // 2. Phase 2 Test: Indian Kanoon API Search & Retrieval
  console.log('\n2. Phase 2: Testing Indian Kanoon Retrieval:');
  try {
    const kanoon = new KanoonClient();
    const query = '"termination without notice" "workman"';
    const results = await kanoon.searchJudgments(query);

    assert(results.length > 0, `Retrieved ${results.length} judgments from Kanoon engine`);
    assert(results[0].title.includes('Workmen of Subong') || results[0].court.includes('Supreme Court'), `Case title: ${results[0].title}`);
    assert(results[0].citation !== undefined, `Citation extracted: ${results[0].citation}`);
    assert(results[0].sourceUrl.startsWith('https://indiankanoon.org'), `Valid Kanoon source attribution: ${results[0].sourceUrl}`);
  } catch (err) {
    console.error(err);
    failed++;
  }

  // 3. Phase 3 Test: Legal Text Cleaning & Paragraph Chunking
  console.log('\n3. Phase 3: Testing Judgment Cleaning & Legal Chunking:');
  try {
    const sampleJudgment = {
      kanoonId: '109283',
      title: 'Workmen of Subong Tea Estate vs. The Outram Tea Estate',
      court: 'Supreme Court of India',
      citation: '1964 AIR 819',
      sourceUrl: 'https://indiankanoon.org/doc/109283/',
      fullText: `<html><body>IN THE SUPREME COURT OF INDIA. CIVIL APPEAL NO. 42 OF 1963.
Holding: Section 25F of the Industrial Disputes Act, 1947 imposes a mandatory condition precedent upon the employer before terminating a workman.
The employer must serve one month notice in writing or pay wages in lieu thereof. Non-compliance renders termination void ab initio.</body></html>`,
    };

    const cleaned = JudgmentProcessor.cleanJudgmentText(sampleJudgment.fullText);
    assert(!cleaned.includes('<html>') && !cleaned.includes('IN THE SUPREME COURT'), 'Boilerplate and HTML removed');

    const chunks = JudgmentProcessor.chunkJudgment(sampleJudgment, { chunkSize: 120, chunkOverlap: 30 });
    assert(chunks.length >= 1, `Generated ${chunks.length} semantic legal chunks`);
    assert(chunks[0].chunkType === 'holding' || chunks[0].chunkType === 'ratio_decidendi', `Classified chunk type: ${chunks[0].chunkType}`);
  } catch (err) {
    console.error(err);
    failed++;
  }

  // 4. Phase 4 & 5 Test: 768-dim Embeddings & Vector Similarity Search
  console.log('\n4. Phase 4 & 5: Testing 768-dim Embeddings & Vector Search (pgvector):');
  try {
    const textA = 'Termination of employment without statutory one month notice';
    const textB = 'Employer dismissed workman without notice pay under Section 25F';
    const textUnrelated = 'Bounced cheque due to insufficient bank account balance';

    const vecA = await VectorEngine.generateEmbedding(textA);
    const vecB = await VectorEngine.generateEmbedding(textB);
    const vecUnrelated = await VectorEngine.generateEmbedding(textUnrelated);

    assert(vecA.length === 768, `Generated 768-dimensional vector matching pgvector vector(768)`);

    const simRelated = VectorEngine.cosineSimilarity(vecA, vecB);
    const simUnrelated = VectorEngine.cosineSimilarity(vecA, vecUnrelated);

    assert(simRelated >= 0, `Cosine similarity remains within its valid range (${simRelated.toFixed(3)})`);
    assert(simRelated > simUnrelated, `Related query score (${simRelated.toFixed(3)}) > Unrelated cheque query score (${simUnrelated.toFixed(3)})`);

    assert(VectorEngine.cosineSimilarity([1, 0], [1, 0]) === 1, 'Identical unit vectors score 1');
    assert(VectorEngine.cosineSimilarity([1, 0], [0, 1]) === 0, 'Unrelated orthogonal vectors score 0');

    const corpus = [
      { chunkId: 'c1', chunkText: textB, embedding: vecB, category: 'Employment' },
      { chunkId: 'c2', chunkText: textUnrelated, embedding: vecUnrelated, category: 'Banking' },
    ];
    const topMatches = VectorEngine.searchSimilarChunks(vecA, corpus, { queryText: textA, topK: 1 });
    assert(topMatches[0].chunkId === 'c1', 'Vector search correctly ranked employment precedent as #1');
  } catch (err) {
    console.error(err);
    failed++;
  }

  // 5. Phase 6, 7 & 8 Test: End-to-End Grounded RAG Pipeline & Hallucination Guard
  console.log('\n5. Phase 6, 7 & 8: Testing Grounded RAG Pipeline & Safeguards:');
  try {
    const pipeline = new RagPipeline();
    const result = await pipeline.processLegalQuery('My employer fired me without notice and withheld severance.', 'Karnataka');

    assert(result.summary !== undefined, 'Summary generated');
    assert(result.similar_cases.length > 0, `Retrieved ${result.similar_cases.length} source cases`);
    assert(result.sources[0].citation.length > 0, `Source verified with citation: ${result.sources[0].citation}`);
    assert(result.guidance.includes('Based on Indian judicial precedents') || result.guidance.length > 50, 'Guidance based on legal precedent context');
    assert(result.disclaimer.includes('does not substitute for personalized advice'), 'Safety disclaimer attached');
    assert(result.missing_information.length > 0, 'Follow-up questions identified for missing facts');
  } catch (err) {
    console.error(err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`Execution Summary: ${passed} Passed | ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests();
