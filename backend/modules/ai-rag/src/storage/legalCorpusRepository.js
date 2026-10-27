import db from '../../../../src/config/db.js';
import { VectorEngine } from '../embeddings/vectorEngine.js';

const SEARCH_TERMS_TO_IGNORE = new Set(['about', 'after', 'against', 'from', 'have', 'into', 'more', 'that', 'their', 'there', 'these', 'this', 'under', 'what', 'when', 'where', 'which', 'with', 'would']);

function toDatabaseDate(value) {
  if (!value || value === 'Unknown') return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function caseDatabaseId(kanoonId) {
  const value = String(kanoonId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 56);
  return value ? `ik_${value}` : '';
}

function searchPatterns(query) {
  return [...new Set((query || '').toLowerCase().match(/[a-z0-9]+/g) || [])]
    .filter((term) => term.length > 3 && !SEARCH_TERMS_TO_IGNORE.has(term))
    .sort((left, right) => right.length - left.length)
    .slice(0, 12)
    .map((term) => `%${term}%`);
}

export class LegalCorpusRepository {
  constructor(database = db) {
    this.database = database;
  }

  async persistJudgments(judgments = [], embeddedChunks = []) {
    if (!judgments.length || !embeddedChunks.length) return { persisted: 0 };

    const connection = await this.database.query('SELECT 1 AS available');
    if (connection.isFallback) return { persisted: 0, unavailable: true };

    const chunksByDocument = new Map();
    for (const chunk of embeddedChunks) {
      const key = String(chunk.kanoonId || '');
      if (!chunksByDocument.has(key)) chunksByDocument.set(key, []);
      chunksByDocument.get(key).push(chunk);
    }

    let persisted = 0;
    for (const judgment of judgments) {
      const kanoonId = String(judgment.kanoonId || judgment.id || '');
      const caseId = caseDatabaseId(kanoonId);
      if (!caseId) continue;

      const caseResult = await this.database.query(
        `INSERT INTO legal_cases
          (id, case_name, court, jurisdiction, case_type, judgment_date, citation, source, source_url, summary, key_principle)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Indian Kanoon', $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
          case_name = EXCLUDED.case_name,
          court = EXCLUDED.court,
          jurisdiction = EXCLUDED.jurisdiction,
          case_type = EXCLUDED.case_type,
          judgment_date = COALESCE(EXCLUDED.judgment_date, legal_cases.judgment_date),
          citation = COALESCE(EXCLUDED.citation, legal_cases.citation),
          source_url = EXCLUDED.source_url,
          summary = COALESCE(EXCLUDED.summary, legal_cases.summary),
          key_principle = COALESCE(EXCLUDED.key_principle, legal_cases.key_principle)`,
        [
          caseId,
          String(judgment.title || 'Indian Kanoon judgment').slice(0, 255),
          String(judgment.court || 'Unknown court').slice(0, 255),
          String(judgment.jurisdiction || 'India').slice(0, 100),
          String(judgment.category || 'Indian legal judgment').slice(0, 100),
          toDatabaseDate(judgment.publishDate || judgment.date),
          judgment.citation ? String(judgment.citation).slice(0, 255) : null,
          judgment.sourceUrl || `https://indiankanoon.org/doc/${kanoonId}/`,
          judgment.snippet || null,
          judgment.keyPrinciple || null,
        ]
      );
      if (caseResult.isFallback) return { persisted, unavailable: true };

      const judgmentId = `ikj_${caseId.slice(3)}`;
      const documentResult = await this.database.query(
        `INSERT INTO judgments (id, case_id, full_text, source_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
          full_text = CASE WHEN length(EXCLUDED.full_text) > length(COALESCE(judgments.full_text, '')) THEN EXCLUDED.full_text ELSE judgments.full_text END,
          source_url = COALESCE(EXCLUDED.source_url, judgments.source_url)`,
        [judgmentId, caseId, judgment.fullText || judgment.snippet || '', judgment.sourceUrl || null]
      );
      if (documentResult.isFallback) return { persisted, unavailable: true };

      for (const chunk of chunksByDocument.get(kanoonId) || []) {
        const chunkResult = await this.database.query(
          `INSERT INTO legal_judgment_chunks
            (chunk_id, case_id, kanoon_id, chunk_index, chunk_type, chunk_text, embedding, source_url, citation)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
           ON CONFLICT (chunk_id) DO UPDATE SET
            chunk_text = EXCLUDED.chunk_text,
            embedding = EXCLUDED.embedding,
            chunk_type = EXCLUDED.chunk_type,
            source_url = EXCLUDED.source_url,
            citation = EXCLUDED.citation,
            updated_at = NOW()`,
          [
            chunk.chunkId || `${kanoonId}_chk_${chunk.chunkIndex}`,
            caseId,
            kanoonId,
            chunk.chunkIndex || 0,
            chunk.chunkType || 'facts',
            chunk.chunkText || '',
            JSON.stringify(chunk.embedding || []),
            chunk.sourceUrl || judgment.sourceUrl || null,
            chunk.citation || judgment.citation || null,
          ]
        );
        if (chunkResult.isFallback) return { persisted, unavailable: true };
      }
      persisted += 1;
    }

    return { persisted, unavailable: false };
  }

  async searchRelevantChunks(queryVector, queryText, { topK = 3, minSimilarity = 0.2 } = {}) {
    const patterns = searchPatterns(queryText);
    if (!patterns.length) return { chunks: [], judgments: [], unavailable: false };

    const result = await this.database.query(
      `SELECT
          chunk.chunk_id,
          chunk.kanoon_id,
          chunk.chunk_index,
          chunk.chunk_type,
          chunk.chunk_text,
          chunk.embedding,
          chunk.source_url,
          chunk.citation,
          legal_case.case_name,
          legal_case.court,
          legal_case.jurisdiction,
          legal_case.judgment_date,
          legal_case.case_type,
          judgment.full_text
       FROM legal_judgment_chunks AS chunk
       JOIN legal_cases AS legal_case ON legal_case.id = chunk.case_id
       LEFT JOIN judgments AS judgment ON judgment.case_id = legal_case.id
       WHERE chunk.chunk_text ILIKE ANY($1::text[])
       ORDER BY legal_case.judgment_date DESC NULLS LAST
       LIMIT 500`,
      [patterns]
    );
    if (result.isFallback) return { chunks: [], judgments: [], unavailable: true };

    const candidates = result.rows.map((row) => ({
      chunkId: row.chunk_id,
      kanoonId: row.kanoon_id,
      caseTitle: row.case_name,
      court: row.court,
      jurisdiction: row.jurisdiction,
      publishDate: row.judgment_date ? new Date(row.judgment_date).toISOString().slice(0, 10) : 'Unknown',
      category: row.case_type,
      citation: row.citation,
      sourceUrl: row.source_url,
      chunkIndex: row.chunk_index,
      chunkType: row.chunk_type,
      chunkText: row.chunk_text,
      fullText: row.full_text || row.chunk_text,
      embedding: Array.isArray(row.embedding) ? row.embedding : [],
    }));
    const chunks = VectorEngine.searchSimilarChunks(queryVector, candidates, {
      queryText,
      topK,
      minSimilarity,
    });

    const documents = new Map();
    for (const chunk of chunks) {
      if (!documents.has(chunk.kanoonId)) {
        documents.set(chunk.kanoonId, {
          kanoonId: chunk.kanoonId,
          title: chunk.caseTitle,
          court: chunk.court,
          jurisdiction: chunk.jurisdiction,
          publishDate: chunk.publishDate,
          category: chunk.category,
          citation: chunk.citation,
          sourceUrl: chunk.sourceUrl,
          fullText: chunk.fullText,
          snippet: chunk.chunkText,
        });
      }
    }

    return { chunks, judgments: [...documents.values()], unavailable: false };
  }
}

export const legalCorpusRepository = new LegalCorpusRepository();
export default legalCorpusRepository;
