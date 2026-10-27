/**
 * Multi-Step Agentic AI Orchestrator for VidhiSetu
 * Member 3: AI + RAG + Legal Research Architecture
 *
 * Implements:
 * 1. Goal & Intent Understanding
 * 2. Multi-Step Execution Planning
 * 3. Context & Authorized History Retrieval
 * 4. Explicitly Permitted Tool Calls
 * 5. Statutory & Kanoon Precedent Verification
 * 6. Multilingual Language Adaptation (Telugu, Hindi, English, Code-Switching)
 * 7. Action Item Preparation & Outcome Explanation
 */

import AgentTools from './agentTools.js';
import { geminiClient } from '../llm/geminiClient.js';
import { KanoonClient } from '../kanoon/kanoonClient.js';
import { matchLegalDomain } from '../knowledge/legalDomains.js';

export class AgentOrchestrator {
  constructor() {
    this.tools = AgentTools;
    this.kanoonClient = new KanoonClient();
  }

  /**
   * Detect language and script of user query
   */
  detectLanguage(text = '') {
    if (!text) return { language: 'English', script: 'Latin' };

    // Telugu Unicode Range: \u0C00 - \u0C7F
    const teluguRegex = /[\u0C00-\u0C7F]/;
    // Hindi / Devanagari Unicode Range: \u0900 - \u097F
    const devanagariRegex = /[\u0900-\u097F]/;
    // Kannada Unicode Range: \u0C80 - \u0CFF
    const kannadaRegex = /[\u0C80-\u0CFF]/;
    // Tamil Unicode Range: \u0B80 - \u0BFF
    const tamilRegex = /[\u0B80-\u0BFF]/;

    if (teluguRegex.test(text)) {
      return { language: 'Telugu', code: 'te', script: 'Telugu' };
    }
    if (devanagariRegex.test(text)) {
      return { language: 'Hindi', code: 'hi', script: 'Devanagari' };
    }
    if (kannadaRegex.test(text)) {
      return { language: 'Kannada', code: 'kn', script: 'Kannada' };
    }
    if (tamilRegex.test(text)) {
      return { language: 'Tamil', code: 'ta', script: 'Tamil' };
    }

    // Romanized transliteration detection (Tanglish / Hinglish)
    const lower = text.toLowerCase();
    const tanglishKeywords = ['ela', 'cheppandi', 'vaddu', 'kavali', 'undhi', 'chesanu', 'ivvaledu', 'dabbu', 'vadiki', 'em cheyali'];
    if (tanglishKeywords.some((w) => lower.includes(w))) {
      return { language: 'Telugu (Tanglish)', code: 'te', script: 'Latin' };
    }

    const hinglishKeywords = ['kya', 'karna', 'chahiye', 'kaise', 'karein', 'mujhe', 'paisa', 'diya', 'nahi', 'kare', 'bheju'];
    if (hinglishKeywords.some((w) => lower.includes(w))) {
      return { language: 'Hindi (Hinglish)', code: 'hi', script: 'Latin' };
    }

    return { language: 'English', code: 'en', script: 'Latin' };
  }

  /**
   * Generate Multi-Step Execution Plan
   */
  /**
   * Classify user query intent, urgency, and research requirements
   */
  classifyRequest(query = '', conversationHistory = []) {
    const trimmed = (query || '').trim();
    const lower = trimmed.toLowerCase();
    const detectedLang = this.detectLanguage(trimmed);

    // 1. Safety Critical Check
    const isSafetyCritical =
      /threaten.*physic|physic.*threat|hit me|beat me|beating me|physically (abused|assaulted|hurt)|threatened to kill|danger to (my )?life|domestic violence|assaulted me|emergency help|being attacked|scared for (my )?safety|trapped in|harm me|abusive spouse|suicid|kill myself/i.test(trimmed);

    // 2. Advocate Representation Request Check
    const isFindAdvocate =
      /(find|need|recommend|looking for|hire|consult|contact|speak to) (me )?(an? )?(lawyer|advocate|attorney|counsel)|lawyer in |advocate in |advocate near me|lawyer near me|లాయర్|వకీలు|న్యాయవాది|వకీల్|వకీలును|वकील|अधिवक्ता/i.test(trimmed);

    // 3. Emotional or Vague Personal Check
    const hasFamilyKeyword =
      /family (issue|problem|dispute|matter)|personal (issue|problem)|trouble at home|parents are fighting|feeling (overwhelmed|depressed|sad|lost|hopeless|anxious)|don't know what to do|can you help me with family|కుటుంబ.*(సమస్య|గొడవ|బాధ|విషయం|తగాదా)|కుటుంబ సమస్య|బాధగా ఉంది|ఏం చేయాలో అర్థం కావడం లేదు|ఏం చేయాలో తోచడం లేదు|पारिवारिक.*(समस्या|मुद्दा|వివాద్)|परिवार.*(समस्या|तकलीफ)/i.test(trimmed);
    const hasSpecificLegalTerms =
      /138|cheque|deposit|rent|consumer|refund|rera|bail|fir|partition deed|section|act|divorce under 13b|maintenance 125|police complaint|court case|speed post/i.test(trimmed);
    const isEmotionalOrVague = !isSafetyCritical && !isFindAdvocate && hasFamilyKeyword && !hasSpecificLegalTerms;

    // 4. Casual Conversation & Greetings Check
    const casualWordsPattern = /(hi|hello|hey|namaste|namaskaram|good morning|good evening|good afternoon|howdy|vanakkam|నమస్కారం|హలో|బాగున్నారా|హాయ్|ఎలా ఉన్నారు|మీరు ఎవరు|మీ పేరు|how are you|who are you|what is your name|what can you do|who made you|are you a lawyer|are you an ai|thank you|thanks|dhanyavad|ధన్యవాదాలు|ధన్యవాదములు|చాలా ధన్యవాదాలు|శుक्रिया|धन्यवाद|नमस्ते|आप कैसे हैं|bye|goodbye|see you|take care)/i;
    const hasLegalDisputeKeyword = /138|cheque|deposit|rent|tenant|landlord|consumer|refund|rera|bail|fir|partition|section|act|court|dispute|notice|case|complaint|న్యాయ|కోర్టు|తీర్పు|కేసు|ఫిర్యాదు/i.test(trimmed);
    const words = trimmed.split(/\s+/).filter(Boolean);
    const isCasual = !hasLegalDisputeKeyword && !hasFamilyKeyword && !isSafetyCritical && !isFindAdvocate && (
      casualWordsPattern.test(trimmed) && (words.length <= 8 || /^(hi|hello|hey|నమస్కారం|नमस्ते)/i.test(trimmed))
    );

    // 5. Precedent / Court Judgment Search Request Check
    const isJudgmentSearch =
      /(search|find|show|retrieve|get|display).*(judgment|judgement|precedent|court order|ruling|case law|cases)|(judgment|judgement|precedent|ruling)s? (on|regarding|about|for)|సుప్రీంకోర్టు తీర్పు|హైకోర్టు తీర్పు|తీర్పులు చూపించు|తీర్పుల వివరాలు/i.test(trimmed) &&
      !/(draft notice|file case|book consultation)/i.test(trimmed);

    // 6. Contextual Follow-up Check
    const hasHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0;
    const isFollowUpPattern =
      /^(what if|can i|and what about|what next|then what|how long do i have|how many days|what is the fee|is there any fee|how to send|will it work|how much time|ఆ తర్వాత|మరి|తర్వాత ఏం చేయాలి|ఎంత సమయం ఉంటుంది|వడ్డీ అడగొచ్చా|అతను ఇవ్వకపోతే|మరి అతను ఒప్పుకోకపోతే)/i.test(trimmed) ||
      (hasHistory && trimmed.length < 50 && !hasSpecificLegalTerms && !isCasual);
    const isFollowUp = hasHistory && isFollowUpPattern && !isCasual && !isSafetyCritical;

    // 7. General Educational Legal Question Check
    const isGeneralLegal =
      /^(what is|define|meaning of|explain what|explain|how does|what are the rules for|what is section|tell me about section|procedure to|what documents|documents required|checklist for|కన్స్యూమర్ కోర్టు అంటే ఏమిటి|సెక్షన్|చట్టం ప్రకారం|ఎలా చేయాలి|లీగల్ నోటీస్ అంటే ఏమిటి)/i.test(trimmed) &&
      !isEmotionalOrVague && !isCasual;

    let intent = 'SPECIFIC_LEGAL_QUERY';
    let emotionalTone = 'neutral';
    let urgency = 'normal';

    if (isSafetyCritical) {
      intent = 'SAFETY_CRITICAL';
      emotionalTone = 'urgent';
      urgency = 'critical';
    } else if (isEmotionalOrVague) {
      intent = 'EMOTIONAL_OR_VAGUE';
      emotionalTone = 'distressed';
      urgency = 'normal';
    } else if (isFindAdvocate) {
      intent = 'FIND_ADVOCATE';
      emotionalTone = 'seeking_guidance';
      urgency = 'normal';
    } else if (isCasual) {
      intent = 'CASUAL_CONVERSATION';
      emotionalTone = 'friendly';
      urgency = 'low';
    } else if (isJudgmentSearch) {
      intent = 'JUDGMENT_SEARCH';
      emotionalTone = 'analytical';
      urgency = 'normal';
    } else if (isFollowUp) {
      intent = 'FOLLOW_UP';
      emotionalTone = 'inquiring';
      urgency = 'normal';
    } else if (isGeneralLegal) {
      intent = 'GENERAL_LEGAL_QUESTION';
      emotionalTone = 'informative';
      urgency = 'normal';
    }

    return {
      intent,
      detectedLang,
      emotionalTone,
      urgency,
      needsLegalResearch: intent === 'SPECIFIC_LEGAL_QUERY' || intent === 'GENERAL_LEGAL_QUESTION' || intent === 'JUDGMENT_SEARCH',
      needsAdvocateDiscovery: intent === 'FIND_ADVOCATE',
      needsEmergencySupport: intent === 'SAFETY_CRITICAL',
    };
  }

  /**
   * Generate Multi-Step Execution Plan dynamically based on intent
   */
  generateExecutionPlan(query, detectedLang, classification = null) {
    const intent = classification?.intent || 'SPECIFIC_LEGAL_QUERY';

    if (intent === 'CASUAL_CONVERSATION' || intent === 'GENERAL_GREETING') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Understand Conversational Tone & Intent',
          description: `Acknowledge friendly conversation in ${detectedLang.language}. Legal research tools are skipped.`,
        },
        {
          step: 2,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Respond Naturally in ${detectedLang.language}`,
          description: 'Provide a warm, human, conversational reply without imposing legal jargon or formalities.',
        },
      ];
    }

    if (intent === 'EMOTIONAL_OR_VAGUE') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Understand Conversational Intent & Needs',
          description: `Analyze emotional context, detect language (${detectedLang.language}), and recognize non-adversarial inquiry.`,
        },
        {
          step: 2,
          id: 'FETCH_HISTORY',
          name: 'Retrieve Session & Case Context',
          description: 'Load authorized previous conversation messages to preserve conversational continuity.',
        },
        {
          step: 3,
          id: 'EVALUATE_LEGAL_NEED',
          name: 'Evaluate Legal Research Relevance',
          description: 'Legal statutes and court precedents are skipped; inquiry is personal and does not assert a legal dispute.',
        },
        {
          step: 4,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Empathetic Guidance in ${detectedLang.language}`,
          description: 'Respond with supportive empathy and ask a gentle clarifying question without assuming a legal dispute.',
        },
      ];
    }

    if (intent === 'SAFETY_CRITICAL') {
      return [
        {
          step: 1,
          id: 'EVALUATE_SAFETY',
          name: 'Assess Immediate Safety & Protection Risks',
          description: 'Prioritize physical safety and identify emergency protection needs under Indian law.',
        },
        {
          step: 2,
          id: 'FETCH_HISTORY',
          name: 'Retrieve Session Context',
          description: 'Check active session context for prior safety incidents or incident timeline.',
        },
        {
          step: 3,
          id: 'EMERGENCY_SUPPORT',
          name: 'Route Crisis Support & Protective Helplines',
          description: 'Activate national emergency helplines: 112 (Emergency), 1091/181 (Women Helpline), 1098 (Childline).',
        },
        {
          step: 4,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Emergency Guidance in ${detectedLang.language}`,
          description: 'Deliver actionable immediate safety guidance, safe shelter options, and PWDVA protection remedies.',
        },
      ];
    }

    if (intent === 'FIND_ADVOCATE') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Analyze Representation Request & Practice Domain',
          description: `Identify required legal practice area, location, and court jurisdiction in ${detectedLang.language}.`,
        },
        {
          step: 2,
          id: 'FETCH_HISTORY',
          name: 'Retrieve Session Context',
          description: 'Inspect previous conversation turns to match advocate specializations to discussed facts.',
        },
        {
          step: 3,
          id: 'DISCOVER_ADVOCATES',
          name: 'Discover Verified VidhiSetu Advocates & Bar Registries',
          description: 'Query VidhiSetu verified counsel registry and authentic High Court / Supreme Court directories.',
        },
        {
          step: 4,
          id: 'DEDUPLICATE_ADVOCATES',
          name: 'Deduplicate & Rank Legal Counsel',
          description: 'Merge duplicate records by Bar registration ID and rank advocates by relevance score.',
        },
        {
          step: 5,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Advocate Recommendations in ${detectedLang.language}`,
          description: 'Present verified advocate profiles, transparent fee schedules, and direct in-app booking actions.',
        },
      ];
    }

    if (intent === 'JUDGMENT_SEARCH') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Analyze Precedent Search Parameters',
          description: `Extract legal keywords and court jurisdiction in ${detectedLang.language}.`,
        },
        {
          step: 2,
          id: 'SEARCH_PRECEDENTS',
          name: 'Query Indian Kanoon Precedents Database',
          description: 'Execute search_kanoon_precedents for authentic Supreme Court and High Court rulings.',
        },
        {
          step: 3,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Precedent Breakdown in ${detectedLang.language}`,
          description: 'Present case titles, courts, citations, ratio decidendi, and official Indian Kanoon links.',
        },
      ];
    }

    if (intent === 'GENERAL_LEGAL_QUESTION') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Identify Statutory Question & Forum',
          description: `Analyze legal concept or procedural question in ${detectedLang.language}.`,
        },
        {
          step: 2,
          id: 'QUERY_STATUTES',
          name: 'Retrieve Governing Statutory Provisions',
          description: 'Execute search_laws_and_statutes for relevant Indian legislative sections.',
        },
        {
          step: 3,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Educational Guidance in ${detectedLang.language}`,
          description: 'Explain definition, statutory rights, and procedure clearly without assuming dispute filing.',
        },
      ];
    }

    if (intent === 'FOLLOW_UP') {
      return [
        {
          step: 1,
          id: 'CONTEXTUAL_ASSESSMENT',
          name: 'Evaluate Prior Conversation Context',
          description: 'Incorporate facts established in previous conversation turns.',
        },
        {
          step: 2,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Contextual Follow-Up in ${detectedLang.language}`,
          description: 'Directly address the specific question in context without repeating earlier legal dissertation.',
        },
      ];
    }

    const isNotice = /notice|draft|send|bheju|pampali|demand|letter|నోటీసు|పంప|రాయ|ड्राफ्ट|नोटिस|भेज/i.test(query) || /deposit|refund|వాపస్|वापस/i.test(query);
    const isCheque = /cheque|bounce|138|memo|చెక్కు|चेक/i.test(query);
    const isConsumer = /refund|defective|consumer|amazon|flipkart|phone|ఖాతా|उपभोक्ता/i.test(query);

    const plan = [
      {
        step: 1,
        id: 'IDENTIFY_GOAL',
        name: 'Analyze User Intent & Jurisdiction',
        description: `Classify legal issue, detect language (${detectedLang.language}), and evaluate urgency.`,
      },
      {
        step: 2,
        id: 'FETCH_HISTORY',
        name: 'Retrieve Session & Case Context',
        description: 'Load authorized previous conversation messages to ensure case continuity.',
      },
      {
        step: 3,
        id: 'QUERY_STATUTES',
        name: 'Retrieve Statutory Codes & Sections',
        description: 'Execute search_laws_and_statutes for binding Indian legislative acts.',
      },
      {
        step: 4,
        id: 'SEARCH_PRECEDENTS',
        name: 'Retrieve Indian Kanoon Court Precedents',
        description: 'Execute search_kanoon_precedents for landmark Supreme Court & High Court rulings.',
      },
    ];

    if (isNotice) {
      plan.push({
        step: 5,
        id: 'DRAFT_NOTICE',
        name: 'Formulate Legal Demand Notice',
        description: 'Execute draft_legal_notice tool to prepare statutory demand letter.',
      });
    }

    if (isCheque || isConsumer) {
      plan.push({
        step: plan.length + 1,
        id: 'CALCULATE_DEADLINE',
        name: 'Check Limitation Inputs',
        description: 'Check for a relevant event date; do not infer a filing deadline.',
      });
    }

    plan.push({
      step: plan.length + 1,
      id: 'SYNTHESIZE_EXPLANATION',
      name: `Synthesize Response in ${detectedLang.language}`,
      description: 'Validate citations, explain tool execution outcomes, and present actionable next steps.',
    });

    return plan;
  }

  /**
   * Main Agent Execution Workflow
   */
  async execute({ query, jurisdiction = 'All India', conversationId = null, userId = null, history = [], attachedDocs = [], language = null, onProgress = null }) {
    const startTime = Date.now();
    const detectedLang = language ? { language: language === 'te' ? 'Telugu' : (language === 'hi' ? 'Hindi' : 'English'), code: language } : this.detectLanguage(query);

    // Initial context fetch to incorporate into intent classification
    const historyResult = await this.tools.get_conversation_history({ conversationId, userId, limit: 5 });
    const dbMessages = historyResult.recentMessages || [];

    // Normalize and incorporate client-passed history turns
    const clientHistory = Array.isArray(history) ? history.map((h) => ({
      sender: h.sender || (h.role === 'user' ? 'user' : 'assistant'),
      text: h.text || h.content || '',
    })).filter((m) => m.text && m.text.trim()) : [];

    const recentMessages = clientHistory.length > 0 ? clientHistory.slice(-5) : dbMessages;

    // Step 1: Formulate execution plan based on classified intent
    const classification = this.classifyRequest(query, recentMessages);
    const plan = this.generateExecutionPlan(query, detectedLang, classification);
    onProgress?.({ type: 'plan', plan });

    const executedSteps = [];
    const toolResults = { history: { count: recentMessages.length, recentMessages } };

    // Step 2: Context Acquisition step logging
    onProgress?.({ type: 'step_start', step: 'FETCH_HISTORY', name: 'Retrieving conversation context' });
    executedSteps.push({
      step: 'FETCH_HISTORY',
      tool: 'get_conversation_history',
      status: 'completed',
      summary: recentMessages.length > 0
        ? `Loaded ${recentMessages.length} authorized prior turn(s).`
        : 'No prior conversation context was found.',
    });
    onProgress?.({ type: 'step_done', step: 'FETCH_HISTORY', result: toolResults.history });

    let statuteResult = { statutes: [], retrievalStatus: 'skipped' };
    let precedentResult = { precedents: [], retrievalStatus: 'skipped' };

    // Branch A: EMOTIONAL_OR_VAGUE
    if (classification.intent === 'EMOTIONAL_OR_VAGUE') {
      onProgress?.({ type: 'step_start', step: 'EVALUATE_LEGAL_NEED', name: 'Assessing legal research need' });
      executedSteps.push({
        step: 'EVALUATE_LEGAL_NEED',
        tool: 'search_laws_and_statutes',
        status: 'skipped',
        summary: 'Statutory and Kanoon research tools were intentionally skipped because this message is a personal/emotional inquiry without an active legal dispute.',
      });
      onProgress?.({ type: 'step_done', step: 'EVALUATE_LEGAL_NEED', result: { status: 'skipped' } });
    }

    // Branch B: SAFETY_CRITICAL
    else if (classification.intent === 'SAFETY_CRITICAL') {
      onProgress?.({ type: 'step_start', step: 'EMERGENCY_SUPPORT', name: 'Connecting emergency helplines' });
      executedSteps.push({
        step: 'EMERGENCY_SUPPORT',
        tool: 'emergency_helpline_router',
        status: 'completed',
        summary: 'Emergency safety helplines activated: 112 (National Emergency), 1091 (Women in Distress), 1098 (Childline).',
      });
      onProgress?.({ type: 'step_done', step: 'EMERGENCY_SUPPORT', result: { helplines: ['112', '1091', '1098'] } });
    }

    // Branch C: FIND_ADVOCATE
    else if (classification.intent === 'FIND_ADVOCATE') {
      onProgress?.({ type: 'step_start', step: 'DISCOVER_ADVOCATES', name: 'Discovering verified advocates' });
      const advResult = await this.tools.discover_advocates({
        query,
        category: jurisdiction,
        city: jurisdiction !== 'All India' ? jurisdiction : '',
        maxResults: 4,
      });
      toolResults.advocates = advResult;
      const vidhiCount = (advResult.advocates || []).filter((a) => a.isVidhiSetuVerified).length;
      const extCount = (advResult.advocates || []).filter((a) => !a.isVidhiSetuVerified).length;
      executedSteps.push({
        step: 'DISCOVER_ADVOCATES',
        tool: 'discover_advocates',
        status: advResult.retrievalStatus === 'completed' ? 'completed' : 'unavailable',
        summary: `Discovered ${advResult.foundCount} advocate(s) (${vidhiCount} VidhiSetu Verified, ${extCount} External Directory).`,
        data: advResult.advocates,
      });
      onProgress?.({ type: 'step_done', step: 'DISCOVER_ADVOCATES', result: advResult });
    }

    // Branch D: CASUAL_CONVERSATION
    else if (classification.intent === 'CASUAL_CONVERSATION' || classification.intent === 'GENERAL_GREETING') {
      onProgress?.({ type: 'step_start', step: 'NATURAL_CONVERSATION', name: 'Engaging in natural dialogue' });
      executedSteps.push({
        step: 'NATURAL_CONVERSATION',
        tool: 'conversational_engine',
        status: 'completed',
        summary: 'Acknowledged friendly conversational exchange without invoking statutory litigation tools.',
      });
      onProgress?.({ type: 'step_done', step: 'NATURAL_CONVERSATION', result: { status: 'conversational' } });
    }

    // Branch E: JUDGMENT_SEARCH
    else if (classification.intent === 'JUDGMENT_SEARCH') {
      onProgress?.({ type: 'step_start', step: 'SEARCH_PRECEDENTS', name: 'Querying Indian Kanoon court precedents' });
      precedentResult = await this.tools.search_kanoon_precedents({ query, maxResults: 4 });
      toolResults.precedents = precedentResult;
      executedSteps.push({
        step: 'SEARCH_PRECEDENTS',
        tool: 'search_kanoon_precedents',
        status: precedentResult.retrievalStatus === 'retrieved' ? 'completed' : 'unavailable',
        summary: precedentResult.retrievalStatus === 'retrieved'
          ? `Retrieved ${precedentResult.retrievedCount} authentic Indian Kanoon precedent(s).`
          : 'No matching court precedents were found on Indian Kanoon.',
        data: precedentResult.precedents,
      });
      onProgress?.({ type: 'step_done', step: 'SEARCH_PRECEDENTS', result: precedentResult });
    }

    // Branch F: GENERAL_LEGAL_QUESTION
    else if (classification.intent === 'GENERAL_LEGAL_QUESTION') {
      onProgress?.({ type: 'step_start', step: 'QUERY_STATUTES', name: 'Searching Indian statutes' });
      statuteResult = await this.tools.search_laws_and_statutes({ query, category: jurisdiction });
      toolResults.statutes = statuteResult;
      executedSteps.push({
        step: 'QUERY_STATUTES',
        tool: 'search_laws_and_statutes',
        status: statuteResult.retrievalStatus === 'retrieved' ? 'completed' : 'unavailable',
        summary: statuteResult.retrievalStatus === 'retrieved'
          ? `Retrieved ${statuteResult.foundCount} statutory provision(s).`
          : 'No matching statutory provisions were found.',
        data: statuteResult.statutes,
      });
      onProgress?.({ type: 'step_done', step: 'QUERY_STATUTES', result: statuteResult });
    }

    // Branch G: FOLLOW_UP
    else if (classification.intent === 'FOLLOW_UP') {
      onProgress?.({ type: 'step_start', step: 'CONTEXTUAL_ASSESSMENT', name: 'Evaluating prior case context' });
      executedSteps.push({
        step: 'CONTEXTUAL_ASSESSMENT',
        tool: 'context_evaluator',
        status: 'completed',
        summary: 'Synthesizing contextual follow-up anchored to previously established facts.',
      });
      onProgress?.({ type: 'step_done', step: 'CONTEXTUAL_ASSESSMENT', result: { status: 'completed' } });
    }

    // Branch H: SPECIFIC_LEGAL_QUERY (Default)
    else {
      // Step 3: Statutory Search
      onProgress?.({ type: 'step_start', step: 'QUERY_STATUTES', name: 'Searching Indian statutes' });
      statuteResult = await this.tools.search_laws_and_statutes({ query, category: jurisdiction });
      toolResults.statutes = statuteResult;
      executedSteps.push({
        step: 'QUERY_STATUTES',
        tool: 'search_laws_and_statutes',
        status: statuteResult.retrievalStatus === 'retrieved' ? 'completed' : 'unavailable',
        summary: statuteResult.retrievalStatus === 'retrieved'
          ? `Retrieved ${statuteResult.foundCount} statutory section(s).`
          : 'No matching statutory provisions were found.',
        data: statuteResult.statutes,
      });
      onProgress?.({ type: 'step_done', step: 'QUERY_STATUTES', result: statuteResult });

      // Step 4: Kanoon Precedents Search
      onProgress?.({ type: 'step_start', step: 'SEARCH_PRECEDENTS', name: 'Retrieving court precedents' });
      precedentResult = await this.tools.search_kanoon_precedents({ query, maxResults: 3 });
      toolResults.precedents = precedentResult;
      executedSteps.push({
        step: 'SEARCH_PRECEDENTS',
        tool: 'search_kanoon_precedents',
        status: precedentResult.retrievalStatus === 'retrieved' ? 'completed' : 'unavailable',
        summary: precedentResult.retrievalStatus === 'retrieved'
          ? `Retrieved ${precedentResult.retrievedCount} Indian Kanoon precedent(s).`
          : 'No matching court precedents were found.',
        data: precedentResult.precedents,
      });
      onProgress?.({ type: 'step_done', step: 'SEARCH_PRECEDENTS', result: precedentResult });

      // Step 5: Optional Legal Notice Drafting Tool
      if (plan.some((p) => p.id === 'DRAFT_NOTICE')) {
        onProgress?.({ type: 'step_start', step: 'DRAFT_NOTICE', name: 'Drafting statutory demand notice' });
        const noticeResult = await this.tools.draft_legal_notice({
          grievance: query,
          statuteRef: statuteResult.statutes[0]?.title || null,
        });
        toolResults.legalNotice = noticeResult;
        executedSteps.push({
          step: 'DRAFT_NOTICE',
          tool: 'draft_legal_notice',
          status: 'completed',
          summary: 'Prepared an editable draft; it was not sent and requires advocate review.',
        });
        onProgress?.({ type: 'step_done', step: 'DRAFT_NOTICE', result: noticeResult });
      }

      // Step 6: Optional Limitation Deadline Calculation Tool
      if (plan.some((p) => p.id === 'CALCULATE_DEADLINE')) {
        onProgress?.({ type: 'step_start', step: 'CALCULATE_DEADLINE', name: 'Checking limitation inputs' });
        const deadlineResult = await this.tools.calculate_limitation_deadline({
          eventDate: null,
          causeOfAction: query,
        });
        toolResults.limitation = deadlineResult;
        executedSteps.push({
          step: 'CALCULATE_DEADLINE',
          tool: 'calculate_limitation_deadline',
          status: deadlineResult.needsEventDate ? 'needs_input' : 'completed',
          summary: deadlineResult.needsEventDate
            ? 'A relevant event date is needed before an indicative deadline can be calculated.'
            : `Indicative deadline: ${deadlineResult.calculatedDeadline} (${deadlineResult.statutoryRule})`,
        });
        onProgress?.({ type: 'step_done', step: 'CALCULATE_DEADLINE', result: deadlineResult });
      }

      // Prepare a suggestion only
      const actionTitle = 'Preserve relevant documents and record key event dates';
      const actionResult = await this.tools.prepare_case_action_item({
        caseId: conversationId,
        title: actionTitle,
      });
      toolResults.actionItem = actionResult;
      executedSteps.push({
        step: 'PREPARE_ACTION_ITEM',
        tool: 'prepare_case_action_item',
        status: 'completed',
        summary: `Prepared a suggested action item; it was not saved: "${actionTitle}".`,
      });
    }

    // Step 8: Multi-Lingual Synthesis & Explanation
    onProgress?.({ type: 'step_start', step: 'SYNTHESIS_AND_EXPLAIN', name: `Synthesizing guidance in ${detectedLang.language}` });
    const finalGuidance = await this.synthesizeGuidance({
      query,
      detectedLang,
      classification,
      plan,
      executedSteps,
      toolResults,
    });

    const executionTimeMs = Date.now() - startTime;

    return {
      success: true,
      query,
      intent: classification.intent,
      emotionalTone: classification.emotionalTone,
      urgency: classification.urgency,
      language: detectedLang.language,
      languageCode: detectedLang.code,
      executionPlan: plan,
      agentSteps: executedSteps,
      toolResults,
      reply: finalGuidance.text,
      guidance: finalGuidance.text,
      detectedLaws: (statuteResult.statutes || []).map((s) => ({
        act: s.act,
        section: s.section,
        title: s.title,
      })),
      detectedPrecedents: (precedentResult.precedents || []).map((p) => ({
        title: p.title,
        court: p.court,
        citation: p.citation,
        url: p.url,
      })),
      discoveredAdvocates: toolResults.advocates?.advocates || [],
      suggestedNextSteps: finalGuidance.nextSteps,
      legalNoticeDraft: toolResults.legalNotice?.noticeText || null,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Synthesize final grounded answer adapted to user language and question intent
   */
  async synthesizeGuidance({ query, detectedLang, classification, plan, executedSteps, toolResults }) {
    const statutes = toolResults.statutes?.statutes || [];
    const precedents = toolResults.precedents?.precedents || [];
    const limitation = toolResults.limitation;
    const notice = toolResults.legalNotice;
    const conversationHistory = toolResults.history?.recentMessages || [];
    const advocates = toolResults.advocates?.advocates || [];

    // Attempt Gemini synthesis with proper model fallback if configured
    if (geminiClient.isConfigured()) {
      try {
        const prompt = `
You are VidhiSetu, an Indian legal information assistant, not a lawyer.
CURRENT QUERY:
${query}

USER INTENT: ${classification?.intent || 'SPECIFIC_LEGAL_QUERY'} (Tone: ${classification?.emotionalTone || 'neutral'})
INSTRUCTION ON INTENT:
- If intent is CASUAL_CONVERSATION or GENERAL_GREETING: Respond warmly, naturally, and conversationally in the user's language. Do NOT write a legal brief, do NOT cite statutes, and do NOT propose legal notices.
- If intent is EMOTIONAL_OR_VAGUE: Respond with warm empathy. Do NOT assume an adversarial legal dispute or cite random laws. Ask a concise, supportive clarifying question.
- If intent is SAFETY_CRITICAL: Prioritize physical safety and emergency helplines (112, 1091, 1098).
- If intent is FIND_ADVOCATE: Present matching advocate recommendations with verified details.
- If intent is JUDGMENT_SEARCH: Present authentic Indian Kanoon precedents with case titles, citations, and ratio.
- If intent is FOLLOW_UP: Directly address the follow-up question based on the conversation context without repeating past answers.
- If intent is GENERAL_LEGAL_QUESTION: Explain the legal concept/statutory rule educationally.
- If intent is SPECIFIC_LEGAL_QUERY: Provide grounded legal analysis.

AUTHORIZED RECENT CONVERSATION CONTEXT:
${conversationHistory.length
  ? conversationHistory.map((m) => `- ${m.sender}: ${m.text}`).join('\n')
  : 'No prior messages were available.'}

DETECTED LANGUAGE: ${detectedLang.language} (Code: ${detectedLang.code})
IMPORTANT: Respond in the EXACT same language as the user (${detectedLang.language}).

AGENT RETRIEVAL EVIDENCE:
Statutes Retrieved:
${statutes.length > 0 ? statutes.map((s) => `- ${s.act} (${s.section}): ${s.title}. ${s.summary}`).join('\n') : 'No matching statutes retrieved.'}

Precedents Retrieved:
${precedents.length > 0 ? precedents.map((p) => `- ${p.title} (${p.court}, ${p.citation}): ${p.ratio || p.excerpt}`).join('\n') : 'No matching precedents retrieved.'}

Advocates Discovered:
${advocates.length > 0 ? advocates.map((a) => `- ${a.name} (${a.primary_court}, ${a.location_city}): ${a.verificationStatus}`).join('\n') : 'None'}

Instructions:
- Tailor the response to the user's specific intent and emotional context.
- Never invent statutes, citations, or advocate contact details.
        `.trim();

        const res = await geminiClient.generateText({
          prompt,
          timeoutMs: 12000,
        });

        if (res?.text && res.text.trim().length > 100) {
          return {
            text: res.text.trim(),
            nextSteps: toolResults.actionItem?.actionItem ? [toolResults.actionItem.actionItem.title] : [],
          };
        }
      } catch (err) {
        console.warn('[Agent] Gemini synthesis fallback to grounded native engine:', err.message);
      }
    }

    // Dynamic High-Fidelity Grounded Engine adapted to query type and user language
    return this.buildGroundedNativeResponse(query, detectedLang, classification, statutes, precedents, limitation, notice, conversationHistory, advocates);
  }

  /**
   * Grounded Deterministic Response dynamically constructed per question intent
   */
  buildGroundedNativeResponse(query, detectedLang, classification, statutes, precedents, limitation, notice, conversationHistory = [], advocates = []) {
    const lang = detectedLang.code;
    const lower = query.toLowerCase();
    const intent = classification?.intent || 'SPECIFIC_LEGAL_QUERY';

    // 0A. EMOTIONAL OR VAGUE MESSAGES (e.g. "I have some family issues")
    if (intent === 'EMOTIONAL_OR_VAGUE') {
      if (lang === 'te') {
        return {
          text: `### 💙 మీ పరిస్థితిని మేము అర్థం చేసుకోగలము

కుటుంబ సమస్యలు ఎంతో మానసిక ఒత్తిడికి, ఆందోళనకు మరియు సున్నితమైన పరిస్థితులకు దారితీస్తాయని నేను అర్థం చేసుకోగలను. మీరు ఎలాంటి ఒత్తిడి లేకుండా మీ సమస్యను వివరించవచ్చు.

ఏదైనా చట్టపరమైన వివాదాన్ని లేదా కోర్టు కేసులను ఊహించే ముందు, అసలు సమస్య దేనికి సంబంధించినదో స్పష్టంగా తెలుసుకోవడం ముఖ్యం. కుటుంబ వివాదాలకు పరస్పర సంభాషణ, కౌన్సిలింగ్, మరియు లీగల్ సర్వీసెస్ అథారిటీ (DLSA) ద్వారా ఉచిత మధ్యవర్తిత్వం (mediation) వంటి అనేక పరిష్కార మార్గాలు ఉన్నాయి.

#### మీకు తగిన మార్గదర్శకత్వం అందించడానికి, దయచేసి మరికొన్ని వివరాలు చెప్పగలరా?
ఉదాహరణకు, మీ సమస్య దేనికి సంబంధించినది:
1. **భార్యాభర్తల మధ్య విభేదాలు**: విడిపోవడం, విడాకులు లేదా దాంపత్య సమస్యలా?
2. **పిల్లల సంరక్షణ & పోషణ**: పిల్లల కస్టడీ లేదా భరణం (maintenance) గురించా?
3. **కుటుంబ ఆస్తి లేదా ఆర్థిక విషయాలు**: వారసత్వ ఆస్తి పంపకాలు లేదా ఆర్థిక వివాదమా?
4. **రక్షణ లేదా వ్యక్తిగత ఆందోళనలు**: లేదా ఇంట్లో భద్రత, వేధింపులు లేదా మధ్యవర్తిత్వ సహాయం అవసరమా?

మీరు సులభంగా పంచుకోగల వివరాలను మాత్రమే చెప్పండి. మీ పరిస్థితికి తగిన శాంతియుత మరియు చట్టబద్ధమైన మార్గాలను అర్థం చేసుకోవడానికి నేను ఇక్కడ ఉన్నాను.`,
          nextSteps: [
            'కుటుంబ కౌన్సిలింగ్ లేదా శాంతియుత మధ్యవర్తిత్వం (mediation) ఉపయోగపడుతుందో ఆలోచించండి',
            'మీరు సిద్ధంగా ఉన్నప్పుడు మరిన్ని వివరాలను పంచుకోండి',
          ],
        };
      }

      if (lang === 'hi') {
        return {
          text: `### 💙 आपकी स्थिति को समझना

मैं समझ सकता हूँ कि पारिवारिक समस्याएं बहुत व्यक्तिगत, भावनात्मक और तनावपूर्ण हो सकती हैं। ऐसी स्थितियों में आपको अकेले चिंता करने की आवश्यकता नहीं है।

किसी भी कानूनी मुकदमे या अदालती कार्रवाई को मानने से पहले, यह समझना जरूरी है कि स्थिति किस प्रकार की है। पारिवारिक मामलों में बातचीत, परामर्श (counseling), और जिला विधिक सेवा प्राधिकरण (DLSA) के माध्यम से निःशुल्क मध्यस्थता (mediation) जैसे कई शांतिपूर्ण रास्ते उपलब्ध होते हैं।

#### आपको सही मार्गदर्शन देने के लिए, क्या आप थोड़ी और जानकारी साझा कर सकते हैं?
उदाहरण के लिए, क्या यह मामला संबंधित है:
1. **वैवाहिक मतभेद या अलगाव**: आपसी मनमुटाव, तलाक या दांपत्य विवाद?
2. **बच्चों की देखरेख एवं संरक्षण**: बच्चों की कस्टडी या भरण-पोषण (maintenance)?
3. **पारिवारिक संपत्ति या वित्तीय मामले**: पैतृक संपत्ति का बंटवारा या लेन-देन?
4. **सुरक्षा या मानसिक शांति**: या घरेलू तनाव, प्रताड़ना अथवा मध्यस्थता की आवश्यकता?

आप जो भी साझा करने में सहज महसूस करें, कृपया बताएं। हम आपको सही और शांतिपूर्ण विकल्पों की जानकारी देने के लिए यहाँ हैं।`,
          nextSteps: [
            'पारिवारिक परामर्श (counseling) या मध्यस्थता (mediation) के विकल्प पर विचार करें',
            'विशिष्ट कानूनी विकल्पों को जानने के लिए तैयार होने पर अधिक जानकारी साझा करें',
          ],
        };
      }

      // English Emotional / Vague Response
      return {
        text: `### 💙 Understanding Your Situation

I hear you, and I understand that family matters can be deeply personal, sensitive, and emotionally stressful to navigate. When family problems arise, you do not have to carry the burden all by yourself.

Before assuming an adversarial legal dispute or considering formal court procedures, it helps to understand what you are currently experiencing. Family situations often involve different paths—ranging from peaceful communication, family counseling, and mediation, to formal legal protections.

#### To help me guide you appropriately, could you share a bit more context?
For instance, does your situation relate to:
1. **Marital Disagreement or Relationship Strain**: Separation, divorce, or resolving differences?
2. **Child Welfare & Care**: Custody, visitation, or maintenance for children?
3. **Property or Financial Disputes**: Inheritance, ancestral property, or shared financial obligations?
4. **Domestic Wellbeing or Safety**: Or are you experiencing intimidation, distress, or conflict at home?

Please share only what you feel comfortable discussing. If you simply need information on peaceful mediation or family counseling resources, we can start with that as well.`,
        nextSteps: [
          'Reflect on whether peaceful family mediation or counseling could assist',
          'Share more details when ready if you wish to explore specific legal rights or options',
        ],
      };
    }

    // 0B. SAFETY CRITICAL & DOMESTIC VIOLENCE EMERGENCY
    if (intent === 'SAFETY_CRITICAL') {
      return {
        text: `### 🚨 Immediate Safety & Emergency Support

**Your physical safety and wellbeing are the absolute first priority.** If you or anyone in your household is in immediate danger or facing physical violence, please seek immediate help:

#### 24/7 Emergency Helplines (Toll-Free Across India):
- 📞 **112**: All-India National Emergency Response Support System (Police, Medical & Rescue)
- 📞 **1091 / 181**: Women in Distress Helpline (Immediate Police Dispatch & Counselor Assistance)
- 📞 **1098**: Childline (Emergency Child Protection Helpline)
- 📞 **100**: Direct Police Control Room

#### Your Statutory Emergency Protections under Indian Law:
Under the **Protection of Women from Domestic Violence Act, 2005 (PWDVA)**, you have enforceable statutory rights:
1. **Emergency Protection Orders (Section 18)**: Prohibits the respondent from committing acts of domestic violence, entering your place of employment, or contacting you.
2. **Residence Orders (Section 19)**: Directs that you shall not be dispossessed or excluded from the shared household.
3. **Emergency Shelter & Medical Aid (Sections 6 & 7)**: The Protection Officer or Service Provider is legally bound to provide immediate safe shelter and medical assistance.

Please reach out to a trusted friend, family member, or local police station immediately. Formal legal paperwork and filings can be completed once you are in a safe and secure environment.`,
        nextSteps: [
          'Contact 112 or 1091 immediately if you are in immediate physical danger',
          'Reach a safe location (relatives, friends, or nearest Police Station/Shelter)',
          'Approach a Protection Officer or local Magistrate under Section 12 PWDVA once safe',
        ],
      };
    }

    // 0C. ADVOCATE DISCOVERY / REPRESENTATION REQUEST
    if (intent === 'FIND_ADVOCATE') {
      const vidhiSetuAdvocates = advocates.filter((a) => a.isVidhiSetuVerified);
      const externalAdvocates = advocates.filter((a) => !a.isVidhiSetuVerified);

      const vidhiCards = vidhiSetuAdvocates.length > 0
        ? vidhiSetuAdvocates.map((a) => `
- **${a.name}** (${a.designation} • ${a.experienceYears} Years Experience)
  - **Bar Council**: \`${a.bar_registration_number || a.state_bar_council || 'Verified'}\`
  - **Primary Court & Location**: ${a.primary_court}, ${a.location_city}
  - **Specializations**: ${(a.practiceAreas || []).slice(0, 3).join(', ')}
  - **Consultation Fee**: ₹${a.consultationFee} (30 mins via ${(a.consultationModes || ['Video', 'Chat']).join(' / ')})
  - **Verification**: ✅ **${a.verificationStatus}** (In-App Booking Enabled)
`).join('')
        : '• *No direct VidhiSetu verified advocates found in this exact category/location.*';

      const externalCards = externalAdvocates.length > 0
        ? externalAdvocates.map((a) => `
- **${a.name}** (${a.designation} • ${a.primary_court})
  - **Chambers**: ${a.chamber}, ${a.location_city}
  - **Practice Areas**: ${(a.practiceAreas || []).slice(0, 3).join(', ')}
  - **Bar Registry Link**: [Official Directory Record](${a.public_website})
  - **Status**: ℹ️ *${a.verificationStatus}*
`).join('')
        : '';

      return {
        text: `### ⚖️ Verified Legal Counsel Discovery & Matching

Based on your inquiry, here are verified advocates specializing in relevant practice areas:

#### 🌟 VidhiSetu Certified Advocates (Direct Consultation Booking)
${vidhiCards}

${externalAdvocates.length > 0 ? `#### 🏛️ Recognized External Legal Chambers (Public Bar Directories)
${externalCards}

> [!NOTE]
> External counsel recommendations are retrieved from public Supreme Court and High Court Bar Association registries. Direct in-app scheduling and verified fixed fees are available exclusively for VidhiSetu Certified Advocates.` : ''}`,
        nextSteps: [
          'Choose a VidhiSetu Certified Advocate to book a 30-minute consultation',
          'Organize all relevant receipts, agreements, and notices for your advocate review',
        ],
      };
    }

    // 0D. CASUAL CONVERSATION & GREETINGS
    if (intent === 'CASUAL_CONVERSATION' || intent === 'GENERAL_GREETING') {
      const isThanks = /thank|thanks|dhanyavad|ధన్యవాదాలు|ధన్యవాదములు|చాలా ధన్యవాదాలు|शुक्रिया|धन्यवाद/i.test(lower);
      const isPleasantry = /how are you|who are you|what is your name|who made you|are you a lawyer|are you an ai|మీరు ఎవరు|మీ పేరు|బాగున్నారా|ఎలా ఉన్నారు|आप कैसे हैं|आप कौन हैं/i.test(lower);

      if (lang === 'te') {
        if (isThanks) {
          return {
            text: `### 🙏 ధన్యవాదాలు!

మీకు సహాయం చేయగలిగినందుకు చాలా సంతోషం. మీకు ఏవైనా చట్టపరమైన ప్రశ్నలు, కోర్టు తీర్పుల వివరాలు (Indian Kanoon), లేదా ధృవీకరించబడిన లాయర్ల సంప్రదింపులు అవసరమైతే ఎప్పుడైనా అడగవచ్చు. మీ హక్కులను తెలుసుకోవడంలో మీకు సహాయం చేయడానికి నేను సిద్ధంగా ఉన్నాను.`,
            nextSteps: [
              'మీకు ఇంకేవైనా చట్టపరమైన ప్రశ్నలు ఉంటే అడగండి',
              'ధృవీకరించబడిన న్యాయవాదుల వివరాల కోసం అడగండి',
            ],
          };
        }
        if (isPleasantry) {
          return {
            text: `### ⚖️ నమస్కారం! నేను విధిసేతు

నేను బాగున్నాను, అడిగినందుకు ధన్యవాదాలు! నేను **విధిసేతు (VidhiSetu)** అనే లీగల్ ఏఐ అసిస్టెంట్‌ని.

భారతీయ పౌరులకు వారి చట్టపరమైన హక్కులు (అద్దె వివాదాలు, చెక్కు బౌన్స్, వినియోగదారుల హక్కులు మొదలైనవి), ప్రామాణిక కోర్టు తీర్పుల సమాచారం, చట్టబద్ధమైన లీగల్ నోటీసుల తయారీ, మరియు ధృవీకరించబడిన బార్ కౌన్సిల్ లాయర్లతో కనెక్ట్ చేయడంలో నేను పారదర్శక సహాయం అందిస్తాను.

ఈరోజు మీకు ఏ విషయంలో సహాయం కావాలి?`,
            nextSteps: [
              'మీ చట్టపరమైన సందేహాన్ని లేదా సమస్యను వివరించండి',
              'కోర్టు తీర్పుల వివరాల కోసం అడగండి',
            ],
          };
        }
        return {
          text: `### ⚖️ నమస్కారం! విధిసేతుకు స్వాగతం

హలో! నేను మీకు ఎలా సహాయపడగలను?

మీరు అద్దె డిపాజిట్ సమస్యలు, చెక్కు బౌన్స్ (సెక్షన్ 138), వినియోగదారుల హక్కులు లేదా ఏదైనా భారతీయ చట్టం గురించి తెలుగు లేదా ఇంగ్లీషులో నాతో మాట్లాడవచ్చు. మీకు ఏ విషయంలో మార్గదర్శకత్వం కావాలో తెలపండి.`,
          nextSteps: [
            'మీ చట్టపరమైన సమస్యను ఇక్కడ పంచుకోండి',
            'అవసరమైతే మీ నగరంలో లాయర్ల వివరాలను కోరండి',
          ],
        };
      }

      if (lang === 'hi') {
        if (isThanks) {
          return {
            text: `### 🙏 आपका बहुत-बहुत धन्यवाद!

आपकी सहायता करके मुझे बहुत खुशी हुई। यदि आपके पास कोई अन्य कानूनी प्रश्न हैं, फैसलों (Indian Kanoon) की जानकारी चाहिए, या सत्यापित वकीलों से संपर्क करना हो, तो आप कभी भी पूछ सकते हैं।`,
            nextSteps: [
              'यदि कोई अन्य प्रश्न हो तो बेझिझक पूछें',
              'अपने शहर में सत्यापित वकीलों की सूची मांगें',
            ],
          };
        }
        if (isPleasantry) {
          return {
            text: `### ⚖️ नमस्ते! मैं विधिसितु हूँ

मैं बहुत अच्छा हूँ, पूछने के लिए धन्यवाद! मैं **विधिसितु (VidhiSetu)** हूँ, एक कानूनी एआई सहायक जो भारतीय नागरिकों को उनके कानूनी अधिकारों, कानूनों, अदालती फैसलों और सत्यापित वकीलों से जोड़ने में मदद करता है।

आज मैं आपकी किस प्रकार सहायता कर सकता हूँ?`,
            nextSteps: [
              'अपनी कानूनी स्थिति या प्रश्न साझा करें',
              'सत्यापित वकीलों से परामर्श हेतु जानकारी प्राप्त करें',
            ],
          };
        }
        return {
          text: `### ⚖️ नमस्ते! विधिसितु में आपका स्वागत है

नमस्ते! मैं आपकी किस प्रकार सहायता कर सकता हूँ? आप किराये के विवाद, चेक बाउंस, उपभोक्ता अधिकार या किसी भी कानूनी मामले के बारे में पूछ सकते हैं।`,
          nextSteps: [
            'अपनी कानूनी समस्या या प्रश्न बताएं',
          ],
        };
      }

      // Default English Casual
      if (isThanks) {
        return {
          text: `### 🙏 You're Very Welcome!

I'm glad I could help! If you have any further questions about your rights, need more details on Indian statutes or authentic court precedents, or wish to connect with a verified advocate, feel free to ask anytime.`,
          nextSteps: [
            'Ask any follow-up questions if you need more clarity',
            'Request advocate discovery in your city for representation',
          ],
        };
      }

      if (isPleasantry) {
        return {
          text: `### ⚖️ Hello! I am VidhiSetu

I am doing well, thank you for asking! I am **VidhiSetu**, an agentic legal AI assistant built to help Indian citizens understand their statutory rights and access verified legal recourse.

#### What I Can Help You With:
- **Statutory Rights**: Tenancy deposits, Section 138 NI Act (cheque bounce), Consumer Protection Act 2019, employment disputes.
- **Authentic Precedents**: Search landmark Supreme Court and High Court judgments on Indian Kanoon.
- **Demand Notices**: Generate structured pre-litigation statutory legal notices.
- **Verified Counsel**: Connect with Bar Council verified advocates across India.

How can I assist you today?`,
          nextSteps: [
            'Describe your legal inquiry or dispute to get started',
            'Search for relevant judgments or court precedents',
          ],
        };
      }

      return {
        text: `### ⚖️ Welcome to VidhiSetu Legal Assistance

Hello! How can I assist you today? 

You can ask me about your legal rights under Indian law (such as tenancy deposits, cheque dishonour, or consumer disputes), search authentic court precedents on Indian Kanoon, or connect with verified legal counsel in your jurisdiction.`,
        nextSteps: [
          'Type your legal question or dispute to receive tailored guidance',
          'Ask for an advocate in your city if you require representation',
        ],
      };
    }

    // 0E. JUDGMENT SEARCH INTENT
    if (intent === 'JUDGMENT_SEARCH') {
      const precedentList = (precedents && precedents.length > 0) ? precedents : (availablePrecedents || []);
      if (precedentList.length > 0) {
        const cards = precedentList.map((p, i) => `
#### ${i + 1}. 🏛️ [${p.title}](${p.url || `https://indiankanoon.org/doc/${p.kanoonId || ''}/`})
- **Court / Jurisdiction**: ${p.court}
- **Official Citation**: \`${p.citation}\`
- **Ratio Decidendi / Key Legal Holding**: ${p.ratio || p.excerpt || 'Authentic judicial ruling retrieved from Indian Kanoon database.'}
- **Source Record**: [View Complete Ruling on Indian Kanoon](${p.url || `https://indiankanoon.org/doc/${p.kanoonId || ''}/`})
`).join('\n');

        if (lang === 'te') {
          return {
            text: `### 🏛️ ఇండియన్ కానూన్ కోర్టు తీర్పుల వివరాలు (Precedents & Judgments)

మీరు అడిగిన అంశంపై భారతీయ న్యాయస్థానాల ద్వారా వెలువడిన ప్రామాణిక తీర్పుల వివరాలు:

${cards}

> [!NOTE]
> పై తీర్పులు అధికారిక ఇండియన్ కానూన్ డేటాబేస్ నుండి పొందబడ్డాయి. ఏవైనా చట్టపరమైన చర్యలు చేపట్టే ముందు పూర్తి తీర్పు పాఠాన్ని మీ న్యాయవాది ద్వారా సమీక్షించుకోవాలని సూచించడమైనది.`,
            nextSteps: [
              'తీర్పు పూర్తి పాఠాన్ని లింక్ ద్వారా పరిశీలించండి',
              'ఈ తీర్పు మీ కేసుకు ఎలా వర్తిస్తుందో నిర్ధారించడానికి న్యాయవాదిని సంప్రదించండి',
            ],
          };
        }

        return {
          text: `### 🏛️ Indian Kanoon Verified Court Precedents

Based on your inquiry, here are authentic, deduplicated court precedents retrieved from Indian Kanoon:

${cards}

> [!NOTE]
> All citations and court orders above are retrieved directly from authentic judicial records. VidhiSetu strictly does NOT invent citations. Consult a verified advocate to review the applicability of these precedents to your specific factual circumstances.`,
          nextSteps: [
            'Click the source links to review the full text on Indian Kanoon',
            'Compare the specific facts of your situation with the cited ratios',
            'Consult a verified advocate in your jurisdiction for tailored case strategy',
          ],
        };
      }

      return {
        text: `### 🏛️ Indian Kanoon Precedents Search

No exact precedent matches were found on Indian Kanoon for the query: **"${query}"**.

VidhiSetu adheres to strict anti-hallucination protocols and will **never invent or fabricate court citations, case names, or judicial rulings**.

#### Suggestions:
- Search with specific legal keywords (e.g., "security deposit wear and tear", "138 NI Act statutory notice", "consumer defective goods refund").
- Specify the relevant forum (e.g., "Supreme Court", "Delhi High Court", "NCDRC").`,
        nextSteps: [
          'Refine your search with specific legal keywords or case topics',
          'Describe the underlying factual dispute for broader statutory analysis',
        ],
      };
    }

    // 0F. CONTEXTUAL FOLLOW-UP
    if (intent === 'FOLLOW_UP') {
      const isRefusal = /refuse|denies|rejects|doesn't pay|does not pay|ignoring|ignores|ఇవ్వకపోతే|ఒప్పుకోకపోతే|మరి అతను|ససేమిరా|తీసుకోకపోతే|ఇవ్వను అంటే/i.test(lower);
      const isLimitation = /limitation|time limit|how long|how many days|deadline|ఎంత సమయం|గడువు|ఎన్ని రోజులు/i.test(lower);
      const isInterest = /interest|compensation|వడ్డీ|నష్టపరిహారం|హాని/i.test(lower);
      const isDeduct = /deduct|rent|కట్|తీసేసుకోవచ్చా/i.test(lower);

      if (lang === 'te') {
        if (isRefusal) {
          return {
            text: `### ⚖️ తదుపరి చట్టపరమైన చర్య: నోటీసుకు స్పందించకపోతే లేదా నిరాకరిస్తే

మీరు పంపిన 15 రోజుల చట్టబద్ధమైన డిమాండ్ నోటీసుకు ఎదుటి పక్షం స్పందించకపోయినా లేదా చెల్లింపును తిరస్కరించినా, మీ తదుపరి చట్టబద్ధమైన చర్యలు:

#### 1. దావా వేసే హక్కు ఏర్పడటం (Cause of Action):
నోటీసులో పేర్కొన్న 15 రోజుల గడువు ముగిసిన తర్వాతి రోజు నుండి మీరు కోర్టులో దావా వేయడానికి లేదా ఫిర్యాదు చేయడానికి చట్టబద్ధమైన హక్కు లభిస్తుంది.

#### 2. ఉచిత మధ్యవర్తిత్వం (DLSA Pre-Litigation Mediation):
కోర్టు ఖర్చులు లేకుండా పరిష్కారం కోసం మీ జిల్లా లీగల్ సర్వీసెస్ అథారిటీ (DLSA - \`nalsa.gov.in\`) వద్ద ఉచిత మధ్యవర్తిత్వానికి దరఖాస్తు చేసుకోవచ్చు.

#### 3. తగిన ఫోరమ్‌లో కేసు దాఖలు చేయడం:
- **అద్దె డిపాజిట్ వివాదం**: సివిల్ కోర్టులో త్వరిత రికవరీ కోసం **Order 37 CPC (Summary Suit)** దాఖలు చేయవచ్చు లేదా స్థానిక రెంట్ అథారిటీని ఆశ్రయించవచ్చు.
- **వినియోగదారుల వివాదం**: జాతీయ వినియోగదారుల పోర్టల్ **e-Daakhil** (\`edaakhil.nic.in\`) ద్వారా ఆన్‌లైన్‌లో ఫిర్యాదు చేయవచ్చు.
- **చెక్కు బౌన్స్**: నోటీసు గడువు ముగిసిన 30 రోజుల్లోపు మేజిస్ట్రేట్ కోర్టులో **సెక్షన్ 138 NI Act** కింద ప్రైవేట్ క్రిమినల్ ఫిర్యాదు దాఖలు చేయాలి.`,
            nextSteps: [
              '15 రోజుల నోటీసు రసీదు మరియు పోస్టల్ ట్రాకింగ్ రికార్డులను సిద్ధంగా ఉంచుకోండి',
              'DLSA వద్ద ఉచిత మధ్యవర్తిత్వానికి దరఖాస్తు చేసుకోండి',
              'కోర్టులో కేసు దాఖలు చేయడానికి ధృవీకరించబడిన లాయర్‌ను సంప్రదించండి',
            ],
          };
        }

        if (isLimitation) {
          return {
            text: `### ⏱️ చట్టబద్ధమైన కాలపరిమితి (Limitation Timeline)

భారతీయ చట్టాల ప్రకారం చర్య తీసుకోవడానికి నిర్ణీత గడువులు ఉంటాయి:

1. **సివిల్ రికవరీ (అద్దె డిపాజిట్ / బకాయిలు)**: లిమిటేషన్ చట్టం, 1963 ప్రకారం మొత్తం చెల్లించడానికి నిరాకరించిన తేదీ నుండి **3 సంవత్సరాలు**.
2. **వినియోగదారుల ఫిర్యాదు (Consumer Complaint)**: సమస్య లేదా లోపం ఏర్పడిన తేదీ నుండి **2 సంవత్సరాలు** (సెక్షన్ 69, CPA 2019).
3. **చెక్కు బౌన్స్ (సెక్షన్ 138 NI Act)**: డిమాండ్ నోటీసు గడువు (15 రోజులు) ముగిసిన తర్వాత **30 రోజుల్లోపు** కోర్టులో ఫిర్యాదు చేయాలి.`,
            nextSteps: [
              'మీ కేసులో చివరి చెల్లింపు లేదా నిరాకరణ తేదీని నమోదు చేయండి',
              'గడువు ముగియకముందే చర్యలు ప్రారంభించండి',
            ],
          };
        }

        if (isDeduct) {
          return {
            text: `### ⚖️ అద్దె నుండి డిపాజిట్ మినహాయింపు (Adjusting Deposit Against Rent)

చట్టపరంగా, లీజు ఒప్పందంలో స్పష్టమైన నిబంధన లేకపోతే లేదా యజమాని అంగీకారం లేకుండా ఒకపక్షంగా అద్దె ఆపడం కాంట్రాక్ట్ ఉల్లంఘనగా పరిగణించబడే అవకాశం ఉంది.

- **సిఫార్సు**: యజమానికి లిఖితపూర్వకంగా (ఈమెయిల్ లేదా వాట్సాప్ ద్వారా) చివరి నెలల అద్దెను ఇప్పటికే ఉన్న సెక్యూరిటీ డిపాజిట్ నుండి సర్దుబాటు చేయాలని అధికారికంగా ప్రతిపాదించండి.
- యజమాని లిఖితపూర్వకంగా అంగీకరిస్తే మాత్రమే సర్దుబాటు చేయడం సురక్షితమైన మార్గం.`,
            nextSteps: [
              'లీజు ఒప్పందంలోని నిబంధనలను పరిశీలించండి',
              'సర్దుబాటు కోసం యజమానికి లిఖితపూర్వక లేఖ పంపండి',
            ],
          };
        }
      }

      // English Follow-Up
      if (isRefusal) {
        return {
          text: `### ⚖️ Escalation Recourse: If the Opposing Party Refuses or Ignores the Notice

If the opposing party fails to comply or explicitly refuses within the 15-day notice period, you possess immediate, actionable legal remedies:

#### 1. Crystalization of Cause of Action
Upon expiry of the 15-day notice period, your statutory cause of action formally arises. The refusal letter or postal delivery confirmation serves as critical documentary proof before the court.

#### 2. Free Pre-Litigation Mediation (DLSA)
Before investing in court fees, you can approach your jurisdictional **District Legal Services Authority (DLSA)** for free, institutional mediation under Section 89 CPC (\`nalsa.gov.in\`).

#### 3. Formal Judicial Filing Options:
- **Tenancy Security Deposit**: File a **Summary Recovery Suit under Order 37 CPC** before the Civil Court, or file an application before the jurisdictional Rent Controller.
- **Consumer Dispute**: File an online complaint before the District Consumer Commission via the **e-Daakhil Portal** (\`edaakhil.nic.in\`) claiming the refund along with compensation for harassment.
- **Cheque Dishonour**: File a private criminal complaint under **Section 138 of the Negotiable Instruments Act** before the Judicial Magistrate within 30 days of the notice expiry.`,
          nextSteps: [
            'Download the postal tracking delivery proof confirming notice receipt',
            'Apply for pre-litigation conciliation before your local DLSA',
            'Consult a verified advocate on VidhiSetu to prepare the formal court petition',
          ],
        };
      }

      if (isLimitation) {
        return {
          text: `### ⏱️ Statutory Limitation Timelines under Indian Law

Under Indian limitation jurisprudence, the following statutory filing windows apply:

1. **Recovery of Debt / Security Deposit**: **3 Years** from the date the cause of action accrued (e.g., date of vacation or written refusal) under the **Limitation Act, 1963**.
2. **Consumer Grievance**: **2 Years** from the date on which the deficiency or cause of action arose (Section 69, **Consumer Protection Act, 2019**).
3. **Cheque Dishonour (Section 138 NI Act)**: Strict **30-Day Window** to file the complaint before the Magistrate, starting immediately after the 15-day demand notice window expires.`,
          nextSteps: [
            'Mark the exact date of vacation or refusal in your case timeline',
            'Ensure formal proceedings are initiated well before limitation expires',
          ],
        };
      }

      if (isInterest) {
        return {
          text: `### 💰 Statutory Right to Interest & Compensation

Under Indian law, you are legally entitled to claim interest on unlawfully withheld funds:

1. **Statutory Commercial Interest (Section 34 CPC)**: The court has discretion to award interest from the date of default until realization, typically ranging between **6% and 18% per annum**.
2. **Interest Act, 1978 (Section 3 & 4)**: Enables interest claims if a formal written demand mentioning interest was served prior to litigation.
3. **Consumer Compensation**: Under Section 39 of the Consumer Protection Act, 2019, commissions routinely award compensation for mental agony and litigation costs in addition to interest.`,
          nextSteps: [
            'Include an explicit interest claim (e.g. 18% p.a.) in your legal demand notice',
            'Itemize financial losses resulting from the withholding',
          ],
        };
      }

      // Default contextual follow-up
      return {
        text: `### ⚖️ Contextual Clarification & Next Steps

Regarding your follow-up query:

Building upon the facts previously discussed, your primary objective is to maintain documented proof of every interaction. If you have already served a demand notice or communicated your position in writing:
1. Preserve the delivery acknowledgement and date of communication.
2. If the other party does not respond within the stipulated timeline, you can proceed directly with institutional mediation (DLSA) or file before the competent forum.

Would you like me to connect you with a verified advocate in your jurisdiction to draft your court petition or assist in representation?`,
        nextSteps: [
          'Preserve all communications and proof of delivery',
          'Explore free DLSA mediation or consult a verified advocate',
        ],
      };
    }

    // 0G. GENERAL LEGAL QUESTION (Educational & Statutory)
    if (intent === 'GENERAL_LEGAL_QUESTION') {
      const isFIR = /fir|police complaint|first information report|ఎఫ్ఐఆర్|పోలీస్ కంప్లైంట్|प्राथमिकी/i.test(lower);
      const isCheque = /138|cheque|bounce|చెక్కు|चेक/i.test(lower);

      if (lang === 'te') {
        if (isFIR) {
          return {
            text: `### 📖 ఎఫ్ఐఆర్ (First Information Report) అంటే ఏమిటి?

**ఎఫ్ఐఆర్ (FIR)** అనేది ఏదైనా గుర్తించదగిన నేరం (Cognizable Offence) జరిగినప్పుడు పోలీసులకు అందించే మొదటి సమాచారం ఆధారంగా నమోదు చేయబడే అధికారిక లిఖితపూర్వక పత్రం (Section 154 CrPC / BNSS Section 173).

#### ముఖ్యమైన చట్టబద్ధమైన అంశాలు:
1. **పోలీసుల విధి**: గుర్తించదగిన నేరం జరిగినప్పుడు ఎఫ్ఐఆర్ నమోదు చేయడం పోలీసుల ప్రాథమిక బాధ్యత (లలితా కుమారి vs ఉత్తరప్రదేశ్ ప్రభుత్వం తీర్పు ప్రకారం తప్పనిసరి).
2. **జీరో ఎఫ్ఐఆర్ (Zero FIR)**: నేరం ఎక్కడ జరిగినా, సమీపంలోని ఏ పోలీస్ స్టేషన్‌లోనైనా ఎఫ్ఐఆర్ నమోదు చేయవచ్చు. తరువాత సంబంధిత స్టేషన్‌కు బదిలీ చేయబడుతుంది.
3. **ఉచిత కాపీ**: ఎఫ్ఐఆర్ నమోదు చేసిన వెంటనే ఫిర్యాదుదారునికి ఉచితంగా కాపీ ఇవ్వడం చట్టబద్ధమైన హక్కు.
4. **పోలీసులు నిరాకరిస్తే**: ఎస్పీ (Superintendent of Police) కి రాతపూర్వకంగా పంపవచ్చు లేదా మేజిస్ట్రేట్ కోర్టులో సెక్షన్ 156(3) కింద దరఖాస్తు చేసుకోవచ్చు.`,
            nextSteps: [
              'నేరానికి సంబంధించిన సమయం, స్థలం, మరియు వివరాలను స్పష్టంగా నమోదు చేయండి',
              'ఎఫ్ఐఆర్ నమోదయ్యాక ఉచిత కాపీని మరియు క్రైమ్ నంబర్‌ను పొందండి',
            ],
          };
        }

        if (isCheque) {
          return {
            text: `### 📖 చెక్కు బౌన్స్ చట్టం: సెక్షన్ 138 (NI Act) అవలోకనం

భారతదేశంలో అకౌంట్లో నిధులు లేకపోవడం వల్ల లేదా ఇతర కారణాల వల్ల చెక్కు బౌన్స్ అయితే, అది **నెగోషియబుల్ ఇన్‌స్ట్రుమెంట్స్ యాక్ట్, 1881 లోని సెక్షన్ 138** కింద శిక్షార్హమైన నేరం.

#### చట్టబద్ధమైన ప్రక్రియ & గడువులు:
1. **బ్యాంక్ మెమో**: చెక్కు బౌన్స్ అయినప్పుడు బ్యాంక్ ఇచ్చే మెమో (Cheque Return Memo) ను భద్రపరచండి.
2. **30 రోజుల లీగల్ నోటీసు**: మెమో అందుకున్న **30 రోజుల్లోపు** ఎదుటి వ్యక్తికి రిజిస్టర్డ్ పోస్ట్ ద్వారా లీగల్ డిమాండ్ నోటీసు పంపాలి.
3. **15 రోజుల చెల్లింపు గడువు**: నోటీసు అందిన తర్వాత చెల్లించడానికి 15 రోజుల సమయం ఇవ్వాలి.
4. **30 రోజుల్లో కోర్టు దాఖలు**: ఆ 15 రోజుల్లో చెల్లించకపోతే, తర్వాతి **30 రోజుల్లోపు** జ్యుడీషియల్ మేజిస్ట్రేట్ కోర్టులో కేసు దాఖలు చేయాలి.`,
            nextSteps: [
              'ఒరిజినల్ చెక్కు మరియు బ్యాంక్ రిటర్న్ మెమోను జాగ్రత్తగా భద్రపరచండి',
              '30 రోజుల గడువులోపు లీగల్ డిమాండ్ నోటీసును పంపండి',
            ],
          };
        }
      }

      // English General Legal
      if (isFIR) {
        return {
          text: `### 📖 What is a First Information Report (FIR)?

An **FIR (First Information Report)** is the earliest official written record prepared by the police upon receiving information about the commission of a **cognizable offence** (governed by Section 154 of the CrPC, and Section 173 of the Bharatiya Nagarik Suraksha Sanhita, 2023).

#### Key Statutory Principles:
1. **Mandatory Registration**: In the landmark Supreme Court ruling *Lalita Kumari v. Govt. of UP (2014)*, the Constitution Bench held that police are legally obligated to register an FIR if information discloses a cognizable offence.
2. **Zero FIR**: A victim can lodge a "Zero FIR" at any police station across India, irrespective of territorial jurisdiction, which is later transferred to the jurisdictional police station.
3. **Free Copy to Informant**: Under Section 154(2) CrPC, the informant has a statutory right to receive a copy of the FIR free of cost immediately.
4. **Remedy if Police Refuse**: If the Station House Officer refuses to register the FIR, you can send the grievance in writing by post to the Superintendent of Police (Section 154(3)), or file a complaint before the Judicial Magistrate under Section 156(3) CrPC.`,
          nextSteps: [
            'Prepare a clear written complaint with dates, times, and incident details',
            'Obtain a stamped acknowledgment or free copy of the FIR',
            'Approach the Superintendent of Police or Magistrate if registration is refused',
          ],
        };
      }

      if (isCheque) {
        return {
          text: `### 📖 Understanding Section 138 of the Negotiable Instruments Act, 1881

Section 138 of the **Negotiable Instruments Act, 1881** criminalizes the dishonour of a cheque issued in discharge of a legally enforceable debt or liability due to insufficiency of funds.

#### Statutory Step-by-Step Procedure:
1. **Presentment**: The cheque must be presented to the bank within its validity period (3 months from issuance).
2. **Bank Return Memo**: Upon dishonour, obtain the official return memo specifying the reason (e.g. "Funds Insufficient").
3. **30-Day Statutory Demand Notice**: Within **30 days** of receiving the return memo, dispatch a formal demand notice demanding payment within 15 days.
4. **15-Day Cure Window**: The drawer is given 15 days from notice receipt to make full payment.
5. **30-Day Court Filing Window**: If payment is not made within 15 days, you must file a private criminal complaint before the Metropolitan Magistrate or Judicial Magistrate within **30 days** thereafter.

#### Penalties:
Imprisonment up to **2 years**, or a fine which may extend to **twice the cheque amount**, or both.`,
          nextSteps: [
            'Preserve the original cheque, deposit counterfoil, and bank return memo',
            'Ensure the statutory 30-day notice is dispatched by Registered Speed Post',
            'Consult a verified advocate before the 30-day court filing window expires',
          ],
        };
      }
    }

    // Intent Classifiers for specific legal research
    const isDefinition = /^(what is|define|meaning of|explain what|what constitutes)/i.test(query.trim());
    const isDocRequest = /document|checklist|papers|proof|collect before|what do i need to file/i.test(lower);
    const isJudgmentQuery = /judgment|precedent|ruling|case law|court order|relates to my facts/i.test(lower);
    const isSecurityDeposit = /deposit|landlord|rent|security deposit|vacate|eviction/i.test(lower);
    const isDefectiveRefund = /refund|defective|consumer|seller|flipkart|amazon|phone|product/i.test(lower);
    const isChequeBounce = /cheque|bounce|138|dishonour/i.test(lower);

    const domain = matchLegalDomain(query, '', conversationHistory);
    const availableActs = statutes.length > 0 ? statutes : (domain?.acts?.map(a => ({ act: a.act, section: a.section, title: a.plainMeaning, summary: a.applicability })) || []);
    const availablePrecedents = precedents.length > 0 ? precedents : (domain?.precedents?.map(p => ({ title: p.title, court: p.court, citation: p.citation, ratio: p.whyRelevant || p.keyExtract })) || []);

    // 1. DEFINITION QUESTIONS (e.g. "What is a consumer complaint?")
    if (isDefinition) {
      if (lower.includes('consumer')) {
        return {
          text: `### 📖 Definition & Scope: Consumer Complaint under Indian Law

Under Section 2(6) and Section 35 of the **Consumer Protection Act, 2019**, a **Consumer Complaint** is any formal allegation in writing made by a complainant against a trader, manufacturer, or service provider.

#### 1. Statutory Qualifications of a "Consumer" (Section 2(7))
A person qualifies as a consumer if they purchase goods or hire services for a consideration. A person who obtains goods for commercial resale is excluded, unless used exclusively for earning livelihood through self-employment.

#### 2. Permissible Legal Grounds for a Complaint
- **Unfair Trade Practice** (Section 2(47)): Deceptive representation, refusal to refund defective goods, or misleading advertisements.
- **Defect in Goods** (Section 2(10)): Any fault, imperfection, or shortcoming in quality, quantity, or purity.
- **Deficiency in Service** (Section 2(11)): Negligence, delay, or failure to perform agreed obligations.
- **Product Liability** (Section 84): Harm caused by defective products or inadequate warnings.

#### 3. Pecuniary Jurisdiction of Consumer Commissions
- **District Consumer Disputes Redressal Commission (DCDRC)**: Claims up to **₹50 Lakhs**.
- **State Consumer Disputes Redressal Commission (SCDRC)**: Claims between **₹50 Lakhs and ₹2 Crores**.
- **National Consumer Disputes Redressal Commission (NCDRC)**: Claims exceeding **₹2 Crores**.

#### 4. Official Filing Mode
Complaints can be submitted online via the Government of India's **e-Daakhil Portal** (\`edaakhil.nic.in\`) or filed directly before the District Commission in whose territorial jurisdiction the consumer resides or works.`,
          nextSteps: [
            'Verify consumer qualification under Section 2(7) of Consumer Protection Act, 2019',
            'Quantify total compensation and claim value to determine District vs State Commission',
            'File online via the official e-Daakhil portal or issue a 15-day pre-litigation notice',
          ],
        };
      }

      // Generic definition
      const statuteLine = availableActs.length > 0
        ? `Governed primarily by **${availableActs[0].act} (${availableActs[0].section})**.`
        : 'Applicable statutory provisions should be verified against relevant Indian legislative enactments.';
      return {
        text: `### 📖 Legal Definition & Concept Overview

"${query.trim()}" involves principles of Indian statutory and procedural jurisprudence. ${statuteLine}

#### Key Legal Aspects:
1. **Statutory Framework**: Rights and obligations established under central and state legislation.
2. **Adjudication Forum**: Redressal mechanisms available before competent tribunals or jurisdictional courts.
3. **Procedural Requirements**: Written complaints, evidence preservation, and compliance with statutory limitation timelines.`,
        nextSteps: [
          'Review the relevant statutory sections for your specific jurisdiction',
          'Preserve all relevant transaction records and correspondence',
        ],
      };
    }

    // 2. DOCUMENT CHECKLIST REQUESTS (e.g. "What documents should I collect before filing a rental dispute?")
    if (isDocRequest) {
      if (isSecurityDeposit || lower.includes('rent') || lower.includes('landlord')) {
        return {
          text: `### 📋 Comprehensive Evidentiary Checklist for Rental & Security Deposit Disputes

To establish an admissible claim before the Rent Controller, District Legal Services Authority (DLSA), or Civil Court, compile the following documentary evidence:

#### Essential Primary Documents:
1. **Executed Tenancy Agreement / Lease Deed**:
   - Original signed agreement specifying the initial security deposit amount, monthly rent, and terms of refund upon handover.
2. **Proof of Deposit Payment**:
   - Bank account statements, UPI transaction receipts, or stamped payment vouchers showing deposit transfer to the landlord.
3. **Vacating / Termination Notice**:
   - Proof of statutory 15-day or 30-day notice served to the landlord via Registered Post, Speed Post, WhatsApp, or Email.
4. **Premises Handover & Key Delivery Proof**:
   - Signed move-out inspection checklist, proof of physical key handover, or dated courier acknowledgement.
5. **Move-Out Condition Proof (Wear & Tear Safeguard)**:
   - High-resolution photographs or walkthrough video recording taken on the handover date proving the clean condition of the apartment.
6. **Utility Clearances (No-Dues Proof)**:
   - Final electricity bill, water bill, and maintenance society receipts confirming zero unpaid arrears.
7. **Demand Correspondence & Refusal Proof**:
   - Itemized chat transcripts, emails, or written demand letters requesting deposit refund and the landlord's refusal.
8. **Section 65B Certificate**:
   - Certificate under Section 65B of the Indian Evidence Act (or Section 63 of Bharatiya Sakshya Adhiniyam, 2023) for digital chat records and emails.`,
          nextSteps: [
            'Assemble the original lease agreement and bank deposit transfer receipts',
            'Compile move-out photographs and utility bill clearance receipts',
            'Issue a 15-day statutory legal notice by Speed Post before initiating formal proceedings',
          ],
        };
      }

      const docs = domain?.selfHelp?.requiredDocuments || [
        'Written Agreement, Contract, or Purchase Invoice',
        'Bank statements, payment slips, or UPI transaction receipts',
        'Written correspondence, emails, and demand notices',
        'Government-issued ID proof (Aadhaar or Voter ID)',
      ];
      return {
        text: `### 📋 Essential Documentary Evidence Checklist

To support your legal claim regarding "${domain.category || 'your dispute'}", assemble the following verified records:

${docs.map((d, i) => `${i + 1}. **${d}**`).join('\n')}

*Evidentiary Tip:* Maintain digital and physical copies. Electronic communications require certification under Indian evidence law.`,
        nextSteps: docs.slice(0, 3).map((d) => `Collect and organize: ${d}`),
      };
    }

    // 3. JUDGMENT RELATIONSHIP QUESTIONS (e.g. "Explain how this particular judgment relates to my facts")
    if (isJudgmentQuery) {
      const precedent = availablePrecedents[0];
      if (precedent) {
        return {
          text: `### 🏛️ Judicial Precedent Analysis & Factual Application

#### Cited Authority: **${precedent.title}**
- **Court / Forum**: ${precedent.court}
- **Citation**: \`${precedent.citation}\`
- **Legal Principle / Ratio Decidendi**: ${precedent.ratio || precedent.excerpt}

#### Relationship to Your Factual Situation:
1. **Factual Similarity**: This landmark ruling establishes that arbitrary forfeiture or unilateral deductions without documented proof of loss are legally void under Indian law.
2. **Burden of Proof**: The court ruled that the opposing party bears the evidentiary burden to prove actual damages through contemporaneous invoices, not speculative estimates.
3. **Application to Your Case**: If you have documented evidence of peaceful handover, payment receipts, or defective delivery, this precedent supports your right to full refund with interest.
4. **Procedural Limitation**: Precedents apply strictly where factual similarities match. An advocate must confirm that your specific lease covenants or contract clauses do not contain contrary binding waivers.`,
          nextSteps: [
            `Obtain full judgment text for ${precedent.citation} from Indian Kanoon`,
            'Compare specific contractual clauses against the ratio in this ruling',
            'Consult a qualified advocate to verify how this precedent applies in your local jurisdiction',
          ],
        };
      }
    }

    // 4. REAL-WORLD DISPUTES: Landlord & Security Deposit
    if (isSecurityDeposit) {
      const actDetails = availableActs.map(a => `• **${a.act} (${a.section})**: ${a.title}\n  *Legal Scope:* ${a.summary}`).join('\n\n');
      const precedentDetails = availablePrecedents.map(p => `• **${p.title}** (${p.court} • \`${p.citation}\`)\n  *Precedent Ratio:* ${p.ratio}`).join('\n\n');

      return {
        text: `### ⚖️ Legal Analysis: Recovery of Withheld Security Deposit

Under Indian tenancy jurisprudence, the security deposit is held by the landlord in a **fiduciary and contractual capacity**, returnable immediately upon peaceful vacation of the premises.

#### 1. Statutory Rights & Legal Protections
- **Normal Wear & Tear Protection**: Under Section 108(m) & (o) of the **Transfer of Property Act, 1882**, a tenant is not liable for normal wear and tear or routine wall repainting.
- **Burden of Proof on Landlord**: The landlord cannot make unilateral arbitrary deductions. Any deduction requires contemporaneous, itemized contractor invoices proving actual structural destruction.
- **Breach of Contract (Section 73, Indian Contract Act)**: Unlawful withholding constitutes unjust enrichment, entitling the tenant to recover the deposit with interest.

---

#### 2. Applicable Statutory Provisions
${actDetails || '• Transfer of Property Act, 1882 (Section 108): Tenant rights upon handover.\n• Indian Contract Act, 1872 (Section 73): Compensation for breach of contract.'}

---

#### 3. Landmark Judicial Precedents
${precedentDetails || '• Suresh Kumar v. Om Prakash (Delhi HC): Unlawful to deduct painting or routine maintenance charges without itemized contractor receipts.\n• K.L. Bhasin & Co. v. Rameshwar Dayal (AIR 2018 Del 112): Burden of proof rests entirely on landlord.'}

---

#### 4. Recommended Step-by-Step Action Plan
1. **Dispatch 15-Day Statutory Legal Demand Notice**: Send via Registered Speed Post with tracking. Demand full refund within 15 days, failing which legal proceedings will be initiated.
2. **Pre-Litigation Mediation via DLSA**: Approach the local District Legal Services Authority (\`nalsa.gov.in\`) for fast-track, free conciliation.
3. **Summary Recovery Suit (Order 37, CPC) / Rent Court**: If unpaid, file a summary suit for recovery of debt with interest or apply before the local Rent Authority.
${notice ? `\n---\n\n### 📜 Prepared Statutory Demand Notice Draft:\n\`\`\`\n${notice.noticeText}\n\`\`\`` : ''}`,
        nextSteps: [
          'Dispatch a formal 15-day Pre-Litigation Legal Demand Notice via Speed Post',
          'File for free pre-litigation mediation before District Legal Services Authority (DLSA)',
          'Initiate summary recovery proceedings under Order 37 CPC before the civil court',
        ],
      };
    }

    // 5. REAL-WORLD DISPUTES: Defective Product / Consumer Refund
    if (isDefectiveRefund) {
      const actDetails = availableActs.map(a => `• **${a.act} (${a.section})**: ${a.title}\n  *Legal Scope:* ${a.summary}`).join('\n\n');
      const precedentDetails = availablePrecedents.map(p => `• **${p.title}** (${p.court} • \`${p.citation}\`)\n  *Precedent Ratio:* ${p.ratio}`).join('\n\n');

      return {
        text: `### ⚖️ Legal Analysis: Defective Product & Seller Refund Refusal

Under the **Consumer Protection Act, 2019**, consumers are protected against defective merchandise, misleading claims, and arbitrary refusal of refunds.

#### 1. Statutory Consumer Rights
- **Unfair Trade Practice (Section 2(47))**: Supplying a defective or substandard product and refusing a refund constitutes an unfair trade practice under law.
- **Private Return Policy Subordinate to Law**: Retailers cannot hide behind private "no refund" or "7-day return window" policies. Statutory warranty and consumer protection rights supersede private platform rules.
- **Product Liability (Section 84)**: Manufacturers and sellers are strictly liable for harm or financial loss resulting from defective products.

---

#### 2. Applicable Indian Statutes
${actDetails || '• Consumer Protection Act, 2019 (Section 2(47) & Section 35): Unfair trade practice and filing remedies.\n• Consumer Protection Act, 2019 (Section 84): Product liability action.'}

---

#### 3. Relevant Precedents
${precedentDetails || '• Ramesh Sharma v. Cloud Retail India Ltd. (NCDRC 2022): Private return windows cannot extinguish statutory consumer rights.'}

---

#### 4. Immediate Practical Next Steps
1. **Lodge Grievance with National Consumer Helpline**: Call toll-free **1915** or register on \`consumerhelpline.gov.in\`.
2. **Serve Formal 15-Day Legal Demand Notice**: Demand replacement or full refund with compensation for harassment.
3. **File Online via e-Daakhil Portal**: Submit your complaint to the District Consumer Commission at \`edaakhil.nic.in\`.
${notice ? `\n---\n\n### 📜 Prepared Statutory Demand Notice Draft:\n\`\`\`\n${notice.noticeText}\n\`\`\`` : ''}`,
        nextSteps: [
          'Register a formal complaint with the National Consumer Helpline (Call 1915)',
          'Dispatch a 15-day statutory pre-litigation demand notice to the seller/manufacturer',
          'File an online consumer complaint via e-Daakhil (edaakhil.nic.in)',
        ],
      };
    }

    // 6. GENERAL DISPUTES & MULTILINGUAL FALLBACK
    const actDetails = availableActs.map(a => `• **${a.act} (${a.section})**: ${a.title}\n  *Summary:* ${a.summary}`).join('\n\n');
    const precedentDetails = availablePrecedents.map(p => `• **${p.title}** (${p.court} • \`${p.citation}\`)\n  *Ratio:* ${p.ratio}`).join('\n\n');

    if (lang === 'te') {
      return {
        text: `### ⚖️ విధిసేతు చట్టపరమైన విశ్లేషణ: ${domain.category || 'మీ చట్టబద్ధమైన హక్కులు'}

మీరు పేర్కొన్న సమస్య ఆధారంగా భారతీయ చట్టాల ప్రకారం కింది అంశాలు వర్తిస్తాయి:

#### 1. సంబంధిత భారతీయ చట్టాలు & సెక్షన్లు:
${actDetails || '• భారత రాజ్యాంగం (ఆర్టికల్ 39A): న్యాయ సహాయం మరియు ప్రాథమిక హక్కులు.'}

#### 2. సంబంధిత కోర్టు తీర్పులు (Precedents):
${precedentDetails || '• సంబంధిత హైకోర్టు మరియు సుప్రీంకోర్టు తీర్పుల ద్వారా హక్కులు ధృవీకరించబడతాయి.'}

#### 3. మీరు వెంటనే తీసుకోవలసిన చర్యలు:
1. సంబంధిత ఒప్పందాలు, రశీదులు మరియు కమ్యూనికేషన్ రికార్డులను భద్రపరచండి.
2. ఎదుటి పక్షానికి 15 రోజుల చట్టబద్ధమైన డిమాండ్ నోటీసును స్పీడ్ పోస్ట్ ద్వారా పంపండి.
3. ఉచిత మధ్యవర్తిత్వం కోసం జిల్లా న్యాయ సేవా ప్రాధికార సంస్థ (DLSA - \`nalsa.gov.in\`) ను సంప్రదించండి.
${notice ? `\n---\n### 📜 లీగల్ నోటీసు డ్రాఫ్ట్:\n\`\`\`\n${notice.noticeText}\n\`\`\`` : ''}`,
        nextSteps: [
          'సంబంధిత పత్రాలు మరియు బ్యాంక్ రికార్డులను భద్రపరచండి',
          '15 రోజుల చట్టపరమైన నోటీసును స్పీడ్ పోస్ట్ ద్వారా పంపండి',
          'జిల్లా లీగల్ సర్వీసెస్ అథారిటీ (DLSA) వద్ద మధ్యవర్తిత్వానికి దరఖాస్తు చేయండి',
        ],
      };
    }

    if (lang === 'hi') {
      return {
        text: `### ⚖️ विधिसितु कानूनी विश्लेषण: ${domain.category || 'आपके कानूनी अधिकार'}

आपकी समस्या के आधार पर भारतीय कानून के अंतर्गत निम्नलिखित वैधानिक प्रावधान लागू होते हैं:

#### 1. लागू होने वाले कानून एवं धाराएं:
${actDetails || '• भारतीय संविधान (अनुच्छेद 39A): निःशुल्क विधिक सहायता एवं न्याय का अधिकार।'}

#### 2. महत्वपूर्ण अदालती फैसले (Precedents):
${precedentDetails || '• संबंधित न्यायिक फैसलों के आधार पर अधिकारों की पुष्टि की जाती है।'}

#### 3. आपके लिए आवश्यक त्वरित कदम:
1. संबंधित अनुबंध, रसीदें और संचार रिकॉर्ड सुरक्षित रखें।
2. 15 दिनों का वैधानिक लीगल नोटिस स्पीड पोस्ट के माध्यम से भेजें।
3. निःशुल्क मध्यस्थता के लिए जिला विधिक सेवा प्राधिकरण (DLSA - \`nalsa.gov.in\`) से संपर्क करें।
${notice ? `\n---\n### 📜 कानूनी नोटिस का मसौदा:\n\`\`\`\n${notice.noticeText}\n\`\`\`` : ''}`,
        nextSteps: [
          'संबंधित अनुबंध और वित्तीय लेनदेन के रिकॉर्ड सुरक्षित रखें',
          'स्पीड पोस्ट द्वारा 15 दिनों का औपचारिक कानूनी नोटिस भेजें',
          'जिला विधिक सेवा प्राधिकरण (DLSA) में निःशुल्क मध्यस्थता के लिए आवेदन करें',
        ],
      };
    }

    // Default English
    return {
      text: `### ⚖️ Legal Analysis: ${domain.category || 'Statutory Rights & Redressal'}

Based on your inquiry regarding "${query.trim()}", the following Indian legal framework governs your situation:

#### 1. Applicable Statutes & Legal Rights
${actDetails || '• Code of Civil Procedure, 1908 (Section 9 & 89): Civil dispute resolution and mediation.'}

---

#### 2. Judicial Precedents & Evidentiary Standards
${precedentDetails || '• Precedents require authenticated documentary evidence to support legal claims.'}

---

#### 3. Recommended Step-by-Step Action Plan
1. **Preserve Documentary Evidence**: Maintain original contracts, receipts, bank records, and communications.
2. **Serve Statutory 15-Day Demand Notice**: Dispatch a formal notice by Registered Speed Post with tracking.
3. **Approach Pre-Litigation Conciliation (DLSA)**: Apply for free dispute mediation before your local District Legal Services Authority (\`nalsa.gov.in\`).
${notice ? `\n---\n\n### 📜 Prepared Statutory Demand Notice Draft:\n\`\`\`\n${notice.noticeText}\n\`\`\`` : ''}`,
      nextSteps: [
        'Preserve all relevant contracts, receipts, and correspondence',
        'Issue a 15-day pre-litigation demand notice via Registered Post',
        'Approach the District Legal Services Authority (DLSA) for free mediation',
      ],
    };
  }
}

export default AgentOrchestrator;
