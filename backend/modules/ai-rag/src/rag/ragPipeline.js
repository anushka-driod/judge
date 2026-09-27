/**
 * Ground-Truth Legal RAG Pipeline (Phases 6, 7 & 8)
 * Member 3: AI + RAG + Legal Research Lead
 *
 * Implements:
 * - Hybrid Retrieval (Vector + Keyword Search)
 * - Structured Context Assembly with Indian Kanoon Evidence
 * - Real Google Gemini LLM API integration via centralized GeminiClient
 * - Case Continuity & Context-Aware Chat Follow-ups
 * - Multilingual Query Handling (English, Telugu, Tanglish)
 * - Hallucination Safeguard (Ensures citations strictly match authentic retrieved cases)
 * - Insufficient Evidence Detector
 * - High-Fidelity Grounded Fallback Engine when LLM is unavailable
 */

import { LegalAnalyzer } from '../llm/legalAnalyzer.js';
import { KanoonClient } from '../kanoon/kanoonClient.js';
import { JudgmentProcessor } from '../processing/judgmentProcessor.js';
import { VectorEngine } from '../embeddings/vectorEngine.js';
import { geminiClient } from '../llm/geminiClient.js';
import {
  RAG_GUIDANCE_SYSTEM_PROMPT,
  RAG_STRUCTURED_GUIDANCE_PROMPT,
} from '../prompts/legalPrompts.js';

const STANDARD_DISCLAIMER = 'This guidance is an AI-assisted analysis based on Indian statutes and relevant court judgments retrieved from Indian Kanoon. It provides legal information and does not substitute for personalized advice from a qualified advocate, nor does it constitute an official court order. The legal applicability of cited precedents depends on specific factual similarities and evidentiary proof.';

export class RagPipeline {
  constructor() {
    this.kanoonClient = new KanoonClient();
  }

  /**
   * Complete End-to-End Legal Guidance Pipeline
   * @param {string} userQuery - Citizen's query in plain words (English/Telugu/Tanglish)
   * @param {string} [jurisdiction] - e.g. 'Karnataka', 'Telangana', 'Delhi'
   * @param {Object} [options] - Chat context options { history, caseId, attachedDocs, language }
   * @returns {Promise<Object>} Source-backed guidance with authentic citations and safety disclaimer
   */
  async processLegalQuery(userQuery, jurisdiction = '', options = {}) {
    // Stage 1: Legal Problem Understanding & Entity Extraction
    const analysis = await LegalAnalyzer.analyzeQuery(userQuery, jurisdiction, options);

    // Stage 2: Retrieve Relevant Judgments from Indian Kanoon API
    const primaryQuery = (analysis.kanoon_search_queries && analysis.kanoon_search_queries[0]) || userQuery;
    let rawJudgments = await this.kanoonClient.searchJudgments(primaryQuery);

    // Fallback search if primary query yielded 0 results
    if (rawJudgments.length === 0 && analysis.kanoon_search_queries && analysis.kanoon_search_queries[1]) {
      rawJudgments = await this.kanoonClient.searchJudgments(analysis.kanoon_search_queries[1]);
    }

    if (rawJudgments.length === 0) {
      return this.buildInsufficientEvidenceResponse(analysis, userQuery, options);
    }

    // Stage 3: Retrieve Document Context & Chunk Safely (Handling large judgments)
    const topDocsToHydrate = rawJudgments.slice(0, 3);
    const hydratedJudgments = await Promise.all(
      topDocsToHydrate.map(async (j) => {
        try {
          const detailedDoc = await this.kanoonClient.getJudgmentDetails(j.kanoonId);
          if (detailedDoc && detailedDoc.fullText && detailedDoc.fullText.length > 50) {
            // Cap at 25,000 characters to prevent memory/token overflows
            const safeText = detailedDoc.fullText.slice(0, 25000);
            return {
              ...j,
              fullText: safeText,
              citation: detailedDoc.citation || j.citation,
              court: detailedDoc.court || j.court,
              publishDate: detailedDoc.publishDate || j.publishDate,
            };
          }
        } catch (err) {
          console.warn(`[RagPipeline] Doc hydration for ${j.kanoonId} fell back to search snippet:`, err.message);
        }
        return j;
      })
    );

    const docsForProcessing = [...hydratedJudgments, ...rawJudgments.slice(3)];

    let allChunks = [];
    for (const judgment of docsForProcessing) {
      const chunks = JudgmentProcessor.chunkJudgment(judgment);
      allChunks.push(...chunks);
    }

    if (allChunks.length === 0) {
      // Fallback: create chunk records directly from snippets if text chunking was empty
      allChunks = docsForProcessing.map((doc, idx) => ({
        chunkId: `${doc.kanoonId}_chk_${idx}`,
        kanoonId: doc.kanoonId,
        caseTitle: doc.title,
        court: doc.court,
        citation: doc.citation,
        sourceUrl: doc.sourceUrl,
        publishDate: doc.publishDate,
        chunkIndex: idx,
        chunkType: 'statutory_analysis',
        chunkText: doc.fullText || doc.snippet || doc.title,
      }));
    }

    // Stage 4: Embed Query and Chunks (pgvector / vectorEngine simulation)
    const queryVector = await VectorEngine.generateEmbedding(userQuery);
    const embeddedChunks = await Promise.all(
      allChunks.map(async (chunk) => ({
        ...chunk,
        embedding: await VectorEngine.generateEmbedding(chunk.chunkText),
      }))
    );

    // Stage 5 & 6: Hybrid Retrieval (Semantic Vector Search + Top-K Ranking)
    let topChunks = VectorEngine.searchSimilarChunks(queryVector, embeddedChunks, {
      topK: 3,
      minSimilarity: 0.35,
    });

    // Graceful fallback to highest scored chunks if threshold was strict
    if (topChunks.length === 0 && embeddedChunks.length > 0) {
      topChunks = embeddedChunks
        .map((chunk) => ({
          ...chunk,
          similarityScore: Number(VectorEngine.cosineSimilarity(queryVector, chunk.embedding).toFixed(4)),
        }))
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 3);
    }

    // Insufficient evidence check
    if (topChunks.length === 0) {
      return this.buildInsufficientEvidenceResponse(analysis, userQuery, options);
    }

    // Stage 7: Evidence-Grounded Guidance Generation (Gemini LLM or Grounded Fallback Engine)
    const generationResult = await this.generateGroundedGuidance(userQuery, analysis, topChunks, options);

    // Stage 8: Hallucination Guard & Source Formatting (Strict Authentic Metadata)
    const verifiedSources = this.verifyAndFormatSources(topChunks, rawJudgments);

    // Align laws representation
    const relevantLaws = (generationResult.relevantLaws && generationResult.relevantLaws.length > 0)
      ? generationResult.relevantLaws.map((l) => ({
          act: l.name || l.act || 'Governing Statute',
          section: l.section || '',
          plainMeaning: l.explanation || l.plainMeaning || 'Applicable statutory provision under Indian law',
          applicability: l.explanation || 'Identified as governing statute for the dispute',
        }))
      : (analysis.relevant_acts_anticipated || []).map((act) => ({
          act,
          plainMeaning: 'Identified as governing statute for the dispute under Indian law',
          applicability: 'Identified as governing statute for the dispute',
        }));

    // Align precedents representation
    const similarCases = verifiedSources.map((s, idx) => {
      const match = generationResult.relevantJudgments?.find(
        (rj) => String(rj.documentId) === String(s.kanoonId) || rj.caseName?.toLowerCase().includes(s.title?.toLowerCase().slice(0, 15))
      );
      return {
        caseId: s.kanoonId,
        id: s.kanoonId,
        title: s.title,
        caseName: s.title,
        court: s.court,
        date: s.publishDate,
        publishDate: s.publishDate,
        citation: s.citation,
        similarityScore: s.similarityScore,
        sourceUrl: s.sourceUrl,
        keyExtract: s.chunkText,
        whyRelevant: match?.whyRelevant || `Relevant judicial context on ${analysis.category} regarding ${s.title}`,
        keyTakeaway: match?.whyRelevant || `Relevant judicial context on ${analysis.category} regarding ${s.title}`,
      };
    });

    const rawGuidance = generationResult.guidance || '';
    const finalGuidance = rawGuidance.toLowerCase().includes('applicability depends')
      ? rawGuidance
      : `${rawGuidance}\n\n*(Note: Retrieved cases provide judicial context; applicability depends on specific factual correspondence with your case.)*`;

    return {
      summary: generationResult.problemSummary || analysis.summary,
      problemSummary: generationResult.problemSummary || analysis.summary,
      category: analysis.category,
      jurisdiction: analysis.jurisdiction,
      detected_language: analysis.detected_language || 'English',
      kanoonQuery: primaryQuery,
      primaryKanoonQuery: primaryQuery,
      kanoon_search_queries: analysis.kanoon_search_queries || [],
      legal_issues: generationResult.legalIssues || analysis.legal_issues,
      legalIssues: generationResult.legalIssues || analysis.legal_issues,
      possible_rights: generationResult.possibleRights || [
        'Right to fair hearing and pre-litigation resolution',
        'Statutory remedy under Indian civil/consumer jurisdiction',
      ],
      possibleRights: generationResult.possibleRights || [
        'Right to fair hearing and pre-litigation resolution',
        'Statutory remedy under Indian civil/consumer jurisdiction',
      ],
      relevant_laws: relevantLaws,
      relevantLaws: relevantLaws,
      similar_cases: similarCases,
      relevantJudgments: similarCases,
      guidance: finalGuidance,
      reply: finalGuidance, // For frontend chat compatibility
      sources: verifiedSources,
      allRetrievedJudgments: rawJudgments.slice(0, 10).map((j) => ({
        id: j.kanoonId,
        title: j.title,
        court: j.court,
        date: j.publishDate,
        citation: j.citation,
        sourceUrl: j.sourceUrl,
        snippet: j.snippet || j.fullText?.slice(0, 200),
      })),
      missing_information: generationResult.missingEvidence || analysis.missing_information,
      missingInformation: generationResult.missingEvidence || analysis.missing_information,
      suggestedNextSteps: generationResult.nextActions || (analysis.missing_information || []).map((m) => `Clarify: ${m}`),
      nextActions: generationResult.nextActions || [],
      evidence_suggestions: generationResult.evidenceSuggestions || [
        'Written contracts or agreements',
        'Bank statements and transaction receipts',
        'Written notices and correspondence',
      ],
      confidence: topChunks[0]?.similarityScore > 0.65 ? 'high' : 'medium',
      modelUsed: generationResult.modelUsed || 'deterministic_expert_engine',
      executionMode: generationResult.executionMode || 'deterministic_fallback',
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  /**
   * Generates evidence-grounded guidance using retrieved case chunks.
   * Dispatches to real Gemini LLM if configured; otherwise utilizes deterministic template engine.
   */
  async generateGroundedGuidance(query, analysis, chunks, options = {}) {
    const evidenceContext = chunks
      .map(
        (c, i) => `[Source ${i + 1} - Indian Kanoon Doc ${c.kanoonId}]:
Case Title: ${c.caseTitle}
Court: ${c.court}
Date: ${c.publishDate || 'Unknown'}
Citation: ${c.citation}
Source URL: ${c.sourceUrl}
Relevant Extract:
"${c.chunkText.slice(0, 600)}"`
      )
      .join('\n\n');

    // Chat context & case continuity formatting
    let chatContextSection = '';
    if (options.history && Array.isArray(options.history) && options.history.length > 0) {
      const recentHistory = options.history.slice(-4);
      chatContextSection = `\nPREVIOUS CASE CONVERSATION HISTORY:\n${recentHistory.map((h) => `${h.sender === 'user' ? 'Citizen' : 'VidhiSetu'}: ${h.text}`).join('\n')}\n`;
    }

    if (geminiClient.isConfigured()) {
      try {
        const structuredPrompt = `USER LEGAL PROBLEM:
"${query}"

${chatContextSection}
LEGAL CATEGORY ANCHOR:
"${analysis.category}"

SUMMARY OF CITIZEN'S GRIEVANCE:
"${analysis.summary}"

LEGAL ISSUES DETECTED:
- ${(analysis.legal_issues || []).join('\n- ')}

ANTICIPATED INDIAN STATUTES:
- ${(analysis.relevant_acts_anticipated || []).join('\n- ')}

RETRIEVED LEGAL EVIDENCE (AUTHENTIC INDIAN KANOON RECORDS):
${evidenceContext}

USER DETECTED LANGUAGE:
${analysis.detected_language || 'English'}

CRITICAL TASK REQUIREMENTS:
1. Synthesize a comprehensive, evidence-grounded legal analysis for the citizen adhering strictly to the schema.
2. ANCHOR INTEGRITY: You MUST keep your entire response strictly anchored to the citizen's actual grievance and category: "${analysis.category}".
   - If the dispute is a Tenancy dispute (e.g., landlord withholding security deposit), your advice MUST focus exclusively on tenancy law, deposit refund, statutory demand notice to landlord, and civil recovery / rent tribunal. Do NOT mention builder delay, RERA, or homebuyer rights!
   - If the dispute is a Real Estate / RERA dispute (e.g., builder delayed flat possession), your advice MUST focus on RERA Section 18, delay compensation interest, and homebuyer remedies.
3. Multilingual: If user input was in Telugu or Tanglish, provide accessible explanations in Telugu or Tanglish in "guidance" so they clearly understand their rights, preserving Indian statutory names in English.
4. Grounded in Evidence: Cite ONLY authentic Indian Kanoon records from the retrieved evidence. Do NOT fabricate citations or case names.
5. Follow all safety rules: no guaranteed wins, cautious language.`;

        const response = await geminiClient.generateStructured({
          prompt: structuredPrompt,
          systemInstruction: `${RAG_GUIDANCE_SYSTEM_PROMPT}\n\n${RAG_STRUCTURED_GUIDANCE_PROMPT}`,
          temperature: 0.2,
          timeoutMs: 30000,
        });

        if (response && response.data) {
          const guardedData = this.validateAndGuardGeneratedGuidance(response.data, analysis, query, chunks, options);
          return {
            problemSummary: guardedData.problemSummary || analysis.summary,
            legalIssues: Array.isArray(guardedData.legalIssues) ? guardedData.legalIssues : analysis.legal_issues,
            possibleRights: Array.isArray(guardedData.possibleRights) ? guardedData.possibleRights : [],
            relevantLaws: Array.isArray(guardedData.relevantLaws) ? guardedData.relevantLaws : [],
            relevantJudgments: Array.isArray(guardedData.relevantJudgments) ? guardedData.relevantJudgments : [],
            evidenceSuggestions: Array.isArray(guardedData.evidenceSuggestions) ? guardedData.evidenceSuggestions : [],
            missingEvidence: Array.isArray(guardedData.missingEvidence) ? guardedData.missingEvidence : analysis.missing_information,
            nextActions: Array.isArray(guardedData.nextActions) ? guardedData.nextActions : [],
            guidance: guardedData.guidance || response.text,
            disclaimer: guardedData.disclaimer || 'AI legal information based on Indian Kanoon records; does not constitute legal representation.',
            modelUsed: response.modelUsed,
            executionMode: guardedData.executionMode || 'gemini_llm',
          };
        }
      } catch (err) {
        console.warn(`[RagPipeline] Gemini LLM generation failed (${err.code || err.message}), engaging high-fidelity deterministic grounded engine.`);
      }
    }

    // High-fidelity domain expert grounded fallback synthesis
    return this.generateDeterministicGuidance(query, analysis, chunks, options);
  }

  /**
   * Response Guard: Ensures the generated response did not drift from the anchor legal problem
   */
  validateAndGuardGeneratedGuidance(data, analysis, query, chunks, options = {}) {
    if (!data || !data.guidance) {
      return this.generateDeterministicGuidance(query, analysis, chunks, options);
    }

    const catLower = (analysis.category || '').toLowerCase();
    const isTenancy = catLower.includes('tenan') || catLower.includes('deposit') || catLower.includes('rent');
    const isRera = catLower.includes('rera') || catLower.includes('real estate') || catLower.includes('builder');

    const guidanceLower = (data.guidance || '').toLowerCase();
    const summaryLower = (data.problemSummary || '').toLowerCase();

    // Guard 1: Tenancy dispute must not drift to RERA / builder
    if (isTenancy) {
      const mentionsRera = guidanceLower.includes('rera') || guidanceLower.includes('delayed flat possession') || summaryLower.includes('builder delay');
      const mentionsTenancy = guidanceLower.includes('deposit') || guidanceLower.includes('landlord') || guidanceLower.includes('tenant') || guidanceLower.includes('rent');

      if (mentionsRera && !mentionsTenancy) {
        console.warn('[RagPipeline Guard] Detected domain drift in Gemini response (RERA instead of Tenancy). Engaging grounded domain synthesis.');
        return this.generateDeterministicGuidance(query, analysis, chunks, options);
      }
    }

    // Guard 2: Builder / RERA dispute must not drift to Tenancy
    if (isRera) {
      const mentionsLandlord = guidanceLower.includes('landlord') && !guidanceLower.includes('builder');
      if (mentionsLandlord) {
        console.warn('[RagPipeline Guard] Detected domain drift in Gemini response (Tenancy instead of RERA). Engaging grounded domain synthesis.');
        return this.generateDeterministicGuidance(query, analysis, chunks, options);
      }
    }

    return data;
  }

  /**
   * Deterministic grounded template engine for offline / test / fallback scenarios
   */
  generateDeterministicGuidance(query, analysis, chunks, options = {}) {
    const leadSource = chunks[0];
    const secondSource = chunks[1] || chunks[0];
    const statutes = (analysis.relevant_acts_anticipated || []).join(', ');

    let guidanceBody = '';

    if (analysis.category.includes('Tenancy')) {
      guidanceBody = `Based on Indian tenancy laws and judicial principles, particularly **${leadSource.caseTitle}** (${leadSource.court}), a landlord cannot arbitrarily withhold or deduct a tenant's security deposit once the premises have been vacated after due notice.\n\n### Key Legal Principles:\n1. **Right to Refund**: Security deposits are held in trust as collateral against actual physical damages or unpaid utility bills. In the absence of documented damage or arrears, the full amount must be refunded within a reasonable timeframe.\n2. **Burden of Proof**: A landlord claiming deductions bears the burden of establishing itemized proof of damage beyond normal wear and tear.\n3. **Statutory Framework**: Governed by the **${statutes}**.\n\n### Relevant Judicial Context:\n- **${leadSource.caseTitle}** (${leadSource.court}): Courts emphasize that contractual obligations regarding return of deposit upon peaceful handover must be honored.\n${chunks.length > 1 ? `- **${secondSource.caseTitle}**: Illustrates judicial interpretation regarding tenancy covenants and refund recovery.` : ''}\n\n### Recommended Next Steps:\n1. **Document Delivery**: Consolidate written proof of notice, handover of keys, and move-out inspection.\n2. **Statutory Demand Notice**: Dispatch a formal 15-day legal notice demanding immediate refund of the deposit with interest.\n3. **Legal Redress**: If unreturned, legal recourse may be initiated before the Rent Authority / Rent Tribunal or Consumer/Civil Court depending on the agreement.`;
    } else if (analysis.category.includes('RERA') || analysis.category.includes('Real Estate')) {
      guidanceBody = `Based on the Real Estate (Regulation and Development) Act, 2016 (RERA) and landmark judicial precedents such as **${leadSource.caseTitle}** (${leadSource.court}), homebuyers are legally protected against unreasonable possession delays by real estate developers.\n\n### Key Legal Principles:\n1. **Statutory Delay Compensation**: Under **Section 18 of RERA**, if a developer fails to deliver possession within the timeframe specified in the Agreement for Sale, the allottee has the right to claim interest for every month of delay until actual handover.\n2. **Option to Withdraw**: The homebuyer may alternatively choose to withdraw from the project and demand a full refund of all payments made, along with interest prescribed under State RERA Rules.\n3. **Concurrent Remedies**: Judicial rulings affirm that homebuyers can seek relief before the State RERA Authority as well as Consumer Commissions.\n\n### Relevant Judicial Context:\n- **${leadSource.caseTitle}** (${leadSource.court}): Reaffirms the mandatory nature of developer accountability and buyer compensation under RERA.\n${chunks.length > 1 ? `- **${secondSource.caseTitle}**: Highlights judicial enforcement of promised handover schedules and statutory interest.` : ''}\n\n### Recommended Next Steps:\n1. **Review Agreement for Sale**: Verify the promised delivery date, grace period clauses, and payment receipts.\n2. **Issue Demand Notice**: Serve a written notice demanding immediate payment of delay compensation interest.\n3. **File RERA Complaint**: If unresolved, lodge a complaint online before your State RERA Authority or Consumer Forum.`;
    } else {
      guidanceBody = `Based on Indian judicial precedents, particularly **${leadSource.caseTitle}** (${leadSource.court}), Indian courts enforce strict adherence to statutory procedures and contractual good faith.\n\n### Key Legal Principles:\n1. **Statutory Protection**: Your issue is governed by **${statutes}**.\n2. **Judicial Precedent**: In **${leadSource.caseTitle}**, the court observed that legal rights and procedures must be scrupulously maintained.\n\n### Recommended Next Steps:\n1. **Evidence Gathering**: Organize all written communications, receipts, and contract copies.\n2. **Statutory Notice**: Issue a formal pre-litigation notice setting out the grievance.\n3. **Advocate Consultation**: Consult an advocate in ${analysis.jurisdiction} for representation if required.`;
    }

    const fullGuidance = `${guidanceBody}\n\n*(Note: Retrieved cases provide judicial context; applicability depends on specific factual correspondence with your case.)*`;

    return {
      problemSummary: analysis.summary,
      legalIssues: analysis.legal_issues,
      possibleRights: [
        'Right to statutory notice and procedural fairness',
        'Right to recovery of withheld amounts or delay compensation',
      ],
      relevantLaws: (analysis.relevant_acts_anticipated || []).map((name) => ({
        name,
        section: '',
        explanation: 'Statute governing the primary dispute domain',
      })),
      relevantJudgments: chunks.map((c) => ({
        caseName: c.caseTitle,
        court: c.court,
        date: c.publishDate,
        whyRelevant: `Judicial precedent from ${c.court} addressing ${analysis.category}`,
        extract: c.chunkText.slice(0, 200),
        sourceUrl: c.sourceUrl,
        documentId: c.kanoonId,
      })),
      evidenceSuggestions: [
        'Agreement or contract document copy',
        'Proof of payments, bank statements, and invoices',
        'Written notices or email communications',
      ],
      missingEvidence: analysis.missing_information,
      nextActions: [
        'Consolidate documentary evidence into a timeline',
        'Dispatch a formal written legal notice',
        'Seek professional advocate representation if informal resolution fails',
      ],
      guidance: fullGuidance,
      disclaimer: 'This guidance is based on Indian Kanoon precedents and statutory provisions. It does not constitute formal legal representation.',
      modelUsed: 'deterministic_expert_engine',
      executionMode: 'deterministic_fallback',
    };
  }

  verifyAndFormatSources(chunks, rawJudgments = []) {
    const seen = new Set();
    const sources = [];

    for (const chunk of chunks) {
      if (!seen.has(chunk.kanoonId)) {
        seen.add(chunk.kanoonId);
        const originalDoc = rawJudgments.find((j) => String(j.kanoonId || j.id) === String(chunk.kanoonId));
        sources.push({
          kanoonId: chunk.kanoonId,
          title: chunk.caseTitle,
          court: chunk.court,
          citation: chunk.citation,
          similarityScore: chunk.similarityScore,
          sourceUrl: chunk.sourceUrl,
          publishDate: chunk.publishDate || originalDoc?.publishDate || 'Unknown',
          chunkText: chunk.chunkText,
        });
      }
    }
    return sources;
  }

  buildInsufficientEvidenceResponse(analysis, query, options = {}) {
    const text = 'Available legal records and previous court judgments on Indian Kanoon are currently insufficient to provide high-confidence statutory guidance on this specific query. A professional consultation with a licensed advocate is strongly advised.\n\n*(Note: Retrieved cases provide judicial context; applicability depends on specific factual correspondence with your case.)*';
    return {
      summary: analysis.summary,
      problemSummary: analysis.summary,
      category: analysis.category,
      jurisdiction: analysis.jurisdiction,
      detected_language: analysis.detected_language || 'English',
      legal_issues: analysis.legal_issues,
      legalIssues: analysis.legal_issues,
      possible_rights: [],
      possibleRights: [],
      relevant_laws: [],
      relevantLaws: [],
      similar_cases: [],
      relevantJudgments: [],
      guidance: text,
      reply: text,
      sources: [],
      allRetrievedJudgments: [],
      evidence_suggestions: [],
      missing_information: analysis.missing_information,
      missingInformation: analysis.missing_information,
      suggestedNextSteps: ['Consult a licensed advocate for personalized advice'],
      nextActions: ['Consult a licensed advocate for personalized advice'],
      confidence: 'low',
      modelUsed: 'none',
      executionMode: 'insufficient_evidence',
      disclaimer: STANDARD_DISCLAIMER,
    };
  }
}

export default RagPipeline;
