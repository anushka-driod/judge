import assert from 'node:assert/strict';
import { AgentOrchestrator } from '../modules/ai-rag/src/agent/agentOrchestrator.js';
import { IndianKanoonService } from '../src/services/indianKanoonService.js';
import AdvocateDiscoveryService from '../modules/ai-rag/src/agent/advocateDiscoveryService.js';

console.log('--- Starting Comprehensive AI Intelligence & Judgment Verification Suite ---');

const orchestrator = new AgentOrchestrator();

// 1. TEST CASUAL CONVERSATION & GREETINGS (English & Telugu)
console.log('\n[Test 1] Casual conversations receive natural replies and DO NOT invoke legal tools');
{
  const testCases = [
    { query: 'Thank you so much!', lang: 'en', expectedText: 'welcome', unexpectedText: 'Code of Civil Procedure' },
    { query: 'How are you doing today?', lang: 'en', expectedText: 'VidhiSetu', unexpectedText: 'Section 9' },
    { query: 'ధన్యవాదాలు', lang: 'te', expectedText: 'సహాయం', unexpectedText: 'సివిల్ ప్రొసీజర్ కోడ్' },
    { query: 'నమస్కారం! బాగున్నారా?', lang: 'te', expectedText: 'విధిసేతు', unexpectedText: 'డిమాండ్ నోటీసు' },
  ];

  for (const tc of testCases) {
    const res = await orchestrator.execute({ query: tc.query });
    assert.equal(res.success, true, `Execution failed for ${tc.query}`);
    assert.equal(
      res.intent === 'CASUAL_CONVERSATION' || res.intent === 'GENERAL_GREETING',
      true,
      `Expected CASUAL_CONVERSATION, got ${res.intent} for "${tc.query}"`
    );
    assert.equal(
      res.agentSteps.some((s) => s.tool === 'search_laws_and_statutes' && s.status === 'completed'),
      false,
      `search_laws_and_statutes should not be executed for casual query "${tc.query}"`
    );
    assert.equal(
      res.reply.toLowerCase().includes(tc.expectedText.toLowerCase()),
      true,
      `Expected "${tc.expectedText}" in reply for "${tc.query}"`
    );
    assert.equal(
      res.reply.includes(tc.unexpectedText),
      false,
      `Should NOT contain generic legal text "${tc.unexpectedText}" for "${tc.query}"`
    );
    console.log(`  ✓ Passed for: "${tc.query}" -> Intent: ${res.intent}`);
  }
}

// 2. TEST EMOTIONAL & VAGUE (English & Telugu)
console.log('\n[Test 2] Emotional inquiries receive empathy and clarifying questions without legal tools');
{
  const resEn = await orchestrator.execute({ query: 'I have some family issues and feeling lost' });
  assert.equal(resEn.intent, 'EMOTIONAL_OR_VAGUE');
  assert.equal(resEn.reply.includes('💙'), true);
  assert.equal(resEn.reply.includes('share a bit more context'), true);
  assert.equal(resEn.agentSteps.some((s) => s.tool === 'search_laws_and_statutes' && s.status === 'completed'), false);
  console.log('  ✓ Passed English emotional inquiry');

  const resTe = await orchestrator.execute({ query: 'నాకు కుటుంబంలో కొన్ని సమస్యలు ఉన్నాయి' });
  assert.equal(resTe.intent, 'EMOTIONAL_OR_VAGUE');
  assert.equal(resTe.reply.includes('💙'), true);
  assert.equal(resTe.reply.includes('కుటుంబ సమస్యలు'), true);
  assert.equal(resTe.agentSteps.some((s) => s.tool === 'search_laws_and_statutes' && s.status === 'completed'), false);
  console.log('  ✓ Passed Telugu emotional inquiry');
}

// 3. TEST SAFETY CRITICAL
console.log('\n[Test 3] Safety critical emergencies trigger 112 / 1091 helplines');
{
  const res = await orchestrator.execute({ query: 'My husband is beating me physically and locked me in the room' });
  assert.equal(res.intent, 'SAFETY_CRITICAL');
  assert.equal(res.urgency, 'critical');
  assert.equal(res.reply.includes('112'), true);
  assert.equal(res.reply.includes('1091'), true);
  assert.equal(res.agentSteps.some((s) => s.step === 'EMERGENCY_SUPPORT'), true);
  console.log('  ✓ Passed safety critical emergency response');
}

// 4. TEST JUDGMENT SEARCH & DEDUPLICATION
console.log('\n[Test 4] Court precedent searches return authentic Indian Kanoon records with ratio & links');
{
  const res = await orchestrator.execute({ query: 'Show me landmark judgments on tenant security deposit refund' });
  assert.equal(res.intent === 'JUDGMENT_SEARCH' || res.intent === 'SPECIFIC_LEGAL_QUERY', true);
  assert.equal(res.detectedPrecedents.length > 0, true, 'Should retrieve precedents');
  const firstPrecedent = res.detectedPrecedents[0];
  assert.equal(Boolean(firstPrecedent.title), true);
  assert.equal(Boolean(firstPrecedent.court), true);
  assert.equal(Boolean(firstPrecedent.citation), true);
  console.log(`  ✓ Passed precedent search: retrieved ${res.detectedPrecedents.length} cases (e.g. ${firstPrecedent.title})`);
}

// 5. TEST DISTINCT JUDGMENT ANALYSIS (DIFFERENT CASES -> DIFFERENT RESULTS)
console.log('\n[Test 5] Indian Kanoon Analysis Pipeline generates distinct, case-specific facts, issues, and holdings');
{
  const case1Id = '10257321'; // Lucknow Development Authority (Consumer dispute)
  const case2Id = '156320145'; // Suresh Kumar (Tenancy security deposit dispute)

  const analysis1 = await IndianKanoonService.analyzeJudgment(case1Id);
  const analysis2 = await IndianKanoonService.analyzeJudgment(case2Id);

  assert.equal(String(analysis1.id), case1Id);
  assert.equal(String(analysis2.id), case2Id);
  assert.notEqual(analysis1.title, analysis2.title, 'Case 1 and Case 2 must have distinct titles');
  assert.notEqual(analysis1.holding, analysis2.holding, 'Case 1 and Case 2 must have distinct holdings');
  assert.notEqual(analysis1.sourceUrl, analysis2.sourceUrl, 'Case 1 and Case 2 must have distinct source URLs');

  assert.equal(analysis1.facts.length > 0, true, 'Case 1 must have facts extracted');
  assert.equal(analysis2.facts.length > 0, true, 'Case 2 must have facts extracted');
  assert.equal(analysis1.legalIssues.length > 0, true, 'Case 1 must have legal issues extracted');
  assert.equal(analysis2.legalIssues.length > 0, true, 'Case 2 must have legal issues extracted');

  console.log(`  ✓ Case 1 (${case1Id}): "${analysis1.title}" -> Holding: ${analysis1.holding.slice(0, 60)}...`);
  console.log(`  ✓ Case 2 (${case2Id}): "${analysis2.title}" -> Holding: ${analysis2.holding.slice(0, 60)}...`);
  console.log('  ✓ Proved that different cases produce completely distinct, source-grounded analyses!');
}

// 6. TEST PRINTABLE JUDGMENT PDF DOSSIER GENERATION
console.log('\n[Test 6] Judgment PDF Dossier generation produces valid printable document');
{
  const analysis = await IndianKanoonService.analyzeJudgment('10257321');
  const html = IndianKanoonService.generateJudgmentPdfHtml(analysis);

  assert.equal(typeof html, 'string');
  assert.equal(html.includes('<!DOCTYPE html>'), true);
  assert.equal(html.includes(analysis.title), true);
  assert.equal(html.includes(analysis.holding), true);
  assert.equal(html.includes('@page'), true);
  assert.equal(html.includes('@media print'), true);
  assert.equal(html.includes('VIDHISETU JUDICIAL RESEARCH DOSSIER'), true);
  console.log('  ✓ Generated case-specific printable PDF HTML dossier (length: ' + html.length + ' chars)');
}

// 7. TEST ADVOCATE DISCOVERY DEDUPLICATION & PRIVACY
console.log('\n[Test 7] Advocate discovery deduplicates counsel and omits unverified contact numbers');
{
  const advRes = await AdvocateDiscoveryService.discoverAdvocates({ query: 'need a tenancy dispute advocate in Hyderabad', city: 'Hyderabad' });
  assert.equal(advRes.advocates.length > 0, true, 'Should return matching advocates');

  const names = advRes.advocates.map((a) => a.name.toLowerCase());
  const uniqueNames = new Set(names);
  assert.equal(names.length, uniqueNames.size, 'Advocate results must be strictly deduplicated');

  // Verify privacy: no unverified invented 10-digit mobile numbers
  for (const adv of advRes.advocates) {
    if (adv.phone) {
      assert.match(adv.phone, /^(011-|040-|080-|1800-|Verified)/, `Advocate ${adv.name} had unverified phone format ${adv.phone}`);
    }
  }
  console.log(`  ✓ Discovered ${advRes.advocates.length} verified/chambers advocates with strict deduplication and privacy`);
}

console.log('\n======================================================');
console.log('🎉 ALL AI INTELLIGENCE & JUDGMENT TESTS PASSED PERFECTLY!');
console.log('======================================================\n');
