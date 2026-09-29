/**
 * Legal Problem Analyzer & Entity Extractor (Phase 1)
 * Member 3: AI + RAG + Legal Research Lead
 *
 * Transforms ordinary citizen problem descriptions (in English, Telugu, or Tanglish)
 * into structured legal issues, missing facts, and optimized queries for Indian Kanoon.
 * Uses centralized GeminiClient with high-fidelity deterministic fallback.
 */

import { LEGAL_SYSTEM_PROMPT } from '../prompts/legalPrompts.js';
import { geminiClient } from './geminiClient.js';
import { matchLegalDomain } from '../knowledge/legalDomains.js';

const HARASSMENT_REPORT_PATTERN = /\b(?:sexual\s+)?(?:harassment|harrasment|harrassment|harassing|harrasing|harrassing|harassed|harrased|molestation|molest|abuse|abusive|threatened|threatening|domestic violence)\b/i;
const FAMILY_RELATIONSHIP_PATTERN = /\b(husband|wife|spouse|partner|father|mother|family member)\b/i;
const BANK_TRANSACTION_CONTEXT_PATTERN = /\b(bank|account|upi|atm|card|payment|transaction|money|amount|debit|transfer)\b/i;

export class LegalAnalyzer {
  /**
   * Analyzes an unstructured legal query from a citizen.
   * @param {string} query - Citizen's query in plain words
   * @param {string} [declaredJurisdiction] - User's location/state if known
   * @param {Object} [contextOptions] - Additional context (e.g. history, language)
   * @returns {Promise<Object>} Structured analysis
   */
  static async analyzeQuery(query, declaredJurisdiction = '', contextOptions = {}) {
    if (!query || !query.trim()) {
      throw new Error('Please provide your legal question or details of your issue.');
    }

    const trimmedQuery = query.trim();
    const cleanLower = trimmedQuery.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    // Check for conversational greetings & onboarding questions
    const isGreeting = /^(hi|hello|hey|namaste|vanakkam|good\s*(morning|afternoon|evening)|who are you|what can you do|help me|help|howdy|start)$/i.test(cleanLower) ||
      cleanLower === 'hi' || cleanLower === 'hey';

    if (isGreeting) {
      return {
        summary: 'Citizen inquiry regarding VidhiSetu AI capabilities and Indian legal guidance.',
        category: 'General Legal Guidance',
        isGreeting: true,
        jurisdiction: declaredJurisdiction || 'All India',
        detected_language: 'English',
        legal_issues: ['Overview of Indian statutory rights, Kanoon precedents, and case assessment'],
        extracted_facts: [],
        missing_information: [
          'Briefly describe the specific dispute or problem you are facing',
          'Mention the jurisdiction or city where the event occurred',
          'Note if any written agreement, notices, or payment records exist',
        ],
        kanoon_search_queries: [],
        relevant_acts_anticipated: [
          'Constitution of India (Article 39A)',
          'Code of Civil Procedure, 1908 (Section 89)',
        ],
        executionMode: 'conversational_intro',
      };
    }

    if (this.isUnderspecifiedQuery(trimmedQuery)) {
      return {
        summary: 'The user has not yet described the legal problem.',
        category: 'General Legal Guidance',
        requiresClarification: true,
        jurisdiction: declaredJurisdiction || 'Central / All India',
        detected_language: 'English',
        legal_issues: [],
        extracted_facts: [],
        missing_information: [
          'What happened, in your own words?',
          'Who is involved (for example, an employer, landlord, seller, or another person)?',
          'Where and when did it happen?',
          'What outcome or support are you looking for?',
        ],
        kanoon_search_queries: [],
        relevant_acts_anticipated: [],
        executionMode: 'clarification_required',
      };
    }

    // 1. Attempt Centralized Gemini LLM Analysis if configured
    if (geminiClient.isConfigured()) {
      try {
        const historyText = contextOptions.history && Array.isArray(contextOptions.history) && contextOptions.history.length > 0
          ? `\n\nPrevious Case Conversation History (Maintain context and remember these facts):\n${contextOptions.history.slice(-8).map((m) => `${m.sender === 'user' ? 'Citizen' : 'VidhiSetu'}: ${m.text}`).join('\n')}`
          : '';

        const prompt = `User Legal Query: "${trimmedQuery}"\nDeclared Jurisdiction: "${declaredJurisdiction || 'Auto-detect'}"${historyText}\n\nAnalyze this legal problem according to Indian jurisprudence and output the structured JSON.`;

        const result = await geminiClient.generateStructured({
          prompt,
          systemInstruction: LEGAL_SYSTEM_PROMPT,
          temperature: 0.1,
          timeoutMs: 20000,
        });

        if (result && result.data && Array.isArray(result.data.kanoon_search_queries) && result.data.kanoon_search_queries.length > 0) {
          const guarded = this.validateAndGuardAnalysis(result.data, trimmedQuery, declaredJurisdiction, contextOptions);
          return {
            ...guarded,
            modelUsed: result.modelUsed,
            executionMode: 'gemini_llm',
          };
        }
      } catch (err) {
        console.warn(`[LegalAnalyzer] Gemini call failed (${err.code || err.message}), engaging offline legal heuristics engine.`);
      }
    }

    // 2. High-fidelity domain expert rule engine for offline development, tests, and resilience
    const fallbackResult = this.analyzeWithExpertEngine(trimmedQuery, declaredJurisdiction, contextOptions);
    const guardedFallback = this.validateAndGuardAnalysis(fallbackResult, trimmedQuery, declaredJurisdiction, contextOptions);
    
    // Only match from general domain knowledge base if category is unclassified and does NOT already require clarification
    if (guardedFallback.category === 'General Legal Guidance' && !guardedFallback.requiresClarification) {
      const domain = matchLegalDomain(trimmedQuery, guardedFallback.category, contextOptions.history);
      if (domain && domain.category !== 'General Legal Guidance' && domain.category !== 'Civil & Statutory Legal Guidance') {
        guardedFallback.category = domain.category;
        guardedFallback.summary = `${domain.summary} (Query: "${trimmedQuery}")`;
        guardedFallback.legal_issues = [
          `Assessment under ${domain.acts[0]?.act || 'applicable Indian statute'}`,
          'Analysis of legal remedies, rights, and dispute timeline',
        ];
        guardedFallback.relevant_acts_anticipated = domain.acts.map((a) => `${a.act} (${a.section})`);
        guardedFallback.kanoon_search_queries = [
          `${domain.category} court judgment India`,
          `${domain.acts[0]?.act || 'Indian law'} precedent`,
        ];
        guardedFallback.missing_information = domain.missingInformation || [];
        guardedFallback.nextActions = domain.nextSteps || [];
        guardedFallback.requiresClarification = false;
        guardedFallback.executionMode = 'deterministic_fallback';
      } else {
        guardedFallback.executionMode = 'deterministic_fallback';
      }
    } else {
      guardedFallback.executionMode = guardedFallback.executionMode || 'deterministic_fallback';
    }
    return guardedFallback;
  }

  /**
   * Semantic Guard & Category Alignment
   * Ensures the legal intent classification stays tightly anchored to the original facts
   * and prevents hallucinations or category drift.
   */
  static validateAndGuardAnalysis(analysis, query, declaredJurisdiction = '', contextOptions = {}) {
    if (!analysis) return this.analyzeWithExpertEngine(query, declaredJurisdiction, contextOptions);
    const q = query.toLowerCase();

    const history = Array.isArray(contextOptions.history) ? contextOptions.history : [];
    const currentMessageIndex = history.findLastIndex((message) => message.sender === 'user' && (message.text || '').trim() === query.trim());
    const earlierMessages = currentMessageIndex >= 0 ? history.slice(0, currentMessageIndex) : history;
    const latestAssistant = earlierMessages.findLast((message) => message.sender === 'ai');
    const hasRecentHarassmentReport = earlierMessages.slice(-10).some((message) => HARASSMENT_REPORT_PATTERN.test(message.text || ''));
    const followsHarassmentClarification = hasRecentHarassmentReport &&
      /safe right now|where did this happen|what support/i.test(latestAssistant?.text || '') &&
      /^(?:my answer|it is with|it happened|with my|at home|in my home|my husband is|my wife is|i am safe|i'm safe|i am not safe|i'm not safe|it is ongoing|it's ongoing)\b/i.test(query.trim());
    const recentUserFacts = earlierMessages.slice(-6).filter((message) => message.sender === 'user').map((message) => message.text || '').join(' ');
    const incidentFacts = `${recentUserFacts} ${q}`;
    if (HARASSMENT_REPORT_PATTERN.test(q) || followsHarassmentClarification) {
      const explicitWorkplace = /\b(workplace|at work|office|employer|colleague|coworker|boss)\b/i.test(q);
      const atHome = /\b(home|at home|in home|in my home)\b/i.test(q);
      const hasFamilyRelationship = FAMILY_RELATIONSHIP_PATTERN.test(q) || FAMILY_RELATIONSHIP_PATTERN.test(incidentFacts);
      const domesticContext = atHome || (hasFamilyRelationship && !explicitWorkplace);
      const workplaceContext = !domesticContext && (explicitWorkplace || /\b(workplace|at work|office|employer|colleague|coworker|boss)\b/i.test(recentUserFacts));

      analysis.category = domesticContext
        ? 'Domestic / Family Safety & Harassment'
        : workplaceContext
          ? 'Workplace Sexual Harassment'
          : 'Sexual Harassment / Safety';
      analysis.summary = domesticContext
        ? 'Harassment or safety concern involving a family or household relationship; immediate safety and the specific conduct need clarification.'
        : workplaceContext
          ? 'Workplace harassment concern requiring details about the conduct, dates, and reporting options.'
          : 'Harassment concern; the setting, specific conduct, and immediate safety needs are not yet specified.';
      analysis.legal_issues = [
        domesticContext ? 'Immediate safety and possible legal protections in a family or household relationship' : 'Harassment and available reporting or support options',
        ...(q.includes('divorce') ? ['The user is also seeking information about divorce options'] : []),
      ];
      analysis.kanoon_search_queries = domesticContext
        ? ['domestic violence harassment by spouse India household safety law', 'family court matrimonial cruelty harassment India']
        : [workplaceContext ? 'workplace sexual harassment India POSH Act' : 'harassment India legal remedies'];
      analysis.relevant_acts_anticipated = domesticContext
        ? ['Protection of Women from Domestic Violence Act, 2005 (if applicable to the facts)', ...(q.includes('divorce') ? ['Applicable matrimonial law, depending on the marriage'] : [])]
        : workplaceContext
          ? ['Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013']
          : [];
      const safetyStatusKnown = /\b(safe|unsafe|in danger|not in danger|emergency)\b/i.test(incidentFacts);
      const conductKnown = /\b(physical harm|sexual conduct|unwanted touching|threat(?:s|ened|ening)?|controlling behavior|violence|hit|beaten|messages?)\b/i.test(incidentFacts);
      const timingKnown = /\b(today|yesterday|last night|last week|last month|last year|\d+\s+(?:days?|weeks?|months?|years?) ago|ongoing|still happening|stopped|ended)\b/i.test(incidentFacts);
      const locationState = this.detectJurisdiction(incidentFacts);
      const missingInformation = [];
      if (!safetyStatusKnown) missingInformation.push('Are you safe right now, or do you need urgent help?');
      if (!conductKnown) missingInformation.push('What happened (for example, physical harm, sexual conduct, threats, unwanted touching, or controlling behavior)?');
      if (!timingKnown) missingInformation.push('When did it happen, and is it ongoing?');
      if (!locationState) missingInformation.push('Which Indian state did this happen in?');
      if (!q.includes('divorce') && !/\b(divorce|separation|protection|complaint|support|what should i do)\b/i.test(incidentFacts)) {
        missingInformation.push('What support do you want: safety options, reporting information, or divorce guidance?');
      }
      analysis.requiresClarification = missingInformation.length > 0;
      analysis.missing_information = missingInformation;
      analysis.clarificationPrompt = domesticContext
        ? `I understand you are describing harassment involving a family or household relationship${q.includes('divorce') ? ' and considering divorce' : ''}. ${missingInformation.join(' ')} If you are in immediate danger, move to a safe place if possible and contact local emergency services.`
        : `I understand you are describing ${q.includes('sexual') || (analysis.category && analysis.category.includes('Sexual')) ? 'sexual harassment' : 'harassment'}${q.includes('divorce') ? ' and considering divorce' : ''}. ${missingInformation.join(' ')} If you are in immediate danger, contact local emergency services.`;
      return analysis;
    }

    const latestBankQuestion = /\b(bank|payment|transaction|upi|amount|debit|transfer)\b/i.test(latestAssistant?.text || '');
    const hasRecentBankReport = earlierMessages.slice(-10).some((message) => message.sender === 'user' &&
      BANK_TRANSACTION_CONTEXT_PATTERN.test(message.text || '') && /\b(lost|missing|locked|stuck|pending|debit|deduct|without|money|amount)\b/i.test(message.text || ''));
    const followsBankClarification = hasRecentBankReport && latestBankQuestion &&
      /^(?:my answer|yesterday|today|it was|my money|the money|amount|it is|i don't know|i do not know)\b/i.test(query.trim());
    const mentionsBankAndLoss = /\b(bank|bank account|account|upi|atm|debit card|net banking|electronic transfer)\b/i.test(q) &&
      /\b(money|amount|transaction|debit|withdraw(?:n|al)?|missing|lost|fraud|unauthori[sz]ed|deduct(?:ed|ion)?|without (?:any )?notification|locked|stuck|pending)\b/i.test(q);
    const isBankIssue = mentionsBankAndLoss || followsBankClarification;
    if (isBankIssue) {
      const pendingTransaction = /\b(locked|stuck|pending|in the middle|in progress|processing|not received|failed)\b/i.test(q);
      const bankFacts = `${recentUserFacts} ${q}`;
      const hasAmount = /(?:₹|\bINR\b|\bRs\.?\s*)\s?\d|\b\d[\d,]*(?:\.\d+)?\s?(?:rupees|INR)\b/i.test(bankFacts);
      const hasDate = /\b(today|yesterday|last night|last week|on \d{1,2}[/-]\d{1,2}|\d+\s+(?:hours?|days?) ago)\b/i.test(bankFacts);
      const hasChannel = /\b(upi|atm|debit card|credit card|net banking|internet banking|wire transfer|bank transfer)\b/i.test(bankFacts);
      const hasReported = /\b(reported|complaint|informed the bank|called the bank|blocked)\b/i.test(bankFacts);
      const missingInformation = [];
      if (!hasDate) missingInformation.push(pendingTransaction ? 'When did the payment get stuck?' : 'When did the debit happen?');
      if (!hasAmount) missingInformation.push(pendingTransaction ? 'What amount was involved?' : 'What amount was taken?');
      if (!hasChannel) missingInformation.push('Was this through UPI, an ATM, a card, net banking, or another payment method?');
      if (pendingTransaction && !/\b(balance|debited|deducted|recipient|received|credited)\b/i.test(bankFacts)) {
        missingInformation.push('Does your account show the amount as debited, and has the recipient received it?');
      } else if (!pendingTransaction && !hasReported) {
        missingInformation.push('Have you contacted the bank and received a complaint/reference number?');
      }

      analysis.category = pendingTransaction ? 'Banking / Pending or Failed Transaction' : 'Banking / Unauthorized Electronic Transaction';
      analysis.summary = pendingTransaction
        ? 'A bank or digital payment may be pending or stuck; the debit status, payment channel, and recipient confirmation need checking.'
        : 'Possible unauthorized or unrecognized debit from a bank account; the transaction channel, timeline, and bank response need confirmation.';
      analysis.legal_issues = [
        ...(pendingTransaction ? ['Determine whether the payment is pending, failed, or completed', 'Confirm whether the payer account was debited and whether the recipient received the funds'] : ['Promptly report and dispute a potentially unauthorized electronic transaction', 'Secure the affected account and preserve transaction records', 'Determine the applicable customer-liability rules from the transaction facts and reporting timeline']),
      ];
      analysis.relevant_acts_anticipated = pendingTransaction ? [] : [
        'RBI Customer Protection Directions on Limiting Liability of Customers in Unauthorised Electronic Banking Transactions, 2017',
        'Information Technology Act, 2000, if the facts involve electronic fraud',
      ];
      analysis.kanoon_search_queries = pendingTransaction
        ? ['pending failed electronic bank transfer India refund', 'UPI transaction pending amount debited recipient not received India']
        : ['unauthorized electronic bank transaction customer liability India RBI', 'bank account unauthorized debit complaint reimbursement India'];
      analysis.missing_information = missingInformation;
      analysis.nextActions = pendingTransaction
        ? [
            'Check the payment status in your official bank/payment app and whether your available balance was debited. Do not retry while the same payment is pending.',
            'Save the UTR/RRN or transaction ID and contact the bank/payment provider through an official channel. Ask whether the payment is pending, reversed, or credited to the recipient.',
            'If you did not authorize the transaction, secure the account, report it to the bank immediately, and call 1930 for suspected cyber fraud. Never share an OTP or PIN.',
          ]
        : [
            'Call your bank using its official app or the number on your card. Report the debit as unauthorized, ask it to secure the account and block any compromised card or UPI channel, and get a complaint number.',
            'From a trusted device, change banking credentials and UPI PIN if applicable. Never share an OTP, PIN, or password with callers or message links.',
            'For suspected electronic fraud, call India’s 1930 cyber-fraud helpline and file at cybercrime.gov.in promptly. Save the transaction ID, statement, alerts, and bank complaint reference.',
          ];
      analysis.requiresClarification = missingInformation.length > 0;
      analysis.executionMode = 'clarification_required';
      analysis.clarificationPrompt = pendingTransaction
        ? `I understand the payment got stuck yesterday. Check its status in your official bank/payment app and whether your balance was debited. Do not retry while it is pending. Save the transaction ID and contact official bank/payment support. If you did not authorize it, secure your account and call 1930. ${missingInformation.join(' ')}`
        : `This may be an unauthorized bank debit. Contact your bank through an official channel now, report the transaction, ask them to secure the account, and keep the complaint number. Do not share OTPs or PINs. For suspected electronic fraud, call 1930 and report it at cybercrime.gov.in. ${missingInformation.join(' ')}`;
      return analysis;
    }

    const followsDivorceClarification = this.isContextualFollowUp(query, contextOptions) &&
      (contextOptions.history || []).some((message) => message.sender === 'ai' && /divorce|family law/i.test(message.text || '') && /mutual consent|contested|please share your state|children/i.test(message.text || ''));
    if (/\b(divorce|divorcing|marital separation|dissolution of marriage)\b/i.test(q) || followsDivorceClarification) {
      analysis.category = 'Family Law / Divorce';
      analysis.summary = 'Family-law question about divorce; the applicable process depends on the marriage law, location, facts, and whether both spouses consent.';
      analysis.legal_issues = [
        'Whether the divorce is by mutual consent or contested',
        'Applicable matrimonial law and court process',
        'Any related questions about children, maintenance, property, or safety',
      ];
      analysis.kanoon_search_queries = [
        'divorce mutual consent contested Indian family court law',
        'Family Courts Act divorce matrimonial dispute India',
      ];
      analysis.relevant_acts_anticipated = [
        'Family Courts Act, 1984',
        'Applicable personal law or Special Marriage Act, 1954, depending on the marriage',
      ];
      analysis.missing_information = [
        'Whether both spouses consent or the divorce is contested',
        'State where the parties live and whether a petition has been filed',
        'Whether children, maintenance, property, or immediate safety concerns are involved',
      ];
      return analysis;
    }

    if (/\b(rental|rented|renting)\s+(?:house|home|apartment|property)\b/i.test(q) && /\b(problem|issue|trouble)\b/i.test(q)) {
      analysis.category = 'Rental / Housing - details needed';
      analysis.summary = 'The user has a rental or housing concern but has not described the dispute.';
      analysis.requiresClarification = true;
      analysis.clarificationPrompt = 'I can help with a rental or housing issue, but I do not want to assume it is about a security deposit. Are you the tenant or landlord, and is the problem about rent, repairs, the agreement, notice, eviction, or something else? Please share your state and what happened.';
      analysis.legal_issues = [];
      analysis.kanoon_search_queries = [];
      analysis.relevant_acts_anticipated = [];
      analysis.missing_information = [
        'Are you the tenant, landlord, or another person involved?',
        'Is the issue about rent, repairs, an agreement, notice, eviction, or something else?',
        'What happened and in which state?',
      ];
      return analysis;
    }

    const isTenancyGrievance =
      q.includes('landlord') ||
      q.includes('tenant') ||
      q.includes('tenancy') ||
      q.includes('security deposit') ||
      (q.includes('deposit') && (q.includes('flat') || q.includes('rent') || q.includes('vacat') || q.includes('house'))) ||
      (q.includes('rent') && (q.includes('refund') || q.includes('return') || q.includes('ivvatledu')));

    const isBuilderReraGrievance =
      q.includes('builder') ||
      q.includes('rera') ||
      q.includes('promoter') ||
      q.includes('late chesadu') ||
      ((q.includes('flat') || q.includes('apartment')) && (q.includes('possession') || q.includes('delay') || q.includes('handover')));

    // Guard 1: Tenancy / Landlord Deposit Dispute
    if (isTenancyGrievance) {
      const catLower = (analysis.category || '').toLowerCase();
      if (catLower.includes('rera') || catLower.includes('builder') || catLower.includes('real estate') || (!catLower.includes('tenan') && !catLower.includes('rent') && !catLower.includes('deposit'))) {
        console.warn(`[LegalAnalyzer Guard] Intercepted category conflict (was: "${analysis.category}"). Correcting to Tenancy / Rental / Security Deposit dispute.`);
      }

      analysis.category = 'Tenancy / Rental / Security Deposit dispute';

      // Purge any builder/rera search queries that slipped in
      const cleanQueries = (analysis.kanoon_search_queries || []).filter(
        (sq) => !sq.toLowerCase().includes('builder') && !sq.toLowerCase().includes('rera') && !sq.toLowerCase().includes('allottee')
      );
      if (cleanQueries.length === 0) {
        analysis.kanoon_search_queries = [
          'security deposit landlord tenant refund',
          'landlord refusing refund security deposit tenant vacate',
          'tenant vacate security deposit deduction refund notice',
        ];
      } else {
        analysis.kanoon_search_queries = cleanQueries;
      }

      analysis.relevant_acts_anticipated = [
        'Transfer of Property Act, 1882 (Section 108)',
        'Indian Contract Act, 1872 (Section 73 - Breach of Contract)',
        'Model Tenancy Act / State Rent Control Act',
      ];
      return analysis;
    }

    // Guard 2: Real Estate / Builder Delay (RERA)
    if (isBuilderReraGrievance && !isTenancyGrievance) {
      analysis.category = 'Real Estate / RERA';
      const cleanQueries = (analysis.kanoon_search_queries || []).filter(
        (sq) => !sq.toLowerCase().includes('landlord') && !sq.toLowerCase().includes('tenant')
      );
      if (cleanQueries.length === 0) {
        analysis.kanoon_search_queries = [
          'builder delayed possession flat RERA compensation',
          'Section 18 RERA delayed possession interest compensation',
          'homebuyers delayed possession compensation RERA',
        ];
      } else {
        analysis.kanoon_search_queries = cleanQueries;
      }

      analysis.relevant_acts_anticipated = [
        'Real Estate (Regulation and Development) Act, 2016 (Section 18)',
        'Consumer Protection Act, 2019',
      ];
      return analysis;
    }

    // Guard 3: Cheque Dishonour
    if (q.includes('cheque') || q.includes('bounce') || q.includes('138')) {
      analysis.category = 'Banking & Commercial Law (Section 138 NI Act)';
      return analysis;
    }

    // Guard 4: Consumer Protection
    if (q.includes('consumer') || q.includes('defective') || q.includes('warranty')) {
      analysis.category = 'Consumer Protection';
      return analysis;
    }

    return analysis;
  }

  /**
   * Deterministic Legal Taxonomy & Heuristics Engine
   * Grounded in Indian statutory jurisprudence (Labour, Consumer, Property, Tenancy, RERA, NI Act).
   * Supports English, Telugu, and Telugu-English mixed vernacular (Tanglish).
   */
  static analyzeWithExpertEngine(query, declaredJurisdiction = '', contextOptions = {}) {
    const q = query.toLowerCase();
    const historyCombined = this.isContextualFollowUp(query, contextOptions)
      ? (contextOptions.history || []).map((m) => m.text).join(' ').toLowerCase()
      : '';
    const jurisdiction = declaredJurisdiction || this.detectJurisdiction(q) || this.detectJurisdiction(historyCombined) || 'Central / All India';
    const isTeluguMixed = this.detectTeluguMixed(q) || this.detectTeluguMixed(historyCombined);

    if (/\b(sexual\s+ha(?:r|rr)a(?:s|ss)ment|harassed|unwanted sexual|molestation|molest)\b/i.test(q)) {
      const workplaceContext = /\b(work|workplace|office|employer|colleague|coworker|boss)\b/i.test(q);
      return {
        summary: workplaceContext
          ? 'Workplace sexual harassment concern requiring details about the conduct, dates, and reporting options.'
          : 'Sexual harassment concern; the setting and immediate safety needs are not yet specified.',
        category: workplaceContext ? 'Workplace Sexual Harassment' : 'Sexual Harassment / Safety',
        jurisdiction,
        detected_language: isTeluguMixed ? 'Telugu-English' : 'English',
        legal_issues: ['Sexual harassment and available reporting or support options'],
        extracted_facts: [query],
        missing_information: [
          'Whether you are in immediate danger or need urgent support',
          'Where the harassment occurred (workplace, online, public place, or elsewhere)',
          'When it happened and whether it is ongoing',
          'What outcome or support you are seeking',
        ],
        kanoon_search_queries: [
          workplaceContext ? 'workplace sexual harassment India POSH Act' : 'sexual harassment India legal remedies',
        ],
        relevant_acts_anticipated: workplaceContext
          ? ['Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013']
          : [],
      };
    }

    // 1. Tenancy, Landlord & Security Deposit Disputes
    if (
      q.includes('landlord') ||
      q.includes('tenant') ||
      q.includes('tenancy') ||
      q.includes('security deposit') ||
      (q.includes('deposit') && (q.includes('flat') || q.includes('rent') || q.includes('vacat') || q.includes('house'))) ||
      (q.includes('rent') && (q.includes('ivvatledu') || q.includes('return') || q.includes('refund'))) ||
      ((q.includes('deposit') || q.includes('notice') || q.includes('painting') || q.includes('deduct')) && (historyCombined.includes('tenant') || historyCombined.includes('landlord')))
    ) {
      return {
        summary: 'Tenancy dispute concerning refusal or arbitrary retention of security deposit following vacation of rented premises with due notice.',
        category: 'Tenancy / Rental / Security Deposit dispute',
        jurisdiction: jurisdiction.includes('All India') && isTeluguMixed ? 'Telangana / Andhra Pradesh' : jurisdiction,
        detected_language: isTeluguMixed ? 'Telugu-English' : 'English',
        legal_issues: [
          'Unlawful retention or arbitrary deduction of rental security deposit',
          'Compliance with notice period and vacation of premises',
          'Breach of rental agreement covenant for refund of deposit',
        ],
        extracted_facts: [
          'Tenant leased and occupied residential/commercial premises',
          'Tenant vacated premises after serving notice',
          'Landlord refused or failed to refund the refundable security deposit',
        ],
        missing_information: [
          'Whether a written Rental or Lease Agreement exists detailing deposit refund conditions',
          'Exact notice period served and proof of delivery/acknowledgement',
          'Proof of handover of keys and vacant possession',
          'Whether landlord has communicated written itemized claims of damage or unpaid utilities',
        ],
        kanoon_search_queries: [
          'security deposit landlord tenant refund',
          'landlord refusing refund security deposit tenant vacate',
          'tenant vacate security deposit deduction refund notice',
        ],
        relevant_acts_anticipated: [
          'Transfer of Property Act, 1882 (Section 108)',
          'Indian Contract Act, 1872 (Section 73 - Breach of Contract)',
          'Model Tenancy Act / State Rent Control Act',
        ],
      };
    }

    // 2. Real Estate / Builder Delay (RERA) - Handles English & Telugu-English ("late chesadu", "ivvatledu")
    if (
      q.includes('builder') ||
      q.includes('rera') ||
      q.includes('possession') ||
      q.includes('late chesadu') ||
      (q.includes('flat') && (q.includes('delay') || q.includes('late') || q.includes('handover') || q.includes('allot'))) ||
      (q.includes('apartment') && (q.includes('delay') || q.includes('late') || q.includes('handover')))
    ) {
      return {
        summary: 'Real estate dispute regarding delayed handover of flat possession and compensation under RERA.',
        category: 'Real Estate / RERA',
        jurisdiction: jurisdiction.includes('All India') && isTeluguMixed ? 'Telangana / Andhra Pradesh' : jurisdiction,
        detected_language: isTeluguMixed ? 'Telugu-English' : 'English',
        legal_issues: [
          'Delayed possession beyond agreed date in Agreement for Sale',
          'Right to delay compensation interest or full refund with interest under Section 18 RERA',
          'Remedies before State RERA Authority and Consumer Commission',
        ],
        extracted_facts: [
          'Real estate developer failed to handover property by promised deadline',
          'Developer is refusing statutory compensation or interest for delay',
        ],
        missing_information: [
          'Original possession delivery date specified in Agreement for Sale',
          'Total consideration amount paid to builder till date',
          'Whether the real estate project is registered under State RERA',
          'Whether Occupancy Certificate (OC) or Completion Certificate (CC) has been issued',
        ],
        kanoon_search_queries: [
          'builder delayed possession flat RERA compensation',
          'Section 18 RERA delayed possession interest compensation',
          'homebuyers delayed possession compensation RERA',
        ],
        relevant_acts_anticipated: [
          'Real Estate (Regulation and Development) Act, 2016 (Section 18)',
          'Consumer Protection Act, 2019',
        ],
      };
    }

    // 3. Cheque Bounce / Banking (Section 138 NI Act)
    if (q.includes('cheque') || q.includes('check') || q.includes('bounce') || q.includes('dishonor') || q.includes('138')) {
      return {
        summary: 'Criminal and commercial dispute concerning dishonour of cheque for insufficiency of funds.',
        category: 'Banking & Commercial Law (NI Act)',
        jurisdiction,
        detected_language: isTeluguMixed ? 'Telugu-English' : 'English',
        legal_issues: [
          'Dishonour of cheque for insufficiency of funds or payment stopped',
          'Statutory limitation compliance under Section 138',
          'Recovery of legally enforceable debt',
        ],
        extracted_facts: [
          'A negotiable cheque was presented and returned unpaid by the bank',
        ],
        missing_information: [
          'Exact date when the Bank Return Memo was received',
          'Whether the statutory 15-day demand notice was dispatched within 30 days',
          'Nature of underlying legally enforceable liability or consideration',
        ],
        kanoon_search_queries: [
          '"Section 138" AND "Negotiable Instruments Act" AND "statutory notice"',
          '"bank return memo" AND "limitation period" AND "cheque bounce"',
        ],
        relevant_acts_anticipated: [
          'Negotiable Instruments Act, 1881 (Section 138, 142)',
          'Code of Criminal Procedure, 1973 (Section 190)',
        ],
      };
    }

    // 4. Employment & Labour Disputes
    if (
      q.includes('job') ||
      q.includes('employ') ||
      q.includes('terminat') ||
      q.includes('fire') ||
      q.includes('salary') ||
      q.includes('boss') ||
      q.includes('severance') ||
      q.includes('gratuity') ||
      q.includes('provident fund') ||
      q.includes('resigned') ||
      q.includes('udyogam') ||
      q.includes('jeetham')
    ) {
      const isNoticeIssue = q.includes('notice') || q.includes('immediate') || q.includes('without');
      const isUnpaidSalary = q.includes('salary') || q.includes('wage') || q.includes('unpaid') || q.includes('dues') || q.includes('jeetham');

      return {
        summary: 'Grievance concerning abrupt employment termination and non-compliance with statutory notice or severance procedures.',
        category: 'Employment & Labour Law',
        jurisdiction,
        detected_language: isTeluguMixed ? 'Telugu-English' : 'English',
        legal_issues: [
          isNoticeIssue ? 'Termination without statutory notice period' : 'Wrongful termination of service',
          'Breach of employment contract terms',
          isUnpaidSalary ? 'Non-payment of earned wages and full & final settlement' : 'Non-payment of retrenchment compensation',
        ],
        extracted_facts: [
          'User was discharged from employment',
          isNoticeIssue ? 'Termination occurred without prior notice' : 'Dispute arose surrounding end of employment',
        ],
        missing_information: [
          'Length of continuous employment with the organization',
          'Job role type (whether managerial/supervisory or workman category)',
          'Whether a written appointment letter or employment agreement was signed',
          'Whether a formal written termination letter stating grounds was provided',
        ],
        kanoon_search_queries: [
          '"termination without notice" AND ("workman" OR "retrenchment")',
          '"wrongful dismissal" AND "Section 25F" AND "notice period"',
          '"employment contract" AND "summary dismissal" AND "severance"',
        ],
        relevant_acts_anticipated: [
          'Industrial Disputes Act, 1947 (Section 25F)',
          'State Shops and Commercial Establishments Act',
          'Payment of Wages Act, 1936',
          'Indian Contract Act, 1872',
        ],
      };
    }

    // 5. Consumer Dispute & Defective Goods
    if (
      q.includes('refund') ||
      q.includes('defective') ||
      q.includes('product') ||
      q.includes('amazon') ||
      q.includes('flipkart') ||
      q.includes('warranty') ||
      q.includes('consumer') ||
      q.includes('kharab') ||
      q.includes('vasthu')
    ) {
      return {
        summary: 'Consumer grievance relating to delivery of defective goods or refusal of statutory refund.',
        category: 'Consumer Protection',
        jurisdiction,
        detected_language: isTeluguMixed ? 'Telugu-English' : 'English',
        legal_issues: [
          'Deficiency of service under Consumer Protection Act',
          'Unfair trade practice by seller or marketplace platform',
          'Failure to provide replacement or refund under statutory consumer rights',
        ],
        extracted_facts: [
          'User purchased goods/services that were defective or deficient',
          'Vendor failed to remediate within reasonable notice',
        ],
        missing_information: [
          'Date of purchase and invoice availability',
          'Record of written complaints made to customer service',
          'Warranty period terms and manufacturer vs seller liability',
        ],
        kanoon_search_queries: [
          '"Consumer Protection Act 2019" AND "deficiency in service" AND "refund"',
          '"e-commerce platform" AND "defective goods" AND "unfair trade practice"',
        ],
        relevant_acts_anticipated: [
          'Consumer Protection Act, 2019 (Section 2(11), Section 35)',
          'Consumer Protection (E-Commerce) Rules, 2020',
        ],
      };
    }

    // Without a model or recognizable legal domain, ask for facts instead of guessing.
    return {
      summary: 'The legal issue cannot be classified from the information provided so far.',
      category: 'General Legal Guidance',
      requiresClarification: true,
      clarificationPrompt: 'I want to understand your actual problem before suggesting laws or next steps. What happened, who was involved, where and when did it happen, and what kind of help are you looking for?',
      jurisdiction,
      detected_language: isTeluguMixed ? 'Telugu-English' : 'English',
      legal_issues: [],
      extracted_facts: [query],
      missing_information: [
        'What happened, in your own words?',
        'Who was involved, and where and when did it happen?',
        'What outcome or support are you looking for?',
      ],
      kanoon_search_queries: [],
      relevant_acts_anticipated: [],
      executionMode: 'clarification_required',
    };
  }

  static detectJurisdiction(text) {
    const states = [
      'karnataka', 'telangana', 'delhi', 'maharashtra', 'tamil nadu',
      'uttar pradesh', 'kerala', 'west bengal', 'gujarat', 'rajasthan',
      'haryana', 'punjab', 'andhra pradesh',
    ];
    for (const state of states) {
      if (text.includes(state)) {
        return state.charAt(0).toUpperCase() + state.slice(1);
      }
    }
    return '';
  }

  static isContextualFollowUp(query, contextOptions = {}) {
    const q = (query || '').toLowerCase();
    const history = Array.isArray(contextOptions.history) ? contextOptions.history : [];
    if (history.length === 0) return false;

    // Detect if an entirely new, unrelated topic is introduced (e.g. harassment after tenancy)
    const historyText = history.map((m) => m.text || '').join(' ').toLowerCase();
    const isHarassmentNew = /\b(?:sexual\s+)?ha(?:r|rr)a(?:s|ss)ment\b/i.test(q) && !/harassment/i.test(historyText);
    const isDivorceNew = /\b(divorce|marital separation)\b/i.test(q) && !/divorce|marriage|matrimonial/i.test(historyText);
    if (isHarassmentNew || isDivorceNew) return false;

    const mentionsFollowUp = /\b(it|that|this|they|them|he|she|there|same|also|what about|how about|and then|what if|how much|can (?:he|she|they|i)|what notice|is there|deduct|painting|notice|court|lawyer|action)\b/i.test(q);
    const priorClarification = history.some((message) => message.sender === 'ai' && /where did this happen|are you safe right now|what support|what outcome|please tell me where|mutual consent|contested divorce|please share your state/i.test(message.text || ''));
    const answersClarification = /^(?:my answer:\s*)?(?:it happened\b|at\b|online\b|in\b|on\b|yes\b|no\b|mutual consent\b|contested\b|i am\b|i'm\b)/i.test(q.trim());

    // Same problem continuation
    const hasSharedDomain =
      (/\b(landlord|tenant|tenancy|deposit|rent|flat)\b/i.test(q) && /\b(landlord|tenant|tenancy|deposit|rent|flat)\b/i.test(historyText)) ||
      (/\b(cheque|138|bounce|drawer|bank memo)\b/i.test(q) && /\b(cheque|138|bounce|bank)\b/i.test(historyText)) ||
      (/\b(builder|rera|possession|delay)\b/i.test(q) && /\b(builder|rera|possession)\b/i.test(historyText)) ||
      (/\b(salary|termination|employer|wages|fnf)\b/i.test(q) && /\b(salary|termination|employer|job)\b/i.test(historyText)) ||
      (/\b(consumer|refund|product|defective)\b/i.test(q) && /\b(consumer|refund|product|flipkart|amazon)\b/i.test(historyText));

    return mentionsFollowUp || (priorClarification && answersClarification) || hasSharedDomain;
  }

  static isUnderspecifiedQuery(query) {
    const text = (query || '').trim();
    const bareProblem = /^(?:i have|i am having|i'm having|i am facing|i'm facing)\s+(?:(?:some|a|an)\s+)?(?:[\w'-]+\s+){0,3}(?:problems?|issues?|trouble)[.!?]*$/i.test(text);
    const namesLegalDomain = /\b(divorce|sexual\s+ha(?:r|rr)a(?:s|ss)ment|ha(?:r|rr)a(?:s|ss)(?:ed|ing|ment)|landlord|tenant|tenancy|rental|renting|builder|rera|cheque|employment|consumer|fraud)\b/i.test(text);
    return (bareProblem && !namesLegalDomain) || /^(?:i need help|help me|please help)[.!?]*$/i.test(text);
  }

  static detectTeluguMixed(text) {
    const teluguMarkers = [
      'naa', 'chesadu', 'ivvatledu', 'adugutunnadu', 'cheppadu', 'undhi', 'kadu',
      'evaru', 'enti', 'ela', 'meeru', 'nenu', 'maku', 'dabbu', 'jeetham', 'pani',
      'telugu', 'kadha', 'kavali', 'ivvali',
    ];
    return teluguMarkers.some((marker) => text.includes(marker));
  }
}

export default LegalAnalyzer;
