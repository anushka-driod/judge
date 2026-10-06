import IndianKanoonService from '../services/indianKanoonService.js';
<<<<<<< HEAD
=======
import { getCuratedJudgments, CURATED_JUDGMENTS_DATABASE } from '../../modules/ai-rag/src/kanoon/curatedJudgments.js';
>>>>>>> 3aab4be (dhanush commits)

export class LegalController {
  /**
   * GET /api/legal/search
   * Query params:
   * - q / query / formInput (required)
   * - page / pagenum (optional, default 0)
   * - doctypes, fromdate, todate, title, cite, author, bench, maxcites, maxpages
   */
  static async searchJudgments(req, res) {
    const rawQuery = req.query.q || req.query.query || req.query.formInput || '';
    const pageNum = req.query.page || req.query.pagenum || 0;

    if (!rawQuery || !rawQuery.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Search query parameter (q or formInput) is required.',
      });
    }

    try {
      const results = await IndianKanoonService.search({
        query: rawQuery,
        pageNum,
        doctypes: req.query.doctypes,
        fromdate: req.query.fromdate,
        todate: req.query.todate,
        title: req.query.title,
        cite: req.query.cite,
        author: req.query.author,
        bench: req.query.bench,
        maxcites: req.query.maxcites,
        maxpages: req.query.maxpages,
      });

      return res.json({
        success: true,
        ...results,
      });
    } catch (err) {
<<<<<<< HEAD
=======
      if ((err.code === 'TOKEN_MISSING' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') && process.env.USE_MEMORY_FALLBACK === 'true') {
        const curated = getCuratedJudgments('', rawQuery);
        const results = curated.map((j) => ({
          id: String(j.kanoonId),
          title: j.title,
          court: j.court,
          date: j.publishDate,
          snippet: j.snippet,
          headlineHtml: `<p>${j.snippet}</p>`,
          docsize: (j.fullText || j.snippet).length,
          citation: j.citation,
          source: 'Indian Kanoon',
          sourceUrl: j.sourceUrl,
          metadata: { numcites: 10, numcitedby: 25, docsize: (j.fullText || j.snippet).length },
        }));
        return res.json({
          success: true,
          query: rawQuery,
          pageNum: parseInt(pageNum, 10) || 0,
          totalFound: results.length,
          count: results.length,
          categories: [],
          results,
        });
      }
>>>>>>> 3aab4be (dhanush commits)
      console.error('[LegalController] Indian Kanoon search error:', err.message);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.message,
        code: err.code || 'SEARCH_FAILED',
      });
    }
  }

  /**
   * GET /api/legal/document/:id
   * Route params: id
   * Query params: maxcites, maxcitedby
   */
  static async getDocument(req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required.',
      });
    }

    try {
      const doc = await IndianKanoonService.getDocument(id, {
        maxcites: req.query.maxcites,
        maxcitedby: req.query.maxcitedby,
      });

      return res.json({
        success: true,
        document: doc,
      });
    } catch (err) {
<<<<<<< HEAD
=======
      if ((err.code === 'TOKEN_MISSING' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') && process.env.USE_MEMORY_FALLBACK === 'true') {
        const found = CURATED_JUDGMENTS_DATABASE.find((j) => String(j.kanoonId) === String(id));
        if (found) {
          return res.json({
            success: true,
            document: {
              id: String(found.kanoonId),
              title: found.title,
              court: found.court,
              publishDate: found.publishDate,
              citation: found.citation,
              fullText: `<p>${found.fullText || found.snippet}</p>`,
              citeList: [],
              citedbyList: [],
              source: 'Indian Kanoon',
              sourceUrl: found.sourceUrl,
              metadata: { docsize: (found.fullText || found.snippet).length, numcites: 10, numcitedby: 25 },
            },
          });
        }
      }
>>>>>>> 3aab4be (dhanush commits)
      console.error(`[LegalController] Fetch document ${id} error:`, err.message);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.message,
        code: err.code || 'DOC_FETCH_FAILED',
      });
    }
  }

  /**
   * GET /api/legal/document/:id/metadata
   */
  static async getDocumentMetadata(req, res) {
    const { id } = req.params;

    try {
      const metadata = await IndianKanoonService.getDocumentMetadata(id);
      return res.json({
        success: true,
        metadata,
      });
    } catch (err) {
      console.error(`[LegalController] Fetch metadata for ${id} error:`, err.message);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.message,
        code: err.code || 'METADATA_FETCH_FAILED',
      });
    }
  }

  /**
   * GET /api/legal/document/:id/fragments
   * Query params: q / query / formInput
   */
  static async getDocumentFragments(req, res) {
    const { id } = req.params;
    const query = req.query.q || req.query.query || req.query.formInput || '';

    try {
      const fragments = await IndianKanoonService.getDocumentFragments(id, query);
      return res.json({
        success: true,
        fragments,
      });
    } catch (err) {
      console.error(`[LegalController] Fetch fragments for ${id} error:`, err.message);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.message,
        code: err.code || 'FRAGMENTS_FETCH_FAILED',
      });
    }
  }

  /**
   * GET /api/legal/document/:id/courtcopy
   */
  static async getCourtCopy(req, res) {
    const { id } = req.params;

    try {
      const courtCopy = await IndianKanoonService.getCourtCopy(id);
      return res.json({
        success: true,
        courtCopy,
      });
    } catch (err) {
      console.error(`[LegalController] Fetch court copy for ${id} error:`, err.message);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.message,
        code: err.code || 'COURT_COPY_FAILED',
      });
    }
  }
}

export default LegalController;
