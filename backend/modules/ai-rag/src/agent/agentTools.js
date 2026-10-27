/**
 * Permitted Agent Tools for VidhiSetu Legal AI Agent
 * Member 3: AI + RAG + Legal Research Architecture
 */

import { KanoonClient } from '../kanoon/kanoonClient.js';
import ConversationModel from '../../../../src/models/conversationModel.js';
import { matchLegalDomain } from '../knowledge/legalDomains.js';

export const AgentTools = {
  /**
   * 1. Search Statutory Indian Laws & Relevant Sections
   */
  async search_laws_and_statutes({ query, category }) {
    try {
      const domain = matchLegalDomain(query, category);
      if (domain && Array.isArray(domain.acts) && domain.acts.length > 0) {
        const statutes = domain.acts.map((a) => ({
          act: a.act,
          section: a.section,
          title: `${a.section} - ${a.act}`,
          plainMeaning: a.plainMeaning,
          applicability: a.applicability,
        }));
        return {
          tool: 'search_laws_and_statutes',
          query,
          category: domain.category,
          foundCount: statutes.length,
          statutes,
          retrievalStatus: 'retrieved',
        };
      }
    } catch (err) {
      console.warn('[AgentTools] Statutory lookup error:', err.message);
    }

    return {
      tool: 'search_laws_and_statutes',
      query,
      foundCount: 0,
      statutes: [],
      retrievalStatus: 'no_statutes_found',
      message: 'No specific statutory provisions identified for this query.',
    };
  },

  /**
   * 2. Search Indian Kanoon Court Precedents
   */
  async search_kanoon_precedents({ query, maxResults = 3 }) {
    let results = [];
    try {
      const client = new KanoonClient();
      const retrieved = await client.searchJudgments(query);
      if (Array.isArray(retrieved) && retrieved.length > 0) {
        results = retrieved.slice(0, maxResults).map((j) => ({
          title: j.title,
          court: j.court,
          citation: j.citation,
          excerpt: j.snippet || j.keyExtract || '',
          ratio: j.whyRelevant || j.snippet || '',
          url: j.sourceUrl,
        }));
      }
      if (results.length === 0) {
        const domain = matchLegalDomain(query);
        if (domain && Array.isArray(domain.precedents) && domain.precedents.length > 0) {
          results = domain.precedents.slice(0, maxResults).map((j) => ({
            title: j.title,
            court: j.court,
            citation: j.citation,
            excerpt: j.keyExtract || j.snippet || '',
            ratio: j.whyRelevant || j.keyExtract || '',
            url: j.sourceUrl,
          }));
        }
      }
    } catch (err) {
      console.warn('[AgentTools] Remote Kanoon search failed:', err.message);
      const domain = matchLegalDomain(query);
      if (domain && Array.isArray(domain.precedents) && domain.precedents.length > 0) {
        results = domain.precedents.slice(0, maxResults).map((j) => ({
          title: j.title,
          court: j.court,
          citation: j.citation,
          excerpt: j.keyExtract || j.snippet || '',
          ratio: j.whyRelevant || j.keyExtract || '',
          url: j.sourceUrl,
        }));
      }
    }

    return {
      tool: 'search_kanoon_precedents',
      query,
      retrievedCount: results.length,
      precedents: results,
      retrievalStatus: results.length > 0 ? 'retrieved' : 'no_precedents_found',
    };
  },

  /**
   * 3. Retrieve Authorized Conversation History
   */
  async get_conversation_history({ conversationId, userId, limit = 5 }) {
    if (!conversationId || !userId) {
      return { tool: 'get_conversation_history', count: 0, turnCount: 0, recentMessages: [] };
    }
    try {
      const messages = await ConversationModel.getMessages(conversationId, userId);
      const count = Array.isArray(messages) ? messages.length : 0;
      return {
        tool: 'get_conversation_history',
        conversationId,
        count,
        turnCount: count,
        recentMessages: (messages || []).slice(-limit).map((m) => ({
          sender: m.sender,
          text: (m.text || '').slice(0, 300),
          timestamp: m.timestamp,
        })),
      };
    } catch (_) {
      return { tool: 'get_conversation_history', count: 0, turnCount: 0, recentMessages: [] };
    }
  },

  /**
   * 4. Create Action Plan Item in Database/Case
   */
  async prepare_case_action_item({ caseId, title, priority = 'normal' }) {
    const actionItem = {
      caseId: caseId || null,
      title,
      priority,
      status: 'suggested',
    };

    return {
      tool: 'prepare_case_action_item',
      actionSaved: false,
      persistenceStatus: 'not_saved',
      actionItem,
    };
  },

  /**
   * 5. Draft Pre-Litigation Legal Notice
   */
  async draft_legal_notice({ recipientName, amount, grievance, demandDays = 15, statuteRef }) {
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedAmount = amount ? (String(amount).startsWith('₹') ? String(amount) : `₹${amount}`) : '[Specify Demand Amount]';
    const recipient = recipientName || '[Recipient name and address]';
    const daysWord = demandDays === 15 ? 'fifteen' : demandDays;
    const curePeriod = `${demandDays} (${daysWord}) days`;

    const noticeTemplate = `
EDITABLE STATUTORY LEGAL NOTICE TEMPLATE — NOT SENT OR LEGALLY REVIEWED

Date: ${today}

TO:
${recipient}

SUBJECT: STATUTORY LEGAL DEMAND NOTICE UNDER ${statuteRef ? statuteRef.toUpperCase() : 'APPLICABLE INDIAN STATUTES'}

Sir/Madam,

Under instructions from and on behalf of my client / the aggrieved party, this statutory legal notice is hereby served upon you:

1. Relevant Transaction / Agreement:
   "${grievance || '[Describe the relevant facts, transaction, and covenants]'}".

2. Breach and Monetary Liability:
   You have wrongfully failed and neglected to refund / pay the legitimate sum of ${formattedAmount}. You are hereby called upon to pay ${formattedAmount} within ${curePeriod} from the receipt of this notice.

3. Statutory Recourse:
   In the event of failure to pay ${formattedAmount} within ${curePeriod}, appropriate civil and criminal proceedings under ${statuteRef || 'the applicable law'} will be initiated against ${recipient} at your sole risk, cost, and legal consequences.

Sincerely,
[Sender / Counsel Name and Contact Details]
    `.trim();

    return {
      tool: 'draft_legal_notice',
      noticeDrafted: true,
      noticeSent: false,
      requiresAdvocateReview: true,
      recipientName: recipient,
      amount: formattedAmount,
      statuteRef: statuteRef || 'Applicable Indian Statute',
      noticeText: noticeTemplate,
    };
  },

  /**
   * 6. Calculate Limitation Deadlines under Limitation Act, 1963
   */
  async calculate_limitation_deadline({ eventDate, causeOfAction = '' }) {
    const validDate = eventDate ? new Date(eventDate) : null;
    if (validDate && !Number.isFinite(validDate.getTime())) {
      throw new Error('A valid event date is required to calculate an indicative deadline.');
    }

    const coa = (causeOfAction || '').toLowerCase();
    let limitationYears = 3;
    let statutoryRule = 'Article 113 of Limitation Act, 1963: 3 years from the date when right to sue accrues.';
    let calculatedDeadline = null;

    if (validDate) {
      if (coa.includes('cheque') || coa.includes('dishonour') || coa.includes('138') || coa.includes('memo')) {
        limitationYears = 0.2;
        statutoryRule = 'Section 138 & 142 of Negotiable Instruments Act, 1881: Issue 15-day notice within 30 days of bank memo; file complaint within 30 days of cause of action.';
        const d = new Date(validDate);
        d.setDate(d.getDate() + 75);
        calculatedDeadline = d.toISOString().split('T')[0];
      } else if (coa.includes('consumer') || coa.includes('defect') || coa.includes('cpa')) {
        limitationYears = 2;
        statutoryRule = 'Section 69 of Consumer Protection Act, 2019: 2 years from the date on which cause of action arose.';
        const d = new Date(validDate);
        d.setFullYear(d.getFullYear() + 2);
        calculatedDeadline = d.toISOString().split('T')[0];
      } else {
        const d = new Date(validDate);
        d.setFullYear(d.getFullYear() + limitationYears);
        calculatedDeadline = d.toISOString().split('T')[0];
      }
    }

    return {
      tool: 'calculate_limitation_deadline',
      eventDate: validDate?.toISOString().split('T')[0] || null,
      causeOfAction: causeOfAction || null,
      limitationYears,
      calculatedDeadline,
      needsEventDate: !validDate,
      needsLegalReview: true,
      statutoryRule,
    };
  },

  /**
   * 7. Discover Real Verified Advocates (VidhiSetu Registry + High Court Bar Registries)
   */
  async discover_advocates({ query, category, city, maxResults = 4 }) {
    try {
      const AdvocateDiscoveryService = (await import('./advocateDiscoveryService.js')).default;
      return await AdvocateDiscoveryService.discoverAdvocates({
        query,
        category,
        city,
        maxResults,
      });
    } catch (err) {
      console.warn('[AgentTools] discover_advocates error:', err.message);
      return {
        tool: 'discover_advocates',
        query,
        foundCount: 0,
        advocates: [],
        retrievalStatus: 'unavailable',
        message: 'Advocate discovery directory temporarily unavailable.',
      };
    }
  },
};

export default AgentTools;

