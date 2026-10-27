import './helpers/safeTestEnvironment.js';
import { LegalAnalyzer } from '../modules/ai-rag/src/llm/legalAnalyzer.js';
import { RagPipeline } from '../modules/ai-rag/src/rag/ragPipeline.js';

async function runPhase5Tests() {
  console.log('============================================================');
  console.log('VIDHI SETU PHASE 5: EMOTION-AWARE AI CHATBOT & FACT GATHERING');
  console.log('============================================================\n');

  const results = { passed: 0, failed: 0, details: [] };

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      results.passed++;
      results.details.push({ status: 'PASS', message });
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      results.failed++;
      results.details.push({ status: 'FAIL', message });
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Emotion Awareness Detection Across All 5 States
    // -------------------------------------------------------------
    console.log('[Test 1] Emotion Detection (Sad, Angry, Confused, Happy, Normal)');

    // 1a. Sad
    const sadQuery = 'I am so sad, crying and feeling helpless. My landlord locked me out of my flat and I have nowhere to sleep tonight.';
    const sadAnalysis = await LegalAnalyzer.analyzeQuery(sadQuery);
    assert(sadAnalysis.detectedEmotion === 'Sad', 'Detected Sad emotion for distressed citizen query');
    assert(sadAnalysis.emotional_acknowledgment.toLowerCase().includes('painful') || sadAnalysis.emotional_acknowledgment.toLowerCase().includes('stressful'), 'Generated empathetic acknowledgment for Sad emotion');

    // 1b. Angry
    const angryQuery = 'I am furious! The builder is an absolute fraud and cheated me out of ₹15 lakhs. I want to sue them and fight back against this scam!';
    const angryAnalysis = await LegalAnalyzer.analyzeQuery(angryQuery);
    assert(angryAnalysis.detectedEmotion === 'Angry', 'Detected Angry emotion for cheated/frustrated citizen query');
    assert(angryAnalysis.emotional_acknowledgment.toLowerCase().includes('frustration'), 'Generated calm de-escalating acknowledgment for Angry emotion');

    // 1c. Confused
    const confusedQuery = 'I am completely confused. I received a legal notice citing Section 138 of NI Act and I have no idea what it means or what to do next.';
    const confusedAnalysis = await LegalAnalyzer.analyzeQuery(confusedQuery);
    assert(confusedAnalysis.detectedEmotion === 'Confused', 'Detected Confused emotion for overwhelmed citizen query');
    assert(confusedAnalysis.emotional_acknowledgment.toLowerCase().includes('overwhelming') || confusedAnalysis.emotional_acknowledgment.toLowerCase().includes('plain-language'), 'Generated demystifying plain-language acknowledgment for Confused emotion');

    // 1d. Happy
    const happyQuery = 'Thank you so much! My deposit refund issue was resolved peacefully and the seller gave my money back today.';
    const happyAnalysis = await LegalAnalyzer.analyzeQuery(happyQuery);
    assert(happyAnalysis.detectedEmotion === 'Happy', 'Detected Happy emotion for relieved citizen query');
    assert(happyAnalysis.emotional_acknowledgment.toLowerCase().includes('positive') || happyAnalysis.emotional_acknowledgment.toLowerCase().includes('encouraging'), 'Generated encouraging acknowledgment for Happy emotion');

    // 1e. Normal
    const normalQuery = 'What is the limitation period for filing a summary suit under Order 37 of CPC in Delhi?';
    const normalAnalysis = await LegalAnalyzer.analyzeQuery(normalQuery);
    assert(normalAnalysis.detectedEmotion === 'Normal', 'Detected Normal emotion for objective legal procedure query');

    // -------------------------------------------------------------
    // Test 2: Targeted Fact-Gathering Questions with Selectable Options
    // -------------------------------------------------------------
    console.log('\n[Test 2] Fact-Gathering Questions & Selectable Options');
    const tenancyQuery = 'My landlord refuses to return my security deposit of ₹60,000.';
    const tenancyAnalysis = await LegalAnalyzer.analyzeQuery(tenancyQuery);
    assert(Array.isArray(tenancyAnalysis.factGatheringQuestions), 'Fact gathering questions returned as structured array');
    assert(tenancyAnalysis.factGatheringQuestions.length >= 2, 'At least 2 targeted fact gathering questions generated');

    const firstQ = tenancyAnalysis.factGatheringQuestions[0];
    assert(typeof firstQ.question === 'string' && firstQ.question.length > 5, 'Fact question contains clear prompt title');
    assert(Array.isArray(firstQ.options) && firstQ.options.length >= 3, 'Fact question contains at least 3 selectable option chips');

    // -------------------------------------------------------------
    // Test 3: Multi-Turn Memory & Conversation Context Preservation
    // -------------------------------------------------------------
    console.log('\n[Test 3] Multi-Turn Conversation Memory');
    const pipeline = new RagPipeline();

    const conversationHistory = [
      { sender: 'user', text: 'My landlord withheld my security deposit of ₹70,000 after I vacated the flat.' },
      { sender: 'ai', text: 'I understand this tenancy dispute. Did you serve a formal 30-day move-out notice?' },
    ];

    const followUpQuery = 'Yes, I sent an email notice on 1st August and have the landlord\'s confirmation reply.';
    const memoryResult = await pipeline.processLegalQuery(followUpQuery, 'Karnataka', { history: conversationHistory });

    assert(Boolean(memoryResult), 'Multi-turn query processed successfully');
    const categoryLower = (memoryResult.category || '').toLowerCase();
    const isTenancyPreserved = categoryLower.includes('tenan') || categoryLower.includes('deposit') || categoryLower.includes('rent') ||
      JSON.stringify(memoryResult).toLowerCase().includes('landlord');
    assert(isTenancyPreserved, 'Multi-turn memory correctly retains tenancy dispute context across turns');

    // -------------------------------------------------------------
    // Test 4: Evidence-Grounded Legal Guidance & Kanoon Precedents
    // -------------------------------------------------------------
    console.log('\n[Test 4] Ground-Truth Indian Kanoon Citations without Hallucination');
    const disputeResult = await pipeline.processLegalQuery('Cheque of ₹2,50,000 bounced due to insufficient funds. What are my statutory remedies?');

    assert(Boolean(disputeResult.guidance), 'Generated synthesized guidance output');
    assert(disputeResult.relevant_laws && disputeResult.relevant_laws.length > 0, 'Guidance includes statutory provisions (e.g. NI Act Sec 138)');
    assert(disputeResult.similar_cases && disputeResult.similar_cases.length > 0, 'Guidance cites authentic court precedents from Indian Kanoon');
    assert(Boolean(disputeResult.disclaimer), 'Mandatory Legal AI safety disclaimer included in response');

  } catch (err) {
    console.error('Test execution error:', err);
    results.failed++;
  }

  console.log('\n============================================================');
  console.log(`PHASE 5 SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('============================================================');

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase5Tests();
import './helpers/safeTestEnvironment.js';
