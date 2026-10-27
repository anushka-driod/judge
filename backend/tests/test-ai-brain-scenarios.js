import assert from 'node:assert/strict';
import dotenv from 'dotenv';
dotenv.config();

import { AgentOrchestrator } from '../modules/ai-rag/src/agent/agentOrchestrator.js';
import IndianKanoonService from '../src/services/indianKanoonService.js';
import ConversationModel from '../src/models/conversationModel.js';
import { AgentTools } from '../modules/ai-rag/src/agent/agentTools.js';

console.log('================================================================');
console.log('   VIDHISETU AI BRAIN - 10 COMPREHENSIVE ARCHITECTURAL SCENARIOS');
console.log('================================================================');

const orchestrator = new AgentOrchestrator();
const tools = AgentTools;

let passedTests = 0;
let totalTests = 0;

function report(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${name}${details ? ` (${details})` : ''}`);
  } else {
    console.error(`  ✗ [FAIL] ${name} ${details}`);
    throw new Error(`Test failed: ${name}`);
  }
}

async function runTests() {
  // -------------------------------------------------------------
  // Scenario 1: Greetings vs. Legal Questions
  // -------------------------------------------------------------
  console.log('\n--- Scenario 1: Greetings vs. Legal Questions ---');
  {
    const greetingRes = await orchestrator.execute({ query: 'Hi, good morning!' });
    report('Greeting intent classified as CASUAL_CONVERSATION', greetingRes.intent === 'CASUAL_CONVERSATION');
    report('Greeting does not inject statutory templates', !greetingRes.reply.includes('### ⚖️ Legal Analysis'));
    report('Greeting does not fetch court precedents', (greetingRes.detectedPrecedents || []).length === 0);
    report('Greeting reply is friendly and human', greetingRes.reply.length < 500 && /help|assist|VidhiSetu|morning/i.test(greetingRes.reply));

    const legalRes = await orchestrator.execute({ query: 'My landlord refuses to return my security deposit of 50000 rupees' });
    report('Legal question classified as SPECIFIC_LEGAL_QUERY', legalRes.intent === 'SPECIFIC_LEGAL_QUERY');
    report('Legal question retrieves applicable statutes', (legalRes.detectedLaws || []).length > 0);
    report('Legal question provides substantive advice', legalRes.reply.length > 200 && /deposit|rent|notice|legal/i.test(legalRes.reply));
  }

  // -------------------------------------------------------------
  // Scenario 2: Emotional messages vs. Specific legal disputes
  // -------------------------------------------------------------
  console.log('\n--- Scenario 2: Emotional Messages vs. Specific Legal Disputes ---');
  {
    const emotionalRes = await orchestrator.execute({ query: 'I have some family issues and I am feeling very overwhelmed' });
    report('Emotional message classified as EMOTIONAL_OR_VAGUE', emotionalRes.intent === 'EMOTIONAL_OR_VAGUE');
    report('Emotional message responds empathetically', /hear|sorry|understand|overwhelmed|support|clarif/i.test(emotionalRes.reply));
    report('Emotional message does not force rigid lawsuit sections', !emotionalRes.reply.includes('Section 138') && !emotionalRes.reply.includes('Indian Penal Code'));
    report('Emotional message skips statutory retrieval tools honestly', emotionalRes.agentSteps.some(s => s.status === 'skipped'));

    const disputeRes = await orchestrator.execute({ query: 'Tenant has not paid rent for 6 months and refuses to vacate premises' });
    report('Dispute message classified as legal dispute', disputeRes.intent === 'SPECIFIC_LEGAL_QUERY');
    report('Dispute response outlines eviction/notice procedure', /eviction|notice|rent|possession|tenan/i.test(disputeRes.reply));
  }

  // -------------------------------------------------------------
  // Scenario 3: Different unrelated questions (no fixed-answer boilerplate)
  // -------------------------------------------------------------
  console.log('\n--- Scenario 3: Distinct Unrelated Questions ---');
  {
    const chequeRes = await orchestrator.execute({ query: 'Cheque bounced due to insufficient funds' });
    const consumerRes = await orchestrator.execute({ query: 'Defective laptop delivered by online seller, they refuse return or refund' });

    report('Cheque query cites Section 138 Negotiable Instruments Act', chequeRes.reply.includes('138') || chequeRes.reply.includes('Negotiable Instruments'));
    report('Consumer query cites Consumer Protection Act', consumerRes.reply.includes('Consumer Protection') || consumerRes.reply.includes('deficiency') || consumerRes.reply.includes('refund'));
    report('Both queries produce completely distinct outputs', chequeRes.reply !== consumerRes.reply);
  }

  // -------------------------------------------------------------
  // Scenario 4: Follow-ups that depend on prior context
  // -------------------------------------------------------------
  console.log('\n--- Scenario 4: Follow-up Questions Dependent on Prior Context ---');
  {
    const history = [
      { sender: 'user', text: 'Someone gave me a cheque of Rs 2 lakhs that bounced due to insufficient funds.' },
      { sender: 'assistant', text: 'You should issue a formal demand notice under Section 138 of the Negotiable Instruments Act within 30 days giving them 15 days to pay.' },
    ];
    const followUpRes = await orchestrator.execute({
      query: 'What if he does not pay within those 15 days?',
      history,
    });

    report('Follow-up intent detected', followUpRes.intent === 'FOLLOW_UP');
    report('Follow-up contextualized without repeating basic greeting', /complaint|court|magistrate|30 days|section 138/i.test(followUpRes.reply));
    report('Follow-up loaded authorized context in agent steps', followUpRes.agentSteps.some(s => s.step === 'FETCH_HISTORY' && s.summary.includes('2')));
  }

  // -------------------------------------------------------------
  // Scenario 5: Topic change within the same conversation
  // -------------------------------------------------------------
  console.log('\n--- Scenario 5: Topic Change in Same Conversation ---');
  {
    const history = [
      { sender: 'user', text: 'My landlord kept my deposit and will not return it.' },
      { sender: 'assistant', text: 'Send a legal notice for recovery of tenancy security deposit.' },
    ];
    const topicChangeRes = await orchestrator.execute({
      query: 'Switching subjects: how can I register a copyright for my software code in India?',
      history,
    });

    report('Topic change recognized', topicChangeRes.intent === 'TOPIC_CHANGE' || topicChangeRes.intent === 'SPECIFIC_LEGAL_QUERY');
    report('No contamination from prior tenancy deposit facts', !topicChangeRes.reply.toLowerCase().includes('landlord') && !topicChangeRes.reply.toLowerCase().includes('security deposit'));
    report('Topic change answers copyright questions', /copyright|software|source code|intellectual property|registrar/i.test(topicChangeRes.reply));
  }

  // -------------------------------------------------------------
  // Scenario 6: Different Indian Kanoon queries and retrieved judgments
  // -------------------------------------------------------------
  console.log('\n--- Scenario 6: Real Indian Kanoon Retrieval ---');
  {
    const searchRes1 = await tools.search_kanoon_precedents({ query: 'Negotiable Instruments Section 138 notice' });
    report('Kanoon search 1 returns results', searchRes1.retrievedCount > 0);
    report('Kanoon search 1 has verified citations', searchRes1.precedents[0]?.citation?.length > 0);

    const searchRes2 = await tools.search_kanoon_precedents({ query: 'Motor vehicle accident compensation third party' });
    report('Kanoon search 2 returns results', searchRes2.retrievedCount > 0);
    report('Kanoon search 2 titles differ from search 1', searchRes1.precedents[0]?.title !== searchRes2.precedents[0]?.title);
  }

  // -------------------------------------------------------------
  // Scenario 7: At least three distinct judgments generating correctly matched analyses/PDFs
  // -------------------------------------------------------------
  console.log('\n--- Scenario 7: 3 Distinct Judgments & Printable PDF Dossiers ---');
  {
    const id1 = '10257321'; // Lucknow Development Authority
    const id2 = '156320145'; // Suresh Kumar
    const id3 = '196813295'; // Newtech Promoters

    const analysis1 = await IndianKanoonService.analyzeJudgment(id1);
    const analysis2 = await IndianKanoonService.analyzeJudgment(id2);
    const analysis3 = await IndianKanoonService.analyzeJudgment(id3);

    report('Analysis 1 title matches Lucknow Development Authority', analysis1.title.includes('Lucknow Development'));
    report('Analysis 2 title matches Suresh Kumar', analysis2.title.includes('Suresh Kumar'));
    report('Analysis 3 title matches Newtech Promoters', analysis3.title.includes('Newtech Promoters'));

    const pdfHtml1 = IndianKanoonService.generateJudgmentPdfHtml(analysis1);
    const pdfHtml2 = IndianKanoonService.generateJudgmentPdfHtml(analysis2);
    const pdfHtml3 = IndianKanoonService.generateJudgmentPdfHtml(analysis3);

    report('PDF 1 contains Lucknow Development title', pdfHtml1.includes('Lucknow Development'));
    report('PDF 2 contains Suresh Kumar title', pdfHtml2.includes('Suresh Kumar'));
    report('PDF 3 contains Newtech Promoters title', pdfHtml3.includes('Newtech Promoters'));
    report('PDFs are strictly distinct case-specific documents', pdfHtml1 !== pdfHtml2 && pdfHtml2 !== pdfHtml3);
  }

  // -------------------------------------------------------------
  // Scenario 8: Empty search results, API failures, and honest handling
  // -------------------------------------------------------------
  console.log('\n--- Scenario 8: Empty Search Results & Failure Handling ---');
  {
    const emptySearchRes = await tools.search_kanoon_precedents({ query: 'nonexistent_case_token_xyz999888777666' });
    report('Empty search returns 0 precedents', emptySearchRes.retrievedCount === 0);
    report('Empty search has truthful status', emptySearchRes.retrievalStatus === 'no_precedents_found');

    const emptyStatuteRes = await tools.search_laws_and_statutes({ query: 'asdkjhqwertyuiopzzxxccvv' });
    report('Empty statute returns 0 statutes', emptyStatuteRes.foundCount === 0);
    report('Empty statute does not inject fake tax laws', emptyStatuteRes.retrievalStatus === 'no_statutes_found');
  }

  // -------------------------------------------------------------
  // Scenario 9: Telugu and English inputs
  // -------------------------------------------------------------
  console.log('\n--- Scenario 9: Telugu and English Multi-Lingual Support ---');
  {
    const teluguRes = await orchestrator.execute({
      query: 'నా చెక్కు బౌన్స్ అయింది, లీగల్ నోటీసు ఎలా పంపాలి?',
    });
    report('Telugu query detected as Telugu language', teluguRes.language === 'Telugu' || teluguRes.languageCode === 'te');
    report('Telugu execution plan generated in Telugu', teluguRes.executionPlan.some(p => p.description.includes('Telugu') || /విశ్లేషణ|చట్ట/i.test(p.name)));
    report('Telugu reply provides Telugu legal guidance', /నోటీసు|చట్టం|చెక్కు|కాలపరిమితి/i.test(teluguRes.reply));
  }

  // -------------------------------------------------------------
  // Scenario 10: User/account isolation and cache correctness
  // -------------------------------------------------------------
  console.log('\n--- Scenario 10: User Isolation & Cache Keying ---');
  {
    const user1Id = 'user_alice_test_101';
    const user2Id = 'user_bob_test_202';

    const conv1 = await ConversationModel.createConversation({
      userId: user1Id,
      title: 'Alice Private Consultation',
      category: 'Tenancy',
    });

    await ConversationModel.addMessage({
      conversationId: conv1.id,
      userId: user1Id,
      sender: 'user',
      text: 'Confidential Alice tenancy issue',
    });

    const user1Access = await ConversationModel.getById(conv1.id, user1Id);
    report('User 1 can access own conversation', user1Access !== null && user1Access.id === conv1.id);

    const user2Access = await ConversationModel.getById(conv1.id, user2Id);
    report('User 2 CANNOT access User 1 conversation (isolation verified)', user2Access === null);

    const user2Messages = await ConversationModel.getMessages(conv1.id, user2Id);
    report('User 2 gets 0 messages from User 1 conversation', user2Messages.length === 0);

    // Cache verification
    const analysisEn = await IndianKanoonService.analyzeJudgment('10257321', { language: 'en' });
    const analysisTe = await IndianKanoonService.analyzeJudgment('10257321', { language: 'te' });
    report('English cache differs from Telugu cache for same doc', analysisEn.language !== analysisTe.language);
    report('Telugu cache contains Telugu summary', analysisTe.teluguSummary !== null);
  }

  console.log('\n================================================================');
  console.log(`   ALL SCENARIO TESTS COMPLETE: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('\nTest suite failed with error:', err);
  process.exit(1);
});
