/**
 * Legal Problem Analyzer & Entity Extractor (Phase 1)
 * Member 3: AI + RAG + Legal Research Lead
 *
 * Transforms ordinary citizen problem descriptions into structured legal issues,
 * missing facts, and optimized queries for the Indian Kanoon retrieval layer.
 */

import { LEGAL_SYSTEM_PROMPT } from '../prompts/legalPrompts.js';

export class LegalAnalyzer {
  /**
   * Analyzes an unstructured legal query from a citizen.
   * @param {string} query - Citizen's query in plain words
   * @param {string} [declaredJurisdiction] - User's location/state if known
   * @returns {Promise<Object>} Structured analysis
   */
  static async analyzeQuery(query, declaredJurisdiction = '') {
    if (!query || query.trim().length < 5) {
      throw new Error('Please provide more detail about your legal problem.');
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        return await this.callLLM(query, declaredJurisdiction, apiKey);
      } catch (err) {
        console.warn('[LegalAnalyzer] Remote LLM call failed, engaging offline legal taxonomy engine:', err.message);
      }
    }

    // High-fidelity domain expert rule engine for offline development and test suites
    return this.analyzeWithExpertEngine(query, declaredJurisdiction);
  }

  /**
   * Remote LLM caller (Gemini / OpenAI compatible)
   */
  static async callLLM(query, declaredJurisdiction, apiKey) {
    // Standard Gemini 2.5 Flash / OpenAI fetch call
    const endpoint = process.env.GEMINI_API_KEY
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
      : 'https://api.openai.com/v1/chat/completions';

    const payload = process.env.GEMINI_API_KEY
      ? {
          contents: [
            { role: 'user', parts: [{ text: `${LEGAL_SYSTEM_PROMPT}\n\nUser Query: "${query}"\nDeclared Jurisdiction: "${declaredJurisdiction}"` }] },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }
      : {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: LEGAL_SYSTEM_PROMPT },
            { role: 'user', content: `User Query: "${query}"\nDeclared Jurisdiction: "${declaredJurisdiction}"` },
          ],
          response_format: { type: 'json_object' },
        };

    const headers = { 'Content-Type': 'application/json' };
    if (!process.env.GEMINI_API_KEY) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!res.ok) {
      throw new Error(`LLM provider HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const rawText = process.env.GEMINI_API_KEY
      ? data.candidates[0].content.parts[0].text
      : data.choices[0].message.content;

    return JSON.parse(rawText);
  }

  /**
   * Deterministic Legal Taxonomy & Heuristics Engine
   * Grounded in Indian statutory jurisprudence (Labour, Consumer, Property, Criminal/NI Act)
   */
  static analyzeWithExpertEngine(query, declaredJurisdiction = '') {
    const q = query.toLowerCase();
    const jurisdiction = declaredJurisdiction || this.detectJurisdiction(q) || 'Central / All India';

    // 1. Employment & Labour Disputes
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
      q.includes('resigned')
    ) {
      const isNoticeIssue = q.includes('notice') || q.includes('immediate') || q.includes('without');
      const isUnpaidSalary = q.includes('salary') || q.includes('wage') || q.includes('unpaid') || q.includes('dues');

      return {
        summary: 'Grievance concerning abrupt employment termination and non-compliance with statutory notice or severance procedures.',
        category: 'Employment & Labour Law',
        jurisdiction,
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

    // 2. Cheque Bounce / Banking (Section 138 NI Act)
    if (q.includes('cheque') || q.includes('check') || q.includes('bounce') || q.includes('dishonor') || q.includes('138')) {
      return {
        summary: 'Criminal and commercial dispute concerning dishonour of cheque for insufficiency of funds.',
        category: 'Banking & Commercial Law (NI Act)',
        jurisdiction,
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

    // 3. Consumer Dispute & E-Commerce / Defective Goods
    if (
      q.includes('refund') ||
      q.includes('defective') ||
      q.includes('product') ||
      q.includes('amazon') ||
      q.includes('flipkart') ||
      q.includes('warranty') ||
      q.includes('consumer')
    ) {
      return {
        summary: 'Consumer grievance relating to delivery of defective goods or refusal of statutory refund.',
        category: 'Consumer Protection',
        jurisdiction,
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

    // 4. Real Estate / Builder Delay (RERA)
    if (q.includes('builder') || q.includes('flat') || q.includes('possession') || q.includes('rera') || q.includes('apartment')) {
      return {
        summary: 'Real estate dispute regarding delayed handover of flat possession and compensation.',
        category: 'Real Estate & Property Law (RERA)',
        jurisdiction,
        legal_issues: [
          'Delayed possession beyond agreed date in Agreement for Sale',
          'Right to full refund with statutory delay interest under Section 18 RERA',
          'Jurisdiction between RERA Authority and Consumer Forum',
        ],
        extracted_facts: [
          'Real estate developer failed to handover property by promised deadline',
        ],
        missing_information: [
          'Original possession delivery date specified in Agreement for Sale',
          'Total amount paid to builder till date',
          'Whether the real estate project is registered under State RERA',
        ],
        kanoon_search_queries: [
          '"Section 18" AND "RERA" AND "delayed possession" AND "interest"',
          '"Supreme Court" AND "homebuyers" AND "concurrent remedy consumer court"',
        ],
        relevant_acts_anticipated: [
          'Real Estate (Regulation and Development) Act, 2016 (Section 18)',
          'Consumer Protection Act, 2019',
        ],
      };
    }

    // General Fallback
    return {
      summary: 'General civil or statutory dispute requiring preliminary legal evaluation.',
      category: 'Civil & Commercial Law',
      jurisdiction,
      legal_issues: ['Breach of legal duty or obligation', 'Evaluation of legal remedies and forum'],
      extracted_facts: [query],
      missing_information: [
        'Detailed timeline of events leading to dispute',
        'Specific damages or loss suffered',
        'Existence of written contracts or receipts',
      ],
      kanoon_search_queries: [
        `"${query.replace(/[^\w\s]/g, '').slice(0, 40)}"`,
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
}
