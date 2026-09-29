/**
 * Judgment Cleaner & Legal Chunking Engine (Phase 3)
 * Member 3: AI + RAG + Legal Research Lead
 *
 * Preprocesses raw Indian Kanoon judgments:
 * - Cleans HTML artifacts, case numbers, and reporter boilerplate
 * - Splits into semantically coherent legal passages
 * - Classifies chunk types: 'holding', 'ratio_decidendi', 'facts', 'statutory_analysis'
 */

export class JudgmentProcessor {
  /**
   * Cleans judgment text by removing noise, court headers, and HTML tags.
   */
  static cleanJudgmentText(rawText) {
    if (!rawText) return '';

    return rawText
      .replace(/<[^>]*>/g, ' ') // Strip HTML tags
      .replace(/SCC\s+OnLine\s+SC\s+\d+/gi, '') // Strip reporter marks
      .replace(/IN\s+THE\s+SUPREME\s+COURT\s+OF\s+INDIA[^\n]*/gi, '')
      .replace(/APPELLATE\s+JURISDICTION[^\n]*/gi, '')
      .replace(/CIVIL\s+APPEAL\s+NO\.[^\n]*/gi, '')
      .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Chunks judgment text into semantic legal units with overlap.
   * @param {Object} judgment - Normalized judgment object
   * @param {Object} options - chunk size and overlap
   * @returns {Array<Object>} List of chunk records ready for embedding
   */
  static chunkJudgment(judgment, { chunkSize = 450, chunkOverlap = 80 } = {}) {
    const cleanedText = this.cleanJudgmentText(judgment.fullText);
    if (!cleanedText) return [];

    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push(this.createChunkRecord(judgment, currentChunk.trim(), chunkIndex++));
        // Overlap: keep tail of current chunk
        const words = currentChunk.split(' ');
        currentChunk = words.slice(-Math.floor(chunkOverlap / 6)).join(' ') + ' ' + sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunkRecord(judgment, currentChunk.trim(), chunkIndex));
    }

    return chunks;
  }

  static createChunkRecord(judgment, chunkText, chunkIndex) {
    const lower = chunkText.toLowerCase();
    let chunkType = 'facts';

    if (lower.includes('holding') || lower.includes('held that') || lower.includes('we hold') || lower.includes('order')) {
      chunkType = 'holding';
    } else if (lower.includes('ratio') || lower.includes('principle') || lower.includes('mandatory') || lower.includes('void ab initio')) {
      chunkType = 'ratio_decidendi';
    } else if (lower.includes('section') || lower.includes('act') || lower.includes('statute') || lower.includes('provision')) {
      chunkType = 'statutory_analysis';
    }

    return {
      chunkId: `${judgment.kanoonId}_chk_${chunkIndex}`,
      kanoonId: judgment.kanoonId,
      caseTitle: judgment.title,
      court: judgment.court,
      citation: judgment.citation,
      sourceUrl: judgment.sourceUrl,
      chunkIndex,
      chunkType,
      chunkText,
    };
  }
}
