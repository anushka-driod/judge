/**
 * Indian Kanoon API Service
 * Official API Documentation: https://api.indiankanoon.org/documentation/
 *
 * Implements:
 * 1. Legal Search (https://api.indiankanoon.org/search/?formInput=<query>&pagenum=<pagenum>)
 * 2. Document Retrieval (https://api.indiankanoon.org/doc/<docid>/)
 * 3. Document Fragments (https://api.indiankanoon.org/docfragment/<docid>/?formInput=<query>)
 * 4. Document Metadata (https://api.indiankanoon.org/docmeta/<docid>/)
 * 5. Court Copy / Original Doc (https://api.indiankanoon.org/origdoc/<docid>/)
 *
 * Security: The API Token is kept strictly on the backend and never passed to the client.
 */

const BASE_URL = 'https://api.indiankanoon.org';
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Strips HTML tags and unescapes common HTML entities for clean display
 */
function cleanHtmlSnippet(html = '') {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats judgment HTML/text into readable paragraph structures
 */
function formatDocumentBody(rawDoc = '') {
  if (!rawDoc) return '';
  // If rawDoc already has HTML tags (<p>, <div>, <pre>), preserve structure
  if (/<(p|div|br|pre|blockquote)/i.test(rawDoc)) {
    return rawDoc;
  }
  // If plain text, convert double linebreaks into paragraphs
  return rawDoc
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.trim().replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

export class IndianKanoonService {
  /**
   * Resolves the Indian Kanoon API token from backend environment variables.
   * Supports both INDIANKANOON_API_TOKEN and INDIAN_KANOON_API_TOKEN.
   */
  static getApiToken() {
    return (process.env.INDIANKANOON_API_TOKEN || process.env.INDIAN_KANOON_API_TOKEN || '').trim();
  }

  /**
   * Returns standard headers for Indian Kanoon requests.
   * Throws if token is missing.
   */
  static getHeaders() {
    const token = this.getApiToken();
    if (!token) {
      const err = new Error(
        'Indian Kanoon API token is not configured on the server. Please set INDIANKANOON_API_TOKEN in backend/.env'
      );
      err.code = 'TOKEN_MISSING';
      err.status = 503;
      throw err;
    }

    return {
      Authorization: `Token ${token}`,
      Accept: 'application/json',
    };
  }

  /**
   * Safe fetch with timeout and error translation
   */
  static async executeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 403) {
          const err = new Error('Indian Kanoon API authentication failed. Please verify your API token.');
          err.code = 'AUTH_FAILED';
          err.status = 403;
          throw err;
        }

        if (response.status === 404) {
          const err = new Error('The requested legal document was not found on Indian Kanoon.');
          err.code = 'NOT_FOUND';
          err.status = 404;
          throw err;
        }

        if (response.status === 429) {
          const err = new Error('Indian Kanoon API rate limit exceeded. Please try again shortly.');
          err.code = 'RATE_LIMITED';
          err.status = 429;
          throw err;
        }

        const errorText = await response.text().catch(() => '');
        const err = new Error(`Indian Kanoon API responded with status ${response.status}: ${errorText.slice(0, 150)}`);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Indian Kanoon API request timed out after 15 seconds.');
        timeoutErr.code = 'TIMEOUT';
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      throw err;
    }
  }

  /**
   * 1. Legal Search
   * Documentation: https://api.indiankanoon.org/search/?formInput=<query>&pagenum=<pagenum>
   *
   * @param {Object} params
   * @param {string} params.query - Search query (supports words, phrases in quotes, ANDD/ORR/NOTT)
   * @param {number} [params.pageNum=0] - 0-indexed page number
   * @param {string} [params.doctypes] - Filter by court or category (e.g. 'supremecourt', 'highcourts', 'judgments')
   * @param {string} [params.fromdate] - DD-MM-YYYY
   * @param {string} [params.todate] - DD-MM-YYYY
   * @param {string} [params.title] - Words in title
   * @param {string} [params.cite] - Citation filter
   * @param {string} [params.author] - Author/judge
   * @param {string} [params.bench] - Bench members
   * @param {number} [params.maxcites] - Maximum citations per doc (up to 50)
   * @param {number} [params.maxpages] - Maximum pages to retrieve
   * @returns {Promise<Object>} Normalized search results
   */
  static async search({
    query,
    pageNum = 0,
    doctypes,
    fromdate,
    todate,
    title,
    cite,
    author,
    bench,
    maxcites,
    maxpages,
  }) {
    if (!query || !query.trim()) {
      const err = new Error('Search query (formInput) cannot be empty.');
      err.code = 'INVALID_QUERY';
      err.status = 400;
      throw err;
    }

    const trimmedQuery = query.trim();
    const headers = this.getHeaders();

    const queryParams = new URLSearchParams();
    queryParams.set('formInput', trimmedQuery);
    queryParams.set('pagenum', String(Math.max(0, parseInt(pageNum, 10) || 0)));

    if (doctypes) queryParams.set('doctypes', doctypes);
    if (fromdate) queryParams.set('fromdate', fromdate);
    if (todate) queryParams.set('todate', todate);
    if (title) queryParams.set('title', title);
    if (cite) queryParams.set('cite', cite);
    if (author) queryParams.set('author', author);
    if (bench) queryParams.set('bench', bench);
    if (maxcites) queryParams.set('maxcites', String(maxcites));
    if (maxpages) queryParams.set('maxpages', String(maxpages));

    const url = `${BASE_URL}/search/?${queryParams.toString()}`;

    // Indian Kanoon official AJAX documentation shows POST method to /search/?formInput=...
    const rawData = await this.executeRequest(url, {
      method: 'POST',
      headers,
    });

    return this.normalizeSearchResponse(rawData, trimmedQuery, pageNum);
  }

  /**
   * 2. Fetch specific judgment or document by ID
   * Documentation: https://api.indiankanoon.org/doc/<docid>/
   *
   * @param {string|number} docId - The Indian Kanoon document ID (tid)
   * @param {Object} [options]
   * @param {number} [options.maxcites] - Citations count (up to 50)
   * @param {number} [options.maxcitedby] - Cited-by count (up to 50)
   * @returns {Promise<Object>} Normalized document object
   */
  static async getDocument(docId, { maxcites, maxcitedby } = {}) {
    if (!docId) {
      const err = new Error('Document ID (docid) is required.');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const cleanDocId = encodeURIComponent(String(docId).trim());
    const headers = this.getHeaders();

    const queryParams = new URLSearchParams();
    if (maxcites) queryParams.set('maxcites', String(maxcites));
    if (maxcitedby) queryParams.set('maxcitedby', String(maxcitedby));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const url = `${BASE_URL}/doc/${cleanDocId}/${queryString}`;

    const rawData = await this.executeRequest(url, {
      method: 'POST',
      headers,
    });

    return this.normalizeDocument(rawData, cleanDocId);
  }

  /**
   * 3. Fetch Document Fragments containing query
   * Documentation: https://api.indiankanoon.org/docfragment/<docid>/?formInput=<query>
   *
   * @param {string|number} docId
   * @param {string} query
   * @returns {Promise<Object>} Normalized fragment result
   */
  static async getDocumentFragments(docId, query = '') {
    if (!docId) {
      const err = new Error('Document ID (docid) is required.');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const cleanDocId = encodeURIComponent(String(docId).trim());
    const headers = this.getHeaders();
    const url = `${BASE_URL}/docfragment/${cleanDocId}/?formInput=${encodeURIComponent(query || '')}`;

    const rawData = await this.executeRequest(url, {
      method: 'POST',
      headers,
    });

    return {
      id: String(rawData.tid || cleanDocId),
      title: cleanHtmlSnippet(rawData.title || ''),
      query: rawData.formInput || query,
      headline: rawData.headline || '',
      cleanHeadline: cleanHtmlSnippet(rawData.headline || ''),
      source: 'Indian Kanoon',
      sourceUrl: `https://indiankanoon.org/doc/${cleanDocId}/`,
    };
  }

  /**
   * 4. Fetch Document Metainfo
   * Documentation: https://api.indiankanoon.org/docmeta/<docid>/
   *
   * @param {string|number} docId
   * @returns {Promise<Object>}
   */
  static async getDocumentMetadata(docId) {
    if (!docId) {
      const err = new Error('Document ID (docid) is required.');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const cleanDocId = encodeURIComponent(String(docId).trim());
    const headers = this.getHeaders();
    const url = `${BASE_URL}/docmeta/${cleanDocId}/`;

    const rawData = await this.executeRequest(url, {
      method: 'POST',
      headers,
    });

    return {
      id: String(rawData.tid || cleanDocId),
      title: cleanHtmlSnippet(rawData.title || ''),
      court: rawData.docsource || rawData.court || 'Court Record',
      publishDate: rawData.publishdate || null,
      citation: rawData.citation || null,
      citeList: rawData.citeList || [],
      citedbyList: rawData.citedbyList || [],
      sourceUrl: `https://indiankanoon.org/doc/${cleanDocId}/`,
      rawMetadata: rawData,
    };
  }

  /**
   * 5. Court Copy / Original Document
   * Documentation: https://api.indiankanoon.org/origdoc/<docid>/
   *
   * @param {string|number} docId
   */
  static async getCourtCopy(docId) {
    if (!docId) throw new Error('Document ID is required.');
    const cleanDocId = encodeURIComponent(String(docId).trim());
    const headers = this.getHeaders();
    const url = `${BASE_URL}/origdoc/${cleanDocId}/`;

    return this.executeRequest(url, {
      method: 'POST',
      headers,
    });
  }

  /**
   * Normalizes Indian Kanoon search response into clean Vidhi Setu schema
   */
  static normalizeSearchResponse(rawData, query, pageNum) {
    const rawDocs = Array.isArray(rawData?.docs) ? rawData.docs : [];
    const totalFound = typeof rawData?.found === 'number' ? rawData.found : rawDocs.length;

    const results = rawDocs.map((doc) => {
      const docId = String(doc.tid || doc.docid || doc.id || '');
      const rawHeadline = doc.headline || '';
      const cleanSnippet = cleanHtmlSnippet(rawHeadline);
      const cleanTitle = cleanHtmlSnippet(doc.title || 'In re Judicial Precedent');

      return {
        id: docId,
        title: cleanTitle,
        court: doc.docsource || 'Court Record',
        date: doc.publishdate || null,
        snippet: cleanSnippet,
        headlineHtml: rawHeadline,
        docsize: doc.docsize || 0,
        citation: doc.citation || null,
        source: 'Indian Kanoon',
        sourceUrl: `https://indiankanoon.org/doc/${docId}/`,
        metadata: {
          numcites: doc.numcites || 0,
          numcitedby: doc.numcitedby || 0,
          docsize: doc.docsize || 0,
        },
      };
    });

    return {
      query,
      pageNum: parseInt(pageNum, 10) || 0,
      totalFound,
      count: results.length,
      categories: rawData?.categories || [],
      results,
    };
  }

  /**
   * Normalizes document data into clean internal structure
   */
  static normalizeDocument(rawData, fallbackDocId) {
    const docId = String(rawData.tid || rawData.docid || fallbackDocId);
    const cleanTitle = cleanHtmlSnippet(rawData.title || 'Court Judgment');
    const court = rawData.docsource || rawData.court || 'Court Record';
    const publishDate = rawData.publishdate || null;
    const bodyContent = formatDocumentBody(rawData.doc || rawData.full_text || rawData.text || '');

    return {
      id: docId,
      title: cleanTitle,
      court,
      publishDate,
      citation: rawData.citation || null,
      author: rawData.author || null,
      bench: rawData.bench || null,
      fullText: bodyContent,
      citeList: Array.isArray(rawData.citeList) ? rawData.citeList : [],
      citedbyList: Array.isArray(rawData.citedbyList) ? rawData.citedbyList : [],
      source: 'Indian Kanoon',
      sourceUrl: `https://indiankanoon.org/doc/${docId}/`,
      metadata: {
        docsize: rawData.docsize || bodyContent.length,
        numcites: rawData.numcites || (rawData.citeList?.length || 0),
        numcitedby: rawData.numcitedby || (rawData.citedbyList?.length || 0),
      },
    };
  }
}

export default IndianKanoonService;
