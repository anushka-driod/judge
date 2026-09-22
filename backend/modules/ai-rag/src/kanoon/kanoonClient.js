/**
 * Indian Kanoon API Client (Phase 2 & RAG Retrieval Interface)
 * Member 3: AI + RAG + Legal Research Lead
 *
 * Connects to IndianKanoonService to retrieve authentic judicial precedents,
 * court rulings, and documents for the RAG pipeline.
 *
 * Strict Compliance:
 * No fabricated legal information. Only returns authentic results from Indian Kanoon.
 */

import IndianKanoonService from '../../../../src/services/indianKanoonService.js';

export class KanoonClient {
  constructor(apiToken = process.env.INDIANKANOON_API_TOKEN || process.env.INDIAN_KANOON_API_TOKEN) {
    this.apiToken = apiToken;
  }

  /**
   * Searches Indian Kanoon for authentic judgments matching formulated query strings.
   * @param {string} query - Boolean or keyword query (e.g. '"termination without notice" "Section 25F"')
   * @param {number} [pageNum=0]
   * @returns {Promise<Array>} List of matching case documents (normalized for RAG)
   */
  async searchJudgments(query, pageNum = 0) {
    try {
      const response = await IndianKanoonService.search({
        query,
        pageNum,
      });

      if (response && Array.isArray(response.results) && response.results.length > 0) {
        return response.results.map(this.normalizeForRag);
      }
      return [];
    } catch (err) {
      console.warn('[KanoonClient] Indian Kanoon search returned:', err.message);
      return [];
    }
  }

  /**
   * Fetches full authentic judgment text by document ID.
   * @param {string|number} docId
   * @returns {Promise<Object|null>}
   */
  async getJudgmentDetails(docId) {
    try {
      const doc = await IndianKanoonService.getDocument(docId);
      return this.normalizeForRag(doc);
    } catch (err) {
      console.warn(`[KanoonClient] Remote doc fetch failed for ${docId}:`, err.message);
      return null;
    }
  }

  /**
   * Normalizes document structure for RAG chunking and vector embeddings
   */
  normalizeForRag(doc) {
    return {
      kanoonId: String(doc.id || doc.tid || ''),
      title: doc.title || 'In re Judicial Precedent',
      court: doc.court || doc.docsource || 'Supreme Court of India',
      publishDate: doc.date || doc.publishDate || 'Unknown',
      citation: doc.citation || (doc.title ? doc.title : `Indian Kanoon Doc ${doc.id || doc.tid}`),
      snippet: doc.snippet || '',
      fullText: doc.fullText || doc.snippet || '',
      sourceUrl: doc.sourceUrl || `https://indiankanoon.org/doc/${doc.id || doc.tid}/`,
      category: doc.category || 'Judicial Precedent',
    };
  }
}

export default KanoonClient;
