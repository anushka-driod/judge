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

export class LegalAnalyzer {
  /**
   * Analyzes an unstructured legal query from a citizen.
   * @param {string} query - Citizen's query in plain words
   * @param {string} [declaredJurisdiction] - User's location/state if known
   * @param {Object} [contextOptions] - Additional context (e.g. history, language)
   * @returns {Promise<Object>} Structured analysis
   */
  static async analyzeQuery(query, declaredJurisdiction = '', contextOptions = {}) {
    if (!query || query.trim().length < 3) {
      throw new Error('Please provide more detail about your legal problem.');
    }

    const trimmedQuery = query.trim();

    // 1. Attempt Centralized Gemini LLM Analysis if configured
    if (geminiClient.isConfigured()) {
      try {
        const historyText = contextOptions.history && Array.isArray(contextOptions.history) && contextOptions.history.length > 0
          ? `\n\nPrevious Case Context:\n${contextOptions.history.slice(-3).map((m) => `${m.sender}: ${m.text}`).join('\n')}`
          : '';

        const prompt = `User Legal Query: "${trimmedQuery}"\nDeclared Jurisdiction: "${declaredJurisdiction || 'Auto-detect'}"${historyText}\n\nAnalyze this legal problem according to Indian jurisprudence and output the structured JSON.`;

        const result = await geminiClient.generateStructured({
          prompt,
          systemInstruction: LEGAL_SYSTEM_PROMPT,
          temperature: 0.1,
          timeoutMs: 20000,
        });

        if (result && result.data && Array.isArray(result.data.kanoon_search_queries) && result.data.kanoon_search_queries.length > 0) {
          const guarded = this.validateAndGuardAnalysis(result.data, trimmedQuery, declaredJurisdiction);
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
    const fallbackResult = this.analyzeWithExpertEngine(trimmedQuery, declaredJurisdiction);
    const guardedFallback = this.validateAndGuardAnalysis(fallbackResult, trimmedQuery, declaredJurisdiction);
    guardedFallback.executionMode = 'deterministic_fallback';
    return guardedFallback;
  }

  /**
   * Semantic Guard & Category Alignment
   * Ensures the legal intent classification stays tightly anchored to the original facts
   * and prevents hallucinations or category drift.
   */
  static validateAndGuardAnalysis(analysis, query, declaredJurisdiction = '') {
    if (!analysis) return this.analyzeWithExpertEngine(query, declaredJurisdiction);
    const q = query.toLowerCase();

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
  static analyzeWithExpertEngine(query, declaredJurisdiction = '') {
    const q = query.toLowerCase();
    const jurisdiction = declaredJurisdiction || this.detectJurisdiction(q) || 'Central / All India';
    const isTeluguMixed = this.detectTeluguMixed(q);

    // 1. Tenancy, Landlord & Security Deposit Disputes
    if (
      q.includes('landlord') ||
      q.includes('tenant') ||
      q.includes('tenancy') ||
      q.includes('security deposit') ||
      (q.includes('deposit') && (q.includes('flat') || q.includes('rent') || q.includes('vacat') || q.includes('house'))) ||
      (q.includes('rent') && (q.includes('ivvatledu') || q.includes('return') || q.includes('refund')))
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

    // General Fallback
    return {
      summary: 'General civil or statutory dispute requiring preliminary legal evaluation.',
      category: 'Civil & Commercial Law',
      jurisdiction,
      detected_language: isTeluguMixed ? 'Telugu-English' : 'English',
      legal_issues: ['Breach of legal duty or obligation', 'Evaluation of legal remedies and forum'],
      extracted_facts: [query],
      missing_information: [
        'Detailed timeline of events leading to dispute',
        'Specific damages or loss suffered',
        'Existence of written contracts or receipts',
      ],
      kanoon_search_queries: [
        query.replace(/[^\w\s]/g, '').slice(0, 45).trim(),
      ],
      relevant_acts_anticipated: ['Code of Civil Procedure, 1908', 'Specific Relief Act, 1963'],
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
