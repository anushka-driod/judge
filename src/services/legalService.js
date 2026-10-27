import { request } from './api';

export const legalService = {
  /**
   * Search Indian Kanoon for judgments and legal documents.
   * @param {string} query - Legal dispute terms or keywords
   * @param {Object} [options]
   * @param {number} [options.page=0] - Page number (0-indexed)
   * @param {string} [options.doctypes] - Filter courts (e.g. 'supremecourt', 'highcourts')
   * @param {string} [options.fromdate] - 'DD-MM-YYYY'
   * @param {string} [options.todate] - 'DD-MM-YYYY'
   * @param {string} [options.title] - Title filter
   * @param {string} [options.cite] - Citation filter
   * @returns {Promise<Object>} Search results with normalized judgment cards
   */
  async searchJudgments(query, options = {}) {
    if (!query || !query.trim()) {
      return { totalFound: 0, results: [], categories: [] };
    }

    const params = new URLSearchParams();
    params.set('q', query.trim());
    params.set('page', String(options.page || 0));

    if (options.doctypes) params.set('doctypes', options.doctypes);
    if (options.fromdate) params.set('fromdate', options.fromdate);
    if (options.todate) params.set('todate', options.todate);
    if (options.title) params.set('title', options.title);
    if (options.cite) params.set('cite', options.cite);
    if (options.author) params.set('author', options.author);
    if (options.bench) params.set('bench', options.bench);

    return request(`/legal/search?${params.toString()}`);
  },

  /**
   * Fetch full document text, court details, and citations by Indian Kanoon doc ID.
   * @param {string|number} docId
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async getJudgmentDocument(docId, options = {}) {
    if (!docId) throw new Error('Document ID is required');

    const params = new URLSearchParams();
    if (options.maxcites) params.set('maxcites', String(options.maxcites));
    if (options.maxcitedby) params.set('maxcitedby', String(options.maxcitedby));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await request(`/legal/document/${encodeURIComponent(docId)}${qs}`);
    return data?.document || data;
  },

  /**
   * Fetch document fragments highlighting query occurrence.
   * @param {string|number} docId
   * @param {string} query
   * @returns {Promise<Object>}
   */
  async getJudgmentFragments(docId, query = '') {
    if (!docId) throw new Error('Document ID is required');
    const params = new URLSearchParams();
    if (query) params.set('q', query);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await request(`/legal/document/${encodeURIComponent(docId)}/fragments${qs}`);
    return data?.fragments || data;
  },

  /**
   * Fetch case-specific AI analysis (facts, legal issues, reasoning, holding, outcome, citations).
   * @param {string|number} docId
   * @param {Object} [options]
   * @param {string} [options.language]
   * @returns {Promise<Object>}
   */
  async analyzeJudgment(docId, options = {}) {
    if (!docId) throw new Error('Document ID is required');
    const params = new URLSearchParams();
    if (options.language) params.set('lang', options.language);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await request(`/legal/document/${encodeURIComponent(docId)}/analysis${qs}`);
    return data?.analysis || data;
  },

  /**
   * Return the URL to stream or download printable official Judgment Analysis PDF / Dossier.
   * @param {string|number} docId
   * @param {string} [language]
   * @returns {string}
   */
  getJudgmentPdfUrl(docId, language = 'en') {
    const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
    return `${base}/legal/document/${encodeURIComponent(docId)}/pdf?lang=${encodeURIComponent(language)}`;
  },
};

export default legalService;
