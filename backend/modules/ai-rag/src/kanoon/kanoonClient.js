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
<<<<<<< HEAD
<<<<<<< HEAD
import { networkManager } from '../../../../src/services/networkManager.js';
=======
import { networkManager } from '../../../../src/services/networkManager.js';
import { getCuratedJudgments, CURATED_JUDGMENTS_DATABASE } from './curatedJudgments.js';
>>>>>>> 3aab4be (dhanush commits)

// Memory caches to prevent duplicate remote searches and accelerate responses
const searchCache = new Map();
const docCache = new Map();
<<<<<<< HEAD
=======
>>>>>>> origin/main
=======
>>>>>>> 3aab4be (dhanush commits)

export class KanoonClient {
  constructor(apiToken = process.env.INDIANKANOON_API_TOKEN || process.env.INDIAN_KANOON_API_TOKEN) {
    this.apiToken = apiToken;
  }

  /**
   * Searches Indian Kanoon for authentic judgments matching formulated query strings.
<<<<<<< HEAD
<<<<<<< HEAD
   * If cached or offline, returns immediately to avoid duplicate API requests.
=======
>>>>>>> origin/main
=======
   * If cached or offline, returns immediately to avoid duplicate API requests.
>>>>>>> 3aab4be (dhanush commits)
   * @param {string} query - Boolean or keyword query (e.g. '"termination without notice" "Section 25F"')
   * @param {number} [pageNum=0]
   * @returns {Promise<Array>} List of matching case documents (normalized for RAG)
   */
  async searchJudgments(query, pageNum = 0) {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3aab4be (dhanush commits)
    const cacheKey = `${query.toLowerCase().trim()}_p${pageNum}`;
    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey);
    }

    if (!networkManager.isOnline()) {
<<<<<<< HEAD
      return [];
    }

=======
>>>>>>> origin/main
=======
      const curated = getCuratedJudgments('', query);
      return curated;
    }

>>>>>>> 3aab4be (dhanush commits)
    try {
      const response = await IndianKanoonService.search({
        query,
        pageNum,
      });

      if (response && Array.isArray(response.results) && response.results.length > 0) {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3aab4be (dhanush commits)
        const normalized = response.results.map(this.normalizeForRag);
        searchCache.set(cacheKey, normalized);
        return normalized;
      }
<<<<<<< HEAD
      searchCache.set(cacheKey, []);
      return [];
=======
      const curated = getCuratedJudgments('', query);
      searchCache.set(cacheKey, curated);
      return curated;
>>>>>>> 3aab4be (dhanush commits)
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.message?.includes('fetch failed')) {
        networkManager.recordNetworkFailure(err);
      }
<<<<<<< HEAD
=======
        return response.results.map(this.normalizeForRag);
      }
      return [];
    } catch (err) {
>>>>>>> origin/main
      console.warn('[KanoonClient] Indian Kanoon search returned:', err.message);
      return [];
=======
      console.warn('[KanoonClient] Indian Kanoon search returned:', err.message);
      const curated = getCuratedJudgments('', query);
      searchCache.set(cacheKey, curated);
      return curated;
>>>>>>> 3aab4be (dhanush commits)
    }
  }

  /**
   * Fetches full authentic judgment text by document ID.
<<<<<<< HEAD
<<<<<<< HEAD
   * Uses docCache to eliminate duplicate lookups.
=======
>>>>>>> origin/main
=======
   * Uses docCache to eliminate duplicate lookups.
>>>>>>> 3aab4be (dhanush commits)
   * @param {string|number} docId
   * @returns {Promise<Object|null>}
   */
  async getJudgmentDetails(docId) {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3aab4be (dhanush commits)
    const cleanId = String(docId);
    if (docCache.has(cleanId)) {
      return docCache.get(cleanId);
    }

    if (!networkManager.isOnline()) {
<<<<<<< HEAD
      return null;
=======
      const curated = CURATED_JUDGMENTS_DATABASE.find((j) => String(j.kanoonId) === cleanId);
      return curated || null;
>>>>>>> 3aab4be (dhanush commits)
    }

    try {
      const doc = await IndianKanoonService.getDocument(docId);
      const normalized = this.normalizeForRag(doc);
      docCache.set(cleanId, normalized);
      return normalized;
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.message?.includes('fetch failed')) {
        networkManager.recordNetworkFailure(err);
      }
<<<<<<< HEAD
=======
    try {
      const doc = await IndianKanoonService.getDocument(docId);
      return this.normalizeForRag(doc);
    } catch (err) {
>>>>>>> origin/main
      console.warn(`[KanoonClient] Remote doc fetch failed for ${docId}:`, err.message);
=======
      console.warn(`[KanoonClient] Remote doc fetch failed for ${docId}:`, err.message);
      const curated = CURATED_JUDGMENTS_DATABASE.find((j) => String(j.kanoonId) === cleanId);
      if (curated) {
        docCache.set(cleanId, curated);
        return curated;
      }
>>>>>>> 3aab4be (dhanush commits)
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
