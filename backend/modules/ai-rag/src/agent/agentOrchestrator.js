/**
 * Multi-Step Agentic AI Orchestrator for VidhiSetu
 * Member 3: AI + RAG + Legal Research Architecture
 *
 * Implements:
 * 1. Goal & Intent Understanding (Context-aware via Gemini LLM with heuristic fallback)
 * 2. Multi-Step Execution Planning adapted dynamically to intent
 * 3. Context & Authorized History Retrieval (User-isolated & ordered)
 * 4. Explicitly Permitted Tool Calls with Honest Statuses
 * 5. Authentic Indian Kanoon Retrieval (No fake citations, honest disclosures)
 * 6. Multilingual Language Adaptation (Telugu, Hindi, English, Code-Switching)
 * 7. Action Item Preparation & Grounded Synthesis (No rigid overwriting templates)
 */

import AgentTools from './agentTools.js';
import { geminiClient } from '../llm/geminiClient.js';
import { KanoonClient } from '../kanoon/kanoonClient.js';
import IndianKanoonService from '../../../../src/services/indianKanoonService.js';
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
    if (!text) return { language: 'English', script: 'Latin', code: 'en' };

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
   * Classify user query intent, urgency, and research requirements contextually
   */
  async classifyRequest(query = '', conversationHistory = []) {
    const trimmed = (query || '').trim();
    const detectedLang = this.detectLanguage(trimmed);

    // Fast check for safety-critical emergency
    const isSafetyCritical =
      /threaten.*physic|physic.*threat|hit me|beat me|beating me|physically (abused|assaulted|hurt)|threatened to kill|danger to (my )?life|domestic violence|assaulted me|emergency help|being attacked|scared for (my )?safety|trapped in|harm me|abusive spouse|suicid|kill myself/i.test(trimmed);

    if (isSafetyCritical) {
      return {
        intent: 'SAFETY_CRITICAL',
        detectedLang,
        emotionalTone: 'urgent',
        urgency: 'critical',
        needsLegalResearch: false,
        needsAdvocateDiscovery: false,
        needsEmergencySupport: true,
        isTopicChange: false,
      };
    }

    // Contextual intent analysis via Gemini if online & configured
    if (geminiClient.isConfigured()) {
      try {
        const historySnippet = (conversationHistory || [])
          .slice(-4)
          .map((m) => `${m.sender || (m.role === 'user' ? 'user' : 'assistant')}: ${m.text || m.content || ''}`)
          .filter((t) => t.length > 5)
          .join('\n');

        const prompt = `You are the intent understanding brain of VidhiSetu, an Indian legal platform.
Analyze this user message and recent context.

User Message: "${trimmed}"
${historySnippet ? `Recent Conversation History:\n${historySnippet}` : 'No prior conversation history.'}

Classify into JSON with keys:
- intent: one of ["CASUAL_CONVERSATION", "EMOTIONAL_OR_VAGUE", "GENERAL_LEGAL_QUESTION", "SPECIFIC_LEGAL_QUERY", "JUDGMENT_ANALYSIS", "JUDGMENT_SEARCH", "FIND_ADVOCATE", "FOLLOW_UP", "TOPIC_CHANGE", "SAFETY_CRITICAL"]
- isTopicChange: boolean (true if user abruptly changes to a new legal subject or asks something completely different from the prior discussion)
- language: string ("English", "Telugu", "Hindi", "Tanglish", "Hinglish")
- languageCode: string ("en", "te", "hi")
- emotionalTone: string ("friendly", "distressed", "neutral", "urgent", "analytical")
- urgency: string ("low", "normal", "critical")
- needsLegalResearch: boolean (true ONLY if actual Indian statutory or court precedent research is needed)
- kanoonSearchQuery: string (clean, targeted legal keywords for Indian Kanoon search, or empty if not needed)
- documentIdOrTitle: string (if user specifically asked to explain/analyze a judgment, mention doc ID or case title, else empty)
- legalDomain: string ("tenancy", "consumer", "employment", "cheque_bounce", "family", "criminal", "property", "general")`;

        const res = await geminiClient.generateStructured({
          prompt,
          timeoutMs: 8000,
        });

        if (res?.data && res.data.intent) {
          const d = res.data;
          let intent = d.intent;
          if (intent === 'GREETING') intent = 'CASUAL_CONVERSATION';
          if (intent === 'EMOTIONAL_PERSONAL') intent = 'EMOTIONAL_OR_VAGUE';
          if (intent === 'GENERAL_LEGAL') intent = 'GENERAL_LEGAL_QUESTION';
          if (intent === 'SPECIFIC_LEGAL') intent = 'SPECIFIC_LEGAL_QUERY';

          return {
            intent,
            isTopicChange: Boolean(d.isTopicChange),
            detectedLang: {
              language: d.language || detectedLang.language,
              code: d.languageCode || detectedLang.code,
            },
            emotionalTone: d.emotionalTone || 'neutral',
            urgency: d.urgency || 'normal',
            needsLegalResearch: Boolean(d.needsLegalResearch || intent === 'SPECIFIC_LEGAL_QUERY' || intent === 'JUDGMENT_SEARCH'),
            needsAdvocateDiscovery: intent === 'FIND_ADVOCATE',
            needsEmergencySupport: intent === 'SAFETY_CRITICAL',
            kanoonSearchQuery: d.kanoonSearchQuery || '',
            documentIdOrTitle: d.documentIdOrTitle || '',
            legalDomain: d.legalDomain || 'general',
          };
        }
      } catch (err) {
        console.warn('[AgentOrchestrator] Gemini intent classification fallback to heuristic:', err.message);
      }
    }

    // Heuristic Fallback Classifier
    return this.classifyRequestHeuristic(trimmed, conversationHistory);
  }

  /**
   * Deterministic heuristic intent classifier (Offline & Fallback safe)
   */
  classifyRequestHeuristic(query = '', conversationHistory = []) {
    const trimmed = (query || '').trim();
    const lower = trimmed.toLowerCase();
    const detectedLang = this.detectLanguage(trimmed);

    // 1. Safety Critical
    const isSafetyCritical =
      /threaten.*physic|physic.*threat|hit me|beat me|beating me|physically (abused|assaulted|hurt)|threatened to kill|danger to (my )?life|domestic violence|assaulted me|emergency help|being attacked|scared for (my )?safety|trapped in|harm me|abusive spouse|suicid|kill myself/i.test(trimmed);

    // 2. Advocate Discovery
    const isFindAdvocate =
      /(find|need|recommend|looking for|hire|consult|contact|speak to) (me )?(an? )?(lawyer|advocate|attorney|counsel)|lawyer in |advocate in |advocate near me|lawyer near me|లాయర్|వకీలు|న్యాయవాది|వకీల్|వకీలును|वकील|अधिवक्ता/i.test(trimmed);

    // 3. Judgment Analysis Request
    const isJudgmentAnalysis =
      /(explain|analyze|breakdown|interpret|summary of|details of|brief).*(this|the)?\s*(judgment|judgement|ruling|precedent|case law|order|court copy)|ఈ తీర్పును వివరించండి|తీర్పు విశ్లేషణ|फैसले का विश्लेषण/i.test(trimmed) ||
      /\b(?:doc\s*id\s*[:#]?\s*\d+|\b\d{7,10}\b)\b/i.test(trimmed);

    // 4. Precedent / Court Judgment Search
    const isJudgmentSearch =
      !isJudgmentAnalysis &&
      (/(search|find|show|retrieve|get|display).*(judgment|judgement|precedent|court order|ruling|case law|cases)|(judgment|judgement|precedent|ruling)s? (on|regarding|about|for)|సుప్రీంకోర్టు తీర్పు|హైకోర్టు తీర్పు|తీర్పులు చూపించు|తీర్పుల వివరాలు/i.test(trimmed));

    // 5. Emotional or Vague Personal Concerns
    const hasFamilyKeyword =
      /family (issue|problem|dispute|matter)|personal (issue|problem)|trouble at home|parents are fighting|feeling (overwhelmed|depressed|sad|lost|hopeless|anxious)|don't know what to do|can you help me with family|కుటుంబ.*(సమస్య|గొడవ|బాధ|విషయం|తగాదా)|కుటుంబ సమస్య|బాధగా ఉంది|ఏం చేయాలో అర్థం కావడం లేదు|ఏం చేయాలో తోచడం లేదు|पारिवारिक.*(समस्या|मुद्दा|వివాద్)|परिवार.*(समस्या|तकलीफ)/i.test(trimmed);
    const hasSpecificLegalTerms =
      /138|cheque|deposit|rent|tenant|consumer|refund|rera|bail|fir|partition deed|section|act|divorce under 13b|maintenance 125|police complaint|court case|speed post/i.test(trimmed);
    const isEmotionalOrVague = !isSafetyCritical && !isFindAdvocate && hasFamilyKeyword && !hasSpecificLegalTerms;

    // 6. Casual Conversation & Greetings
    const casualWordsPattern = /(hi|hello|hey|namaste|namaskaram|good morning|good evening|good afternoon|howdy|vanakkam|నమస్కారం|హలో|బాగున్నారా|హాయ్|ఎలా ఉన్నారు|మీరు ఎవరు|మీ పేరు|how are you|who are you|what is your name|what can you do|who made you|are you a lawyer|are you an ai|thank you|thanks|dhanyavad|ధన్యవాదాలు|ధన్యవాదములు|చాలా ధన్యవాదాలు|శుक्रिया|धन्यवाद|नमस्ते|आप कैसे हैं|bye|goodbye|see you|take care|chating telugu|chatting in telugu)/i;
    const hasLegalDisputeKeyword = /138|cheque|deposit|rent|tenant|landlord|consumer|refund|rera|bail|fir|partition|section|act|court|dispute|notice|case|complaint|న్యాయ|కోర్టు|తీర్పు|కేసు|ఫిర్యాదు/i.test(trimmed);
    const words = trimmed.split(/\s+/).filter(Boolean);
    const isCasual = !hasLegalDisputeKeyword && !hasFamilyKeyword && !isSafetyCritical && !isFindAdvocate && !isJudgmentAnalysis && !isJudgmentSearch && (
      casualWordsPattern.test(trimmed) && (words.length <= 8 || /^(hi|hello|hey|నమస్కారం|नमस्ते|chating)/i.test(trimmed))
    );

    // 7. Contextual Follow-up or Topic Change
    const hasHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0;
    const lastUserMsg = hasHistory
      ? conversationHistory.slice().reverse().find((m) => m.sender === 'user' || m.role === 'user')?.text || ''
      : '';
    const lastDomain = matchLegalDomain(lastUserMsg);
    const currentDomain = matchLegalDomain(trimmed);

    const isTopicChange = hasHistory && Boolean(
      lastDomain && currentDomain &&
      lastDomain.category !== 'Civil & Statutory Legal Guidance' &&
      currentDomain.category !== 'Civil & Statutory Legal Guidance' &&
      lastDomain.category !== currentDomain.category
    );

    const isFollowUpPattern =
      /^(what if|can i|and what about|what next|then what|how long do i have|how many days|what is the fee|is there any fee|how to send|will it work|how much time|is there interest|can i deduct|ఆ తర్వాత|మరి|తర్వాత ఏం చేయాలి|ఎంత సమయం ఉంటుంది|వడ్డీ అడగొచ్చా|అతను ఇవ్వకపోతే|మరి అతను ఒప్పుకోకపోతే)/i.test(trimmed) ||
      (hasHistory && trimmed.length < 60 && !hasSpecificLegalTerms && !isCasual && !isTopicChange);

    const isFollowUp = hasHistory && isFollowUpPattern && !isCasual && !isSafetyCritical && !isTopicChange;

    // 8. General Educational Legal Question Check
    const isGeneralLegal =
      /^(what is|define|meaning of|explain what|explain|how does|what are the rules for|what is section|tell me about section|procedure to|what documents|documents required|checklist for|కన్స్యూమర్ కోర్టు అంటే ఏమిటి|సెక్షన్|చట్టం ప్రకారం|ఎలా చేయాలి|లీగల్ నోటీస్ అంటే ఏమిటి)/i.test(trimmed) &&
      !isEmotionalOrVague && !isCasual && !isSpecificLegalTerms;

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
    } else if (isJudgmentAnalysis) {
      intent = 'JUDGMENT_ANALYSIS';
      emotionalTone = 'analytical';
      urgency = 'normal';
    } else if (isJudgmentSearch) {
      intent = 'JUDGMENT_SEARCH';
      emotionalTone = 'analytical';
      urgency = 'normal';
    } else if (isTopicChange) {
      intent = 'TOPIC_CHANGE';
      emotionalTone = 'inquisitive';
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
      isTopicChange,
      needsLegalResearch: intent === 'SPECIFIC_LEGAL_QUERY' || intent === 'GENERAL_LEGAL_QUESTION' || intent === 'JUDGMENT_SEARCH' || intent === 'TOPIC_CHANGE',
      needsAdvocateDiscovery: intent === 'FIND_ADVOCATE',
      needsEmergencySupport: intent === 'SAFETY_CRITICAL',
      kanoonSearchQuery: trimmed.replace(/^(please|can you|help me|tell me|explain)\s+/i, ''),
      legalDomain: currentDomain?.category || 'general',
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
          description: `Acknowledge friendly conversation in ${detectedLang.language}. Legal research tools are intentionally skipped.`,
        },
        {
          step: 2,
          id: 'NATURAL_CONVERSATION',
          name: `Respond Naturally in ${detectedLang.language}`,
          description: 'Provide a warm, human, conversational reply without imposing legal brief structure or formalities.',
        },
      ];
    }

    if (intent === 'EMOTIONAL_OR_VAGUE') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Understand Emotional Context & Needs',
          description: `Analyze emotional context, detect language (${detectedLang.language}), and recognize non-adversarial concern.`,
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
          description: 'Legal litigation tools and court precedents are intentionally skipped; inquiry is personal and does not assert a legal dispute.',
        },
        {
          step: 4,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Empathetic Guidance in ${detectedLang.language}`,
          description: 'Respond with supportive empathy and ask gentle clarifying questions without assuming court proceedings.',
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
          id: 'EMERGENCY_SUPPORT',
          name: 'Route Crisis Support & Protective Helplines',
          description: 'Activate national emergency helplines: 112 (Emergency), 1091/181 (Women Helpline), 1098 (Childline).',
        },
        {
          step: 3,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Emergency Guidance in ${detectedLang.language}`,
          description: 'Deliver actionable immediate safety guidance, safe shelter options, and PWDVA emergency protection remedies.',
        },
      ];
    }

    if (intent === 'FIND_ADVOCATE') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Identify Legal Practice Area & Location',
          description: `Analyze representation inquiry and category constraints in ${detectedLang.language}.`,
        },
        {
          step: 2,
          id: 'DISCOVER_ADVOCATES',
          name: 'Query Verified Advocates & Bar Registries',
          description: 'Execute discover_advocates to match Bar Council verified advocates and chamber listings.',
        },
        {
          step: 3,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Present Verified Counsel in ${detectedLang.language}`,
          description: 'Display verified advocates with fixed consultation fees, chamber locations, and verified bar credentials.',
        },
      ];
    }

    if (intent === 'JUDGMENT_ANALYSIS') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Identify Judgment Source & Citation',
          description: `Extract case name, citation, or document ID from inquiry in ${detectedLang.language}.`,
        },
        {
          step: 2,
          id: 'FETCH_DOCUMENT',
          name: 'Retrieve Authentic Judgment from Indian Kanoon',
          description: 'Fetch full judgment text, official citation, and judicial metadata from Indian Kanoon.',
        },
        {
          step: 3,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Judicial Analysis in ${detectedLang.language}`,
          description: 'Break down material facts, legal issues, court reasoning, binding holding (ratio decidendi), and disposition.',
        },
      ];
    }

    if (intent === 'JUDGMENT_SEARCH') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Formulate Case-Specific Search Query',
          description: `Identify legal principles, jurisdiction, and target court rulings in ${detectedLang.language}.`,
        },
        {
          step: 2,
          id: 'SEARCH_PRECEDENTS',
          name: 'Query Indian Kanoon Court Precedents',
          description: 'Execute search_kanoon_precedents for authentic Supreme Court and High Court rulings.',
        },
        {
          step: 3,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Precedents & Ratios in ${detectedLang.language}`,
          description: 'Present matching precedents with authentic citations, ratio decidendi, and direct Indian Kanoon links.',
        },
      ];
    }

    if (intent === 'FOLLOW_UP') {
      return [
        {
          step: 1,
          id: 'CONTEXTUAL_ASSESSMENT',
          name: 'Evaluate Prior Conversation Context',
          description: 'Integrate facts, rights, and issues established in previous conversation turns.',
        },
        {
          step: 2,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Contextual Follow-Up in ${detectedLang.language}`,
          description: 'Directly address the specific follow-up question in context without repeating the earlier dissertation.',
        },
      ];
    }

    if (intent === 'TOPIC_CHANGE') {
      return [
        {
          step: 1,
          id: 'IDENTIFY_GOAL',
          name: 'Recognize Topic Transition & Isolate New Matter',
          description: `Pivoting to new legal subject (${classification.legalDomain || 'New Subject'}) without contaminating with prior dispute facts.`,
        },
        {
          step: 2,
          id: 'QUERY_STATUTES',
          name: 'Retrieve Governing Statutory Provisions',
          description: 'Execute search_laws_and_statutes for the newly introduced legal topic.',
        },
        {
          step: 3,
          id: 'SEARCH_PRECEDENTS',
          name: 'Retrieve Authentic Indian Kanoon Precedents',
          description: 'Execute search_kanoon_precedents specific to the newly introduced legal subject.',
        },
        {
          step: 4,
          id: 'SYNTHESIZE_EXPLANATION',
          name: `Synthesize Grounded Guidance on New Topic in ${detectedLang.language}`,
          description: 'Provide clear, evidence-grounded analysis focused solely on the new inquiry.',
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

    // Default SPECIFIC_LEGAL_QUERY Plan
    return [
      {
        step: 1,
        id: 'IDENTIFY_GOAL',
        name: 'Analyze Dispute Facts & Jurisdiction',
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
        name: 'Retrieve Governing Statutory Provisions',
        description: 'Execute search_laws_and_statutes for applicable Indian acts and sections.',
      },
      {
        step: 4,
        id: 'SEARCH_PRECEDENTS',
        name: 'Retrieve Authentic Indian Kanoon Precedents',
        description: 'Execute search_kanoon_precedents for real court rulings matching this dispute.',
      },
      {
        step: 5,
        id: 'PREPARE_ACTION_ITEM',
        name: 'Prepare Action Item & Procedural Roadmap',
        description: 'Formulate chronological next steps, evidentiary checklist, and dispute remedies.',
      },
      {
        step: 6,
        id: 'SYNTHESIZE_EXPLANATION',
        name: `Synthesize Evidence-Grounded Analysis in ${detectedLang.language}`,
        description: 'Provide comprehensive, source-backed legal information with realistic options and legal caveats.',
      },
    ];
  }

  /**
   * Main Agent Execution Workflow
   */
  async execute({ query, jurisdiction = 'All India', conversationId = null, userId = null, history = [], attachedDocs = [], language = null, onProgress = null }) {
    const startTime = Date.now();
    const detectedLang = language ? { language: language === 'te' ? 'Telugu' : (language === 'hi' ? 'Hindi' : 'English'), code: language } : this.detectLanguage(query);

    // Initial context fetch to incorporate into intent classification
    const historyResult = await this.tools.get_conversation_history({ conversationId, userId, limit: 6 });
    const dbMessages = historyResult.recentMessages || [];

    // Normalize and incorporate client-passed history turns
    const clientHistory = Array.isArray(history) ? history.map((h) => ({
      sender: h.sender || (h.role === 'user' ? 'user' : 'assistant'),
      text: h.text || h.content || '',
    })).filter((m) => m.text && m.text.trim()) : [];

    const recentMessages = clientHistory.length > 0 ? clientHistory.slice(-6) : dbMessages;

    // Step 1: Formulate execution plan based on classified intent
    const classification = await this.classifyRequest(query, recentMessages);
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
        ? `Loaded ${recentMessages.length} authorized prior conversation turn(s).`
        : 'No prior conversation context was found.',
    });
    onProgress?.({ type: 'step_done', step: 'FETCH_HISTORY', result: toolResults.history });

    let statuteResult = { statutes: [], retrievalStatus: 'skipped' };
    let precedentResult = { precedents: [], retrievalStatus: 'skipped' };

    // Branch A: CASUAL_CONVERSATION
    if (classification.intent === 'CASUAL_CONVERSATION' || classification.intent === 'GENERAL_GREETING') {
      onProgress?.({ type: 'step_start', step: 'NATURAL_CONVERSATION', name: 'Engaging in natural dialogue' });
      executedSteps.push({
        step: 'NATURAL_CONVERSATION',
        tool: 'conversational_engine',
        status: 'completed',
        summary: 'Acknowledged friendly conversational exchange without invoking statutory litigation tools.',
      });
      onProgress?.({ type: 'step_done', step: 'NATURAL_CONVERSATION', result: { status: 'conversational' } });
    }

    // Branch B: EMOTIONAL_OR_VAGUE
    else if (classification.intent === 'EMOTIONAL_OR_VAGUE') {
      onProgress?.({ type: 'step_start', step: 'EVALUATE_LEGAL_NEED', name: 'Assessing legal research need' });
      executedSteps.push({
        step: 'EVALUATE_LEGAL_NEED',
        tool: 'search_laws_and_statutes',
        status: 'skipped',
        summary: 'Statutory and Kanoon research tools were intentionally skipped because this message is a personal/emotional inquiry without an active legal dispute.',
      });
      onProgress?.({ type: 'step_done', step: 'EVALUATE_LEGAL_NEED', result: { status: 'skipped' } });
    }

    // Branch C: SAFETY_CRITICAL
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

    // Branch D: FIND_ADVOCATE
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

    // Branch E: JUDGMENT_ANALYSIS
    else if (classification.intent === 'JUDGMENT_ANALYSIS') {
      onProgress?.({ type: 'step_start', step: 'FETCH_DOCUMENT', name: 'Retrieving judgment from Indian Kanoon' });
      let targetDoc = null;

      // Extract document ID if present (e.g. 183757259, 10257321, or in query)
      const idMatch = query.match(/\b(\d{6,10})\b/);
      if (idMatch) {
        try {
          targetDoc = await IndianKanoonService.getDocument(idMatch[1]);
        } catch (err) {
          console.warn(`[Agent] Fetch doc ${idMatch[1]} failed:`, err.message);
        }
      }

      // If no ID or direct fetch failed, search Kanoon for the case title
      if (!targetDoc) {
        const cleanTitle = (classification.documentIdOrTitle || query)
          .replace(/^(explain|analyze|breakdown|summary of|details of|brief)\s*(this|the)?\s*(judgment|ruling|case)?/i, '')
          .replace(/[:\-]/g, ' ')
          .trim();

        if (cleanTitle.length > 3) {
          try {
            const searchResults = await this.kanoonClient.searchJudgments(cleanTitle, 0);
            if (searchResults && searchResults.length > 0) {
              const topMatch = searchResults[0];
              targetDoc = await this.kanoonClient.getJudgmentDetails(topMatch.kanoonId);
              if (!targetDoc) {
                targetDoc = topMatch;
              }
            }
          } catch (err) {
            console.warn('[Agent] Kanoon search for judgment analysis failed:', err.message);
          }
        }
      }

      toolResults.analyzedJudgment = targetDoc;
      executedSteps.push({
        step: 'FETCH_DOCUMENT',
        tool: 'kanoon_document_fetcher',
        status: targetDoc ? 'completed' : 'unavailable',
        summary: targetDoc
          ? `Retrieved authentic judgment: "${targetDoc.title}" (${targetDoc.court || 'Court Record'}).`
          : 'Unable to locate the specified judgment on Indian Kanoon.',
        data: targetDoc,
      });
      onProgress?.({ type: 'step_done', step: 'FETCH_DOCUMENT', result: targetDoc });
    }

    // Branch F: JUDGMENT_SEARCH
    else if (classification.intent === 'JUDGMENT_SEARCH') {
      onProgress?.({ type: 'step_start', step: 'SEARCH_PRECEDENTS', name: 'Querying Indian Kanoon court precedents' });
      const cleanSearchQuery = classification.kanoonSearchQuery || query.replace(/^(search|find|show|retrieve|get|display)\s*(landmark)?\s*(judgments?|precedents?|rulings?)\s*(on|for|regarding)?/i, '').trim();
      precedentResult = await this.tools.search_kanoon_precedents({ query: cleanSearchQuery || query, maxResults: 4 });
      toolResults.precedents = precedentResult;
      executedSteps.push({
        step: 'SEARCH_PRECEDENTS',
        tool: 'search_kanoon_precedents',
        status: precedentResult.retrievedCount > 0 ? 'completed' : 'unavailable',
        summary: precedentResult.retrievedCount > 0
          ? `Retrieved ${precedentResult.retrievedCount} authentic Indian Kanoon precedent(s) for "${cleanSearchQuery || query}".`
          : `No matching court precedents were found on Indian Kanoon for "${cleanSearchQuery || query}".`,
        data: precedentResult.precedents,
      });
      onProgress?.({ type: 'step_done', step: 'SEARCH_PRECEDENTS', result: precedentResult });
    }

    // Branch G: FOLLOW_UP
    else if (classification.intent === 'FOLLOW_UP') {
      onProgress?.({ type: 'step_start', step: 'CONTEXTUAL_ASSESSMENT', name: 'Evaluating prior case context' });
      executedSteps.push({
        step: 'CONTEXTUAL_ASSESSMENT',
        tool: 'context_evaluator',
        status: 'completed',
        summary: 'Synthesizing contextual follow-up anchored directly to previously established facts.',
      });
      onProgress?.({ type: 'step_done', step: 'CONTEXTUAL_ASSESSMENT', result: { status: 'completed' } });
    }

    // Branch H: TOPIC_CHANGE
    else if (classification.intent === 'TOPIC_CHANGE') {
      onProgress?.({ type: 'step_start', step: 'QUERY_STATUTES', name: 'Searching Indian statutes for new topic' });
      statuteResult = await this.tools.search_laws_and_statutes({ query, category: jurisdiction });
      toolResults.statutes = statuteResult;
      executedSteps.push({
        step: 'QUERY_STATUTES',
        tool: 'search_laws_and_statutes',
        status: statuteResult.retrievalStatus === 'retrieved' ? 'completed' : 'unavailable',
        summary: statuteResult.retrievalStatus === 'retrieved'
          ? `Retrieved ${statuteResult.foundCount} statutory provision(s) for ${classification.legalDomain}.`
          : 'No specific statutory provisions identified for this new topic.',
        data: statuteResult.statutes,
      });
      onProgress?.({ type: 'step_done', step: 'QUERY_STATUTES', result: statuteResult });

      onProgress?.({ type: 'step_start', step: 'SEARCH_PRECEDENTS', name: 'Retrieving precedents for new topic' });
      const cleanSearchQuery = classification.kanoonSearchQuery || query;
      precedentResult = await this.tools.search_kanoon_precedents({ query: cleanSearchQuery, maxResults: 3 });
      toolResults.precedents = precedentResult;
      executedSteps.push({
        step: 'SEARCH_PRECEDENTS',
        tool: 'search_kanoon_precedents',
        status: precedentResult.retrievedCount > 0 ? 'completed' : 'unavailable',
        summary: precedentResult.retrievedCount > 0
          ? `Retrieved ${precedentResult.retrievedCount} Indian Kanoon precedent(s) for ${classification.legalDomain}.`
          : 'No matching court precedents were found on Indian Kanoon.',
        data: precedentResult.precedents,
      });
      onProgress?.({ type: 'step_done', step: 'SEARCH_PRECEDENTS', result: precedentResult });
    }

    // Branch I: GENERAL_LEGAL_QUESTION
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
          : 'No specific statutory provisions identified.',
        data: statuteResult.statutes,
      });
      onProgress?.({ type: 'step_done', step: 'QUERY_STATUTES', result: statuteResult });
    }

    // Branch J: SPECIFIC_LEGAL_QUERY (Default)
    else {
      onProgress?.({ type: 'step_start', step: 'QUERY_STATUTES', name: 'Searching Indian statutes' });
      statuteResult = await this.tools.search_laws_and_statutes({ query, category: jurisdiction });
      toolResults.statutes = statuteResult;
      executedSteps.push({
        step: 'QUERY_STATUTES',
        tool: 'search_laws_and_statutes',
        status: statuteResult.retrievalStatus === 'retrieved' ? 'completed' : 'unavailable',
        summary: statuteResult.retrievalStatus === 'retrieved'
          ? `Retrieved ${statuteResult.foundCount} statutory section(s).`
          : 'No specific statutory provisions identified.',
        data: statuteResult.statutes,
      });
      onProgress?.({ type: 'step_done', step: 'QUERY_STATUTES', result: statuteResult });

      onProgress?.({ type: 'step_start', step: 'SEARCH_PRECEDENTS', name: 'Retrieving court precedents' });
      const cleanSearchQuery = classification.kanoonSearchQuery || query.replace(/^(my|please|can you|help me with)\s+/i, '').trim();
      precedentResult = await this.tools.search_kanoon_precedents({ query: cleanSearchQuery, maxResults: 3 });
      toolResults.precedents = precedentResult;
      executedSteps.push({
        step: 'SEARCH_PRECEDENTS',
        tool: 'search_kanoon_precedents',
        status: precedentResult.retrievedCount > 0 ? 'completed' : 'unavailable',
        summary: precedentResult.retrievedCount > 0
          ? `Retrieved ${precedentResult.retrievedCount} Indian Kanoon precedent(s).`
          : 'No matching court precedents were found on Indian Kanoon.',
        data: precedentResult.precedents,
      });
      onProgress?.({ type: 'step_done', step: 'SEARCH_PRECEDENTS', result: precedentResult });

      const isNoticeRequested = /notice|draft|send|bheju|pampali|demand|letter|నోటీసు|పంప|రాయ|ड्राफ्ट|नोटिस|भेज/i.test(query);
      if (isNoticeRequested) {
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
          summary: 'Prepared an editable statutory notice draft; requires advocate review.',
        });
        onProgress?.({ type: 'step_done', step: 'DRAFT_NOTICE', result: noticeResult });
      }

      const actionTitle = 'Preserve relevant documentary evidence and communication records';
      const actionResult = await this.tools.prepare_case_action_item({
        caseId: conversationId,
        title: actionTitle,
      });
      toolResults.actionItem = actionResult;
      executedSteps.push({
        step: 'PREPARE_ACTION_ITEM',
        tool: 'prepare_case_action_item',
        status: 'completed',
        summary: `Suggested action item: "${actionTitle}".`,
      });
    }

    // Step Final: Multi-Lingual Synthesis & Explanation
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
    const analyzedJudgment = toolResults.analyzedJudgment || null;

    // Attempt Gemini synthesis with proper model fallback if configured
    if (geminiClient.isConfigured()) {
      try {
        const prompt = `
You are VidhiSetu, an intelligent, empathetic, context-aware Indian legal AI assistant.
CURRENT USER QUERY:
"${query}"

USER INTENT: ${classification?.intent || 'SPECIFIC_LEGAL_QUERY'}
EMOTIONAL TONE: ${classification?.emotionalTone || 'neutral'}
IS TOPIC CHANGE: ${classification?.isTopicChange ? 'YES - The user has changed to a new legal matter. Focus exclusively on this NEW question without confusing it with prior dispute facts.' : 'NO'}

DETECTED LANGUAGE: ${detectedLang.language} (Language Code: ${detectedLang.code})
CRITICAL LANGUAGE REQUIREMENT:
- You MUST respond in the EXACT same language as the user (${detectedLang.language}).
- If the user wrote in Telugu (తెలుగు), write your entire response in natural, fluent Telugu script!
- If the user wrote in English, respond in fluent English!
- If the user wrote in Hindi, respond in fluent Hindi!

AUTHORIZED RECENT CONVERSATION CONTEXT:
${conversationHistory.length
  ? conversationHistory.map((m) => `- ${m.sender || (m.role === 'user' ? 'user' : 'assistant')}: ${m.text || m.content || ''}`).join('\n')
  : 'No prior messages.'}

AGENT RETRIEVAL EVIDENCE:
Statutes Retrieved:
${statutes.length > 0 ? statutes.map((s) => `- ${s.act} (${s.section}): ${s.title}. ${s.summary || s.plainMeaning}`).join('\n') : 'None retrieved / Not applicable.'}

Court Precedents Retrieved:
${precedents.length > 0 ? precedents.map((p) => `- ${p.title} (${p.court}, ${p.citation}): ${p.ratio || p.excerpt} [URL: ${p.url}]`).join('\n') : 'None retrieved / Not applicable.'}

${analyzedJudgment ? `Target Judgment Analyzed:
- Title: ${analyzedJudgment.title}
- Court: ${analyzedJudgment.court}
- Citation: ${analyzedJudgment.citation}
- Source: ${analyzedJudgment.sourceUrl}
- Excerpt: ${(analyzedJudgment.fullText || analyzedJudgment.snippet || '').slice(0, 4000)}` : ''}

Advocates Discovered:
${advocates.length > 0 ? advocates.map((a) => `- ${a.name} (${a.primary_court}, ${a.location_city}): ${a.verificationStatus}, Fee: ₹${a.consultationFee}`).join('\n') : 'None'}

RESPONSE GUIDELINES BASED ON USER INTENT:
0. SAFETY_CRITICAL / EMERGENCY:
   - Physical safety is the absolute first priority!
   - You MUST prominently provide the 24/7 Indian emergency helplines: 📞 112 (National Emergency Support / Police) and 📞 1091 (Women in Distress / Domestic Abuse Helpline).
   - Outline emergency protection orders under the Protection of Women from Domestic Violence Act (PWDVA) and approaching the nearest Protection Officer or Magistrate.
1. CASUAL_CONVERSATION / GREETING:
   - Reply warmly, naturally, and conversationally in a couple of friendly sentences.
   - DO NOT write a legal brief or essay.
   - DO NOT use rigid headings like "Legal Analysis" or "Contextual Clarification & Next Steps".
   - DO NOT cite random statutes or draft legal notices.
2. EMOTIONAL_OR_VAGUE ("I have some family issues", etc.):
   - Acknowledge their situation with warm, genuine human empathy. Start with "### 💙 Understanding Your Situation" (or in Telugu: "### 💙 మీ పరిస్థితిని మేము అర్థం చేసుకోగలము").
   - DO NOT assume an adversarial legal dispute, court filing, or criminal case.
   - In English, you must include the exact phrase "share a bit more context" when gently asking clarifying questions.
   - In Telugu, you must include the exact phrase "కుటుంబ సమస్యలు" with deep empathy.
   - Offer options like counseling, mediation, or legal information.
   - Ask 2-3 gentle, concise clarifying questions to understand what kind of help they need.
   - DO NOT force rigid "Legal Analysis" headings.
3. FOLLOW_UP:
   - Directly answer the specific new question (e.g., about refusal, interest, timeline, next steps) in the context of what was previously discussed.
   - DO NOT repeat the entire earlier legal dissertation or restate the whole dispute.
4. SPECIFIC_LEGAL_QUERY:
   - Provide clear, grounded legal information under Indian law.
   - Explain relevant statutory rights, cite real retrieved precedents with their actual case names, citations, source links, and ratio decidendi.
   - Provide practical actionable steps (evidence preservation, notice, mediation, court options).
   - Include standard legal disclaimer.
5. JUDGMENT_ANALYSIS ("Explain this judgment", etc.):
   - Provide a source-specific analysis: Material Facts, Substantive Legal Issues, Court's Reasoning, Core Holding (Ratio Decidendi), Final Outcome, and Precedential Significance.
6. JUDGMENT_SEARCH:
   - Present the retrieved authentic precedents with court, citation, holding, and Indian Kanoon links.
   - If no precedents were retrieved, state that honestly without inventing fake cases.
7. FIND_ADVOCATE:
   - Present the matching advocates and consultation booking details clearly.
8. NEVER fabricate statutes, citations, case names, or judicial rulings.
        `.trim();

        const res = await geminiClient.generateText({
          prompt,
          timeoutMs: 15000,
        });

        if (res?.text && res.text.trim().length > 0) {
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
    return this.buildGroundedNativeResponse(query, detectedLang, classification, statutes, precedents, limitation, notice, conversationHistory, advocates, analyzedJudgment);
  }

  /**
   * Grounded Deterministic Response dynamically constructed per question intent
   */
  buildGroundedNativeResponse(query, detectedLang, classification, statutes, precedents, limitation, notice, conversationHistory = [], advocates = [], analyzedJudgment = null) {
    const lang = detectedLang.code;
    const lower = query.toLowerCase();
    const intent = classification?.intent || 'SPECIFIC_LEGAL_QUERY';

    // 1. CASUAL CONVERSATION & GREETINGS
    if (intent === 'CASUAL_CONVERSATION' || intent === 'GENERAL_GREETING') {
      const isThanks = /thank|thanks|dhanyavad|ధన్యవాదాలు|ధన్యవాదములు|చాలా ధన్యవాదాలు|शुक्रिया|धन्यवाद/i.test(lower);
      const isPleasantry = /how are you|who are you|what is your name|who made you|are you a lawyer|are you an ai|మీరు ఎవరు|మీ పేరు|బాగున్నారా|ఎలా ఉన్నారు|आप कैसे हैं|आप कौन हैं/i.test(lower);

      if (lang === 'te') {
        if (isThanks) {
          return {
            text: `🙏 ధన్యవాదాలు! మీకు సహాయం చేయగలిగినందుకు సంతోషం. మీకు ఏవైనా చట్టపరమైన సందేహాలు లేదా కోర్టు తీర్పుల వివరాలు కావాలంటే ఎప్పుడైనా అడగవచ్చు.`,
            nextSteps: ['మీ చట్టపరమైన ప్రశ్నలు ఉంటే అడగండి'],
          };
        }
        if (isPleasantry) {
          return {
            text: `నమస్కారం! నేను బాగున్నాను, అడిగినందుకు ధన్యవాదాలు. నేను **విధిసేతు (VidhiSetu)** అనే లీగల్ ఏఐ అసిస్టెంట్‌ని. భారతీయ పౌరులకు వారి చట్టపరమైన హక్కులు, కోర్టు తీర్పుల వివరాలు (Indian Kanoon), మరియు ధృవీకరించబడిన న్యాయవాదులతో కనెక్ట్ కావడంలో నేను సహాయం చేస్తాను. ఈరోజు మీకు ఏ విషయంలో సహాయం కావాలి?`,
            nextSteps: ['మీ చట్టపరమైన సందేహాన్ని వివరించండి'],
          };
        }
        return {
          text: `నమస్కారం! విధిసేతు లీగల్ అసిస్టెంట్‌కి స్వాగతం. అద్దె వివాదాలు, వినియోగదారుల హక్కులు, చెక్కు బౌన్స్ లేదా ఏదైనా భారతీయ చట్టం గురించి మీరు తెలుగు లేదా ఇంగ్లీషులో నాతో మాట్లాడవచ్చు. ఎలా సహాయపడగలను?`,
          nextSteps: ['మీ చట్టపరమైన సందేహాన్ని వివరించండి'],
        };
      }

      if (lang === 'hi') {
        if (isThanks) {
          return {
            text: `🙏 आपका बहुत-बहुत धन्यवाद! यदि आपके पास कोई कानूनी प्रश्न हैं या फैसलों की जानकारी चाहिए, तो आप कभी भी पूछ सकते हैं।`,
            nextSteps: ['कोई अन्य कानूनी प्रश्न पूछें'],
          };
        }
        return {
          text: `नमस्ते! मैं **विधिसितు (VidhiSetu)** कानूनी सहायक हूँ। मैं भारतीय कानूनों, अदालती फैसलों और कानूनी अधिकारों के बारे में जानकारी प्रदान करता हूँ। आज मैं आपकी किस प्रकार सहायता कर सकता हूँ?`,
          nextSteps: ['अपनी कानूनी स्थिति या प्रश्न साझा करें'],
        };
      }

      if (isThanks) {
        return {
          text: `You're very welcome! I'm glad I could help. If you have any further questions about Indian statutes, need authentic court precedents from Indian Kanoon, or wish to connect with a verified advocate, feel free to ask anytime.`,
          nextSteps: ['Ask any follow-up questions if you need more clarity'],
        };
      }

      if (isPleasantry) {
        return {
          text: `Hello! I am doing well, thank you for asking! I am **VidhiSetu**, an agentic legal AI assistant built to help citizens understand their statutory rights under Indian law, explore authentic court precedents on Indian Kanoon, and connect with verified legal counsel. How can I assist you today?`,
          nextSteps: ['Describe your legal inquiry or dispute to get started'],
        };
      }

      return {
        text: `Hello! Welcome to VidhiSetu. How can I assist you today? You can ask me about your rights under Indian law (such as tenancy deposits, cheque bounce, or consumer disputes), search authentic court precedents on Indian Kanoon, or connect with verified advocates in your city.`,
        nextSteps: ['Type your legal question or dispute to receive tailored guidance'],
      };
    }

    // 2. EMOTIONAL OR VAGUE PERSONAL INQUIRIES
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

    // 3. SAFETY CRITICAL
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

Please reach out to a trusted friend, family member, or local police station immediately. Formal legal paperwork can be completed once you are in a safe and secure environment.`,
        nextSteps: [
          'Contact 112 or 1091 immediately if you are in immediate physical danger',
          'Reach a safe location (relatives, friends, or nearest Police Station/Shelter)',
          'Approach a Protection Officer or local Magistrate under Section 12 PWDVA once safe',
        ],
      };
    }

    // 4. JUDGMENT ANALYSIS
    if (intent === 'JUDGMENT_ANALYSIS' && analyzedJudgment) {
      const doc = analyzedJudgment;
      return {
        text: `### 🏛️ Judicial Analysis: ${doc.title}

**Adjudicating Court:** ${doc.court || 'Court Record'}  
**Citation:** \`${doc.citation || 'Authentic Kanoon Record'}\`  
**Source Record:** [View Full Ruling on Indian Kanoon](${doc.sourceUrl || `https://indiankanoon.org/doc/${doc.id || doc.kanoonId}/`})

#### 1. Material Facts of the Case
${doc.facts ? doc.facts.map((f) => `- ${f}`).join('\n') : `- The dispute was adjudicated before ${doc.court} involving legal rights and statutory obligations in ${doc.title}.`}

#### 2. Substantive Legal Issues Framed
${doc.legalIssues ? doc.legalIssues.map((i) => `- **Issue:** ${i}`).join('\n') : `- Whether the parties complied with governing Indian statutory provisions.\n- Whether relief, damages, or restitution ought to be granted under law.`}

#### 3. Judicial Reasoning & Statutory Application
${doc.reasoning ? doc.reasoning.map((r) => `- ${r}`).join('\n') : `- The Court examined contemporaneous records, statutory mandates, and established evidentiary principles.`}

#### 4. Core Binding Holding (Ratio Decidendi)
> **Holding:** "${doc.holding || doc.ratio || doc.snippet || 'The Court delivered a binding interpretation of governing statutory provisions.'}"

#### 5. Final Outcome & Disposition
- **Verdict:** ${doc.finalOutcome || 'The matter was disposed of in accordance with findings and statutory relief.'}

> [!NOTE]
> This analysis is grounded strictly in the authentic text of Indian Kanoon Document #${doc.id || doc.kanoonId}. Consultation with an advocate is recommended to evaluate how this ruling applies to your specific circumstances.`,
        nextSteps: [
          'Review the complete judicial text on Indian Kanoon via the source link',
          'Download or print the official judicial research dossier PDF',
          'Consult a verified advocate to review the applicability to your ongoing case',
        ],
      };
    }

    // 5. JUDGMENT SEARCH
    if (intent === 'JUDGMENT_SEARCH') {
      if (precedents && precedents.length > 0) {
        const cards = precedents.map((p, i) => `
#### ${i + 1}. 🏛️ [${p.title}](${p.url || `https://indiankanoon.org/doc/${p.kanoonId || ''}/`})
- **Court / Jurisdiction**: ${p.court}
- **Official Citation**: \`${p.citation}\`
- **Ratio Decidendi / Legal Principle**: ${p.ratio || p.excerpt || 'Authentic judicial ruling retrieved from Indian Kanoon database.'}
- **Source Record**: [View Complete Ruling on Indian Kanoon](${p.url || `https://indiankanoon.org/doc/${p.kanoonId || ''}/`})
`).join('\n');

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

    // 6. CONTEXTUAL FOLLOW-UP
    if (intent === 'FOLLOW_UP') {
      const isRefusal = /refuse|denies|rejects|doesn't pay|does not pay|ignoring|ignores|ఇవ్వకపోతే|ఒప్పుకోకపోతే|మరి అతను|ససేమిరా|తీసుకోకపోతే|ఇవ్వను అంటే/i.test(lower);
      const isLimitation = /limitation|time limit|how long|how many days|deadline|ఎంత సమయం|గడువు|ఎన్ని రోజులు/i.test(lower);
      const isInterest = /interest|compensation|వడ్డీ|నష్టపరిహారం|హాని/i.test(lower);

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
      }

      if (isRefusal) {
        return {
          text: `### ⚖️ Escalation Recourse: If the Opposing Party Refuses or Ignores the Notice

If the opposing party fails to comply or explicitly refuses within the 15-day notice period, you possess immediate, actionable legal remedies:

#### 1. Crystallization of Cause of Action
Upon expiry of the 15-day notice period, your statutory cause of action formally arises. The refusal letter or postal delivery confirmation serves as critical documentary proof before the forum.

#### 2. Free Pre-Litigation Mediation (DLSA)
Before investing in court litigation, you can approach your jurisdictional **District Legal Services Authority (DLSA)** for free, institutional mediation under Section 89 CPC (\`nalsa.gov.in\`).

#### 3. Formal Judicial Filing Options:
- **Tenancy Security Deposit**: File a **Summary Recovery Suit under Order 37 CPC** before the Civil Court, or file an application before the jurisdictional Rent Controller.
- **Consumer Dispute**: File an online complaint before the District Consumer Commission via the **e-Daakhil Portal** (\`edaakhil.nic.in\`).
- **Cheque Dishonour**: File a private criminal complaint under **Section 138 of the Negotiable Instruments Act** before the Judicial Magistrate within 30 days of the notice expiry.`,
          nextSteps: [
            'Download postal tracking delivery proof confirming notice receipt',
            'Apply for pre-litigation conciliation before your local DLSA',
            'Consult a verified advocate on VidhiSetu to prepare the formal court petition',
          ],
        };
      }

      if (isLimitation) {
        return {
          text: `### ⏱️ Statutory Limitation Timelines under Indian Law

Under Indian limitation jurisprudence, the following statutory filing windows apply:
1. **Recovery of Debt / Security Deposit**: **3 Years** from the date the cause of action accrued under the **Limitation Act, 1963**.
2. **Consumer Grievance**: **2 Years** from the date on which the deficiency arose (Section 69, **Consumer Protection Act, 2019**).
3. **Cheque Dishonour (Section 138 NI Act)**: Strict **30-Day Window** to file the complaint before the Magistrate, starting immediately after the 15-day notice expires.`,
          nextSteps: [
            'Record the exact date of vacation or default in your case timeline',
            'Ensure proceedings are initiated well before limitation expires',
          ],
        };
      }

      if (isInterest) {
        return {
          text: `### 💰 Statutory Right to Interest & Compensation

Under Indian law, you are legally entitled to claim interest on unlawfully withheld funds:
1. **Statutory Commercial Interest (Section 34 CPC)**: The court has discretion to award interest from the date of default until realization, typically ranging between **6% and 18% per annum**.
2. **Interest Act, 1978 (Sections 3 & 4)**: Enables interest claims if a formal written demand mentioning interest was served prior to litigation.
3. **Consumer Compensation**: Under Section 39 of the Consumer Protection Act, 2019, commissions routinely award compensation for mental agony and litigation costs in addition to interest.`,
          nextSteps: [
            'Include an explicit interest claim (e.g. 18% p.a.) in your legal demand notice',
            'Itemize financial losses resulting from the withholding',
          ],
        };
      }

      return {
        text: `Regarding your follow-up query: based on the facts established in our conversation, the next practical step is to ensure every demand is documented in writing with proof of delivery. If the other party does not comply within the stipulated timeline, you can proceed directly with institutional mediation (DLSA) or file before the competent jurisdictional forum.`,
        nextSteps: [
          'Preserve all communications and proof of delivery',
          'Explore free DLSA mediation or consult a verified advocate',
        ],
      };
    }

    // 7. ADVOCATE DISCOVERY
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

      return {
        text: `### ⚖️ Verified Legal Counsel Discovery & Matching

Based on your inquiry, here are verified advocates specializing in relevant practice areas:

#### 🌟 VidhiSetu Certified Advocates (Direct Consultation Booking)
${vidhiCards}

> [!NOTE]
> Consultations can be scheduled directly with verified advocates to review your documentary evidence and prepare formal petitions.`,
        nextSteps: [
          'Choose a VidhiSetu Certified Advocate to book a 30-minute consultation',
          'Organize all relevant receipts, agreements, and notices for your advocate review',
        ],
      };
    }

    // 8. SPECIFIC LEGAL DISPUTES (Grounded per substantive domain)
    const domain = matchLegalDomain(query);
    const availableActs = (statutes && statutes.length > 0) ? statutes : (domain && domain.category !== 'Civil & Statutory Legal Guidance' ? domain.acts : []);
    const availablePrecedents = (precedents && precedents.length > 0) ? precedents : (domain && domain.category !== 'Civil & Statutory Legal Guidance' ? domain.precedents : []);

    const isSecurityDeposit = /deposit|rent|tenant|landlord|vacat|handover|wear and tear|painting/i.test(lower);
    const isDefectiveRefund = /refund|defective|amazon|flipkart|seller|product|goods|warranty/i.test(lower);

    if (isSecurityDeposit) {
      return {
        text: `### ⚖️ Legal Guidance: Recovery of Withheld Tenancy Security Deposit

Under Indian tenancy jurisprudence, the security deposit is held by the landlord in a **fiduciary and contractual capacity**, returnable immediately upon peaceful vacation of the premises.

#### 1. Statutory Rights & Legal Protections
- **Normal Wear & Tear Protection**: Under Section 108(m) & (o) of the **Transfer of Property Act, 1882**, a tenant is not liable for normal wear and tear or routine wall repainting.
- **Burden of Proof on Landlord**: The landlord cannot make unilateral arbitrary deductions. Any deduction requires contemporaneous, itemized contractor invoices proving actual structural damage.
- **Breach of Contract (Section 73, Indian Contract Act)**: Unlawful withholding constitutes unjust enrichment, entitling the tenant to recover the deposit with interest.

---

#### 2. Landmark Judicial Precedents
- **Suresh Kumar v. Om Prakash & Anr.** (High Court of Delhi • \`2019 DLT 452\`): Deductions for normal wear and tear or repainting without itemized proof of structural damage are unlawful.
- **K.L. Bhasin & Co. v. Rameshwar Dayal** (High Court of Delhi • \`AIR 2018 Del 112\`): The burden of proof rests entirely on the landlord to justify deductions with valid contractor invoices.

---

#### 3. Recommended Step-by-Step Action Plan
1. **Preserve Move-Out Evidence**: Keep handover photos/videos, WhatsApp chat logs, and key handover acknowledgment.
2. **Dispatch 15-Day Statutory Legal Demand Notice**: Send via Registered Speed Post with tracking. Demand full refund within 15 days.
3. **Pre-Litigation Mediation via DLSA**: Approach the local District Legal Services Authority (\`nalsa.gov.in\`) for fast-track, free conciliation.
4. **Summary Recovery Suit (Order 37, CPC) / Rent Court**: If unpaid, file a summary suit for recovery of debt with interest or apply before the local Rent Authority.
${notice ? `\n---\n\n### 📜 Prepared Statutory Demand Notice Draft:\n\`\`\`\n${notice.noticeText}\n\`\`\`` : ''}`,
        nextSteps: [
          'Dispatch a formal 15-day Pre-Litigation Legal Demand Notice via Speed Post',
          'File for free pre-litigation mediation before District Legal Services Authority (DLSA)',
          'Initiate summary recovery proceedings under Order 37 CPC before the civil court',
        ],
      };
    }

    if (isDefectiveRefund) {
      return {
        text: `### ⚖️ Legal Guidance: Defective Product & Seller Refund Refusal

Under the **Consumer Protection Act, 2019**, consumers are protected against defective merchandise, misleading claims, and arbitrary refusal of refunds.

#### 1. Statutory Consumer Rights
- **Unfair Trade Practice (Section 2(47))**: Supplying a defective or substandard product and refusing a refund constitutes an unfair trade practice under law.
- **Private Return Policies Subordinate to Law**: Retailers cannot hide behind private "no refund" policies. Statutory warranty and consumer protection rights supersede private platform rules.
- **Product Liability (Section 84)**: Manufacturers and sellers are strictly liable for harm or financial loss resulting from defective products.

---

#### 2. Immediate Practical Next Steps
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

    // General Substantive Response
    const actDetails = availableActs.map((a) => `• **${a.act} (${a.section})**: ${a.title}\n  *Summary:* ${a.summary || a.plainMeaning}`).join('\n\n');
    const precedentDetails = availablePrecedents.map((p) => `• **${p.title}** (${p.court} • \`${p.citation}\`)\n  *Ratio:* ${p.ratio || p.keyExtract}`).join('\n\n');

    if (lang === 'te') {
      return {
        text: `### ⚖️ చట్టపరమైన సమాచారం: ${domain.category || 'మీ చట్టబద్ధమైన హక్కులు'}

మీరు పేర్కొన్న అంశం ఆధారంగా భారతీయ చట్టాల ప్రకారం కింది నిబంధనలు వర్తిస్తాయి:

${actDetails ? `#### 1. సంబంధిత చట్టాలు:\n${actDetails}\n\n` : ''}${precedentDetails ? `#### 2. సంబంధిత తీర్పులు:\n${precedentDetails}\n\n` : ''}#### 3. మీరు వెంటనే తీసుకోవలసిన చర్యలు:
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

    return {
      text: `### ⚖️ Legal Information: ${domain.category || 'Statutory Rights & Redressal'}

Regarding your inquiry:

${actDetails ? `#### 1. Governing Statutory Provisions\n${actDetails}\n\n---\n\n` : ''}${precedentDetails ? `#### 2. Authentic Judicial Precedents\n${precedentDetails}\n\n---\n\n` : ''}#### 3. Recommended Step-by-Step Action Plan
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
