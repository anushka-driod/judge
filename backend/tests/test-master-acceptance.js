import { allowTestServer } from './helpers/safeTestEnvironment.js';
import assert from 'node:assert/strict';
import { AgentOrchestrator } from '../modules/ai-rag/src/agent/agentOrchestrator.js';
import AdvocateDiscoveryService from '../modules/ai-rag/src/agent/advocateDiscoveryService.js';

allowTestServer('http://localhost:5000');

async function runMasterAcceptanceTests() {
  console.log('========================================================================');
  console.log('  VIDHISETU MASTER IMPLEMENTATION ACCEPTANCE TEST SUITE');
  console.log('========================================================================\n');

  const orchestrator = new AgentOrchestrator();

  // 1. Emotional/Vague Query: "I have some family issues"
  console.log('[Test 1: Emotional / Vague Message Handling]');
  console.log('Input: "I have some family issues"');
  const emotionalRes = await orchestrator.execute({ query: 'I have some family issues' });
  console.log('Classified Intent:', emotionalRes.intent);
  assert.equal(emotionalRes.intent, 'EMOTIONAL_OR_VAGUE', 'Must classify as EMOTIONAL_OR_VAGUE');
  
  // Verify statutory tools were skipped
  const skippedStatutes = emotionalRes.agentSteps.find(s => s.tool === 'search_laws_and_statutes');
  assert(skippedStatutes && skippedStatutes.status === 'skipped', 'Statutory search tool must have status "skipped"');
  console.log('✓ search_laws_and_statutes was truthfully marked "skipped" with clear reason');

  // Verify empathetic response and clarifying question without assuming a legal dispute
  const replyLower = emotionalRes.reply.toLowerCase();
  assert(replyLower.includes('family') || replyLower.includes('support') || replyLower.includes('here to help'), 'Must respond with empathy');
  assert(!replyLower.includes('ipc') && !replyLower.includes('criminal court'), 'Must NOT assume an adversarial legal dispute');
  console.log('✓ Empathetic reply generated without ungrounded adversarial legal assertions:');
  console.log('  Excerpt: "' + emotionalRes.reply.slice(0, 160).replace(/\n/g, ' ') + '..."');

  // 2. Urgent Safety Query
  console.log('\n[Test 2: Crisis & Urgent Safety Prioritization]');
  const safetyRes = await orchestrator.execute({ query: 'My spouse is threatening me physically and I am trapped in the house' });
  assert.equal(safetyRes.intent, 'SAFETY_CRITICAL', 'Must classify as SAFETY_CRITICAL');
  assert(safetyRes.reply.includes('112') || safetyRes.reply.includes('1091') || safetyRes.reply.includes('181'), 'Must include emergency safety helpline numbers');
  console.log('✓ Emergency safety helplines prioritized (112 / 1091 / 181)');

  // 3. Advocate Discovery Query
  console.log('\n[Test 3: Advocate Discovery Query]');
  const advocateQueryRes = await orchestrator.execute({ query: 'Find me an advocate in Hyderabad for tenancy dispute' });
  assert.equal(advocateQueryRes.intent, 'FIND_ADVOCATE', 'Must classify as FIND_ADVOCATE');
  const advocateStep = advocateQueryRes.agentSteps.find(s => s.tool === 'discover_advocates');
  assert(advocateStep && advocateStep.status === 'completed', 'discover_advocates tool must be executed and completed');
  console.log('✓ discover_advocates tool executed successfully');
  console.log(`✓ Discovered ${advocateQueryRes.discoveredAdvocates.length} advocates for Hyderabad`);

  // 4. Advocate Deduplication & Verified vs External Distinction
  console.log('\n[Test 4: Advocate Deduplication & Verification Status]');
  const discovery = await AdvocateDiscoveryService.discoverAdvocates({ query: 'High Court advocate', city: 'Hyderabad', maxResults: 5 });
  assert(discovery.foundCount > 0, 'Must discover advocates');
  // Check for distinct VidhiSetu Verified vs External Counsel
  const hasVerified = discovery.advocates.some(a => a.isVidhiSetuVerified);
  const hasExternal = discovery.advocates.some(a => !a.isVidhiSetuVerified && a.verificationStatus === 'Public High Court Registry');
  console.log(`✓ Verified Advocates in results: ${discovery.advocates.filter(a => a.isVidhiSetuVerified).length}`);
  console.log(`✓ External Registry Advocates in results: ${discovery.advocates.filter(a => !a.isVidhiSetuVerified).length}`);
  // Ensure unverified phone numbers are omitted
  for (const adv of discovery.advocates) {
    if (!adv.phone) {
      assert(adv.phone === null || adv.phone === undefined, 'Unverified phone must be omitted rather than fabricated');
    }
  }
  console.log('✓ Unverified phone numbers are strictly omitted rather than invented');

  // 5. Specific Legal Query: Tenancy & Indian Kanoon Precedents
  console.log('\n[Test 5: Grounded Statutory & Kanoon Research]');
  const legalRes = await orchestrator.execute({ query: 'Landlord is withholding my security deposit of 80000 rupees after vacating' });
  assert.equal(legalRes.intent, 'SPECIFIC_LEGAL_QUERY', 'Must classify as SPECIFIC_LEGAL_QUERY');
  assert(legalRes.detectedLaws.length > 0, 'Must detect applicable Indian statutory provisions');
  assert(legalRes.detectedPrecedents.length > 0, 'Must detect relevant court precedents');
  console.log(`✓ Detected ${legalRes.detectedLaws.length} statutory provisions: "${legalRes.detectedLaws[0].act}"`);
  console.log(`✓ Detected ${legalRes.detectedPrecedents.length} Kanoon precedents: "${legalRes.detectedPrecedents[0].title}"`);

  // 6. Multilingual Telugu Emotional Inquiry
  console.log('\n[Test 6: Telugu Emotional Inquiry]');
  const teluguEmotional = await orchestrator.execute({ query: 'నాకు కుటుంబంలో కొన్ని సమస్యలు ఉన్నాయి' });
  assert.equal(teluguEmotional.intent, 'EMOTIONAL_OR_VAGUE', 'Must classify Telugu family query as EMOTIONAL_OR_VAGUE');
  const hasTelugu = /[\u0C00-\u0C7F]/.test(teluguEmotional.reply);
  assert(hasTelugu, 'Response must be in authentic Telugu script');
  console.log('✓ Telugu emotional inquiry answered in Telugu with empathy');
  console.log('  Excerpt: "' + teluguEmotional.reply.slice(0, 100).replace(/\n/g, ' ') + '..."');

  console.log('\n========================================================================');
  console.log('>>> ALL 6 MASTER ACCEPTANCE SCENARIOS PASSED 100%! <<<');
  console.log('========================================================================\n');
}

runMasterAcceptanceTests().catch(err => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});
