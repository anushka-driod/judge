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
<<<<<<< HEAD
import { getCuratedJudgments } from '../kanoon/curatedJudgments.js';
import { matchLegalDomain } from '../knowledge/legalDomains.js';
import { JudgmentProcessor } from '../processing/judgmentProcessor.js';
import { VectorEngine } from '../embeddings/vectorEngine.js';
import { legalCorpusRepository } from '../storage/legalCorpusRepository.js';
import { geminiClient } from '../llm/geminiClient.js';
import { networkManager } from '../../../../src/services/networkManager.js';
=======
import { JudgmentProcessor } from '../processing/judgmentProcessor.js';
import { VectorEngine } from '../embeddings/vectorEngine.js';
import { geminiClient } from '../llm/geminiClient.js';
>>>>>>> origin/main
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

<<<<<<< HEAD
    // If query is an introductory greeting, respond conversationally with domain overview
    if (analysis.isGreeting) {
      return this.buildGreetingResponse(analysis, options);
    }

    if (analysis.requiresClarification) {
      if (!geminiClient.isConfigured() && analysis.category === 'General Legal Guidance' && userQuery.trim().length > 60) {
        return {
          summary: 'Detailed legal grievance outside offline rule coverage.',
          problemSummary: 'Detailed legal grievance outside offline rule coverage.',
          category: 'Unclassified Legal Inquiry',
          jurisdiction: analysis.jurisdiction || 'All India',
          detected_language: analysis.detected_language || 'English',
          kanoonQuery: '',
          primaryKanoonQuery: '',
          kanoon_search_queries: [],
          legal_issues: [],
          legalIssues: [],
          possible_rights: [],
          possibleRights: [],
          relevant_laws: [],
          relevantLaws: [],
          similar_cases: [],
          relevantJudgments: [],
          guidance: 'The centralized Gemini AI model is currently not configured (GEMINI_API_KEY is not set). For this detailed issue outside offline heuristics, VidhiSetu avoids presenting an unverified template. Please configure GEMINI_API_KEY in backend/.env or consult a qualified legal practitioner.',
          reply: 'The centralized Gemini AI model is currently not configured (GEMINI_API_KEY is not set). For this detailed issue outside offline heuristics, VidhiSetu avoids presenting an unverified template. Please configure GEMINI_API_KEY in backend/.env or consult a qualified legal practitioner.',
          sources: [],
          allRetrievedJudgments: [],
          missing_information: [],
          missingInformation: [],
          suggestedNextSteps: ['Configure GEMINI_API_KEY in backend/.env for AI analysis', 'Consult an advocate specializing in electricity and regulatory law'],
          nextActions: ['Configure GEMINI_API_KEY in backend/.env for AI analysis', 'Consult an advocate specializing in electricity and regulatory law'],
          confidence: 'none',
          modelUsed: 'none',
          executionMode: 'llm_unavailable',
          disclaimer: STANDARD_DISCLAIMER,
        };
      }
      return this.buildClarificationResponse(analysis);
    }

    // Search the persisted corpus first; only fetch from Kanoon when it has no match.
    const primaryQuery = (analysis.kanoon_search_queries && analysis.kanoon_search_queries[0]) || userQuery;
    const queryVector = await VectorEngine.generateEmbedding(userQuery);
    const storedEvidence = await legalCorpusRepository.searchRelevantChunks(queryVector, primaryQuery, {
      topK: 3,
      minSimilarity: 0.2,
    });
    let rawJudgments = storedEvidence.judgments;
    let topChunks = storedEvidence.chunks;

    if (topChunks.length === 0) {
      // Stage 2: Retrieve relevant judgments from the official Indian Kanoon API.
      rawJudgments = await this.kanoonClient.searchJudgments(primaryQuery);

      if (rawJudgments.length === 0 && analysis.kanoon_search_queries && analysis.kanoon_search_queries[1]) {
        rawJudgments = await this.kanoonClient.searchJudgments(analysis.kanoon_search_queries[1]);
      }

      // If remote API returns 0 or fails, load curated authentic Kanoon judgments
      if (!rawJudgments || rawJudgments.length === 0) {
        rawJudgments = getCuratedJudgments(analysis.category, userQuery);
      }

      // Stage 3: Retrieve full document context and chunk the judgments safely.
      const hydratedJudgments = await Promise.all(
        rawJudgments.slice(0, 3).map(async (judgment) => {
          try {
            const detailedDoc = await this.kanoonClient.getJudgmentDetails(judgment.kanoonId);
            if (detailedDoc && detailedDoc.fullText && detailedDoc.fullText.length > 50) {
              return {
                ...judgment,
                fullText: detailedDoc.fullText.slice(0, 25000),
                citation: detailedDoc.citation || judgment.citation,
                court: detailedDoc.court || judgment.court,
                publishDate: detailedDoc.publishDate || judgment.publishDate,
              };
            }
          } catch (err) {
            console.warn(`[RagPipeline] Doc hydration for ${judgment.kanoonId} fell back to search snippet:`, err.message);
          }
          return judgment;
        })
      );

      const docsForProcessing = [...hydratedJudgments, ...rawJudgments.slice(3)];

      let allChunks = [];
      for (const judgment of docsForProcessing) {
        allChunks.push(...JudgmentProcessor.chunkJudgment(judgment));
      }

      if (allChunks.length === 0) {
        allChunks = docsForProcessing.map((doc, index) => ({
          chunkId: `${doc.kanoonId}_chk_${index}`,
          kanoonId: doc.kanoonId,
          caseTitle: doc.title,
          court: doc.court,
          citation: doc.citation,
          sourceUrl: doc.sourceUrl,
          publishDate: doc.publishDate,
          chunkIndex: index,
          chunkType: 'statutory_analysis',
          chunkText: doc.fullText || doc.snippet || doc.title,
        }));
      }

      // Stage 4: Embed chunks and persist the source documents for future queries.
      const embeddedChunks = await Promise.all(allChunks.map(async (chunk) => ({
        ...chunk,
        embedding: await VectorEngine.generateEmbedding(chunk.chunkText),
      })));
      const persistResult = await legalCorpusRepository.persistJudgments(docsForProcessing, embeddedChunks);
      if (persistResult.unavailable) {
        console.warn('[RagPipeline] PostgreSQL corpus storage is unavailable; this search cannot be persisted.');
      }

      // Stage 5 & 6: Hybrid retrieval over newly indexed source judgments.
      topChunks = VectorEngine.searchSimilarChunks(queryVector, embeddedChunks, {
        queryText: userQuery,
        topK: 3,
        minSimilarity: 0.2,
      });

      // If topChunks was still empty, generate directly from raw judgments
      if (topChunks.length === 0 && rawJudgments.length > 0) {
        topChunks = rawJudgments.slice(0, 3).map((doc, index) => ({
          chunkId: `${doc.kanoonId}_chk_${index}`,
          kanoonId: doc.kanoonId,
          caseTitle: doc.title,
          court: doc.court,
          citation: doc.citation,
          sourceUrl: doc.sourceUrl,
          publishDate: doc.publishDate,
          chunkIndex: index,
          chunkType: 'statutory_analysis',
          chunkText: doc.fullText || doc.snippet || doc.title,
          similarityScore: 0.85,
        }));
      }
    }

    if ((analysis.category || '').toLowerCase().includes('harassment')) {
      const filtered = topChunks.filter((chunk) =>
        /sexual harassment|harassment|posh|vishaka|workplace|unwelcome sexual|domestic violence|spous(?:e|al)|household|family court|protection of women from domestic violence/i.test(chunk.chunkText)
      );
      if (filtered.length > 0) topChunks = filtered;
    }

    // Insufficient evidence check: only if completely empty after all fallbacks
    if (topChunks.length === 0) {
      const domainFallback = matchLegalDomain(userQuery, analysis.category);
      if (domainFallback.precedents && domainFallback.precedents.length > 0) {
        topChunks = domainFallback.precedents.map((doc, index) => ({
          chunkId: `${doc.kanoonId}_chk_${index}`,
          kanoonId: doc.kanoonId,
          caseTitle: doc.title,
          court: doc.court,
          citation: doc.citation,
          sourceUrl: doc.sourceUrl,
          publishDate: doc.publishDate,
          chunkIndex: index,
          chunkType: 'statutory_analysis',
          chunkText: doc.keyExtract || doc.title,
          similarityScore: 0.9,
        }));
      }
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
      selfHelp: generationResult.selfHelp || matchLegalDomain(userQuery, analysis.category).selfHelp,
      confidence: topChunks[0]?.similarityScore > 0.65 ? 'high' : 'medium',
      modelUsed: generationResult.modelUsed || (networkManager.isOnline() ? 'Gemini 2.5 Flash' : 'VidhiSetu Indian Legal Engine (Local RAG)'),
      executionMode: !geminiClient.isConfigured() ? 'llm_unavailable' : (generationResult.executionMode || (networkManager.isOnline() ? 'gemini_llm' : 'offline_local_rag')),
      isOffline: !networkManager.isOnline(),
=======
      confidence: topChunks[0]?.similarityScore > 0.65 ? 'high' : 'medium',
      modelUsed: generationResult.modelUsed || 'deterministic_expert_engine',
      executionMode: generationResult.executionMode || 'deterministic_fallback',
>>>>>>> origin/main
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  /**
   * Generates evidence-grounded guidance using retrieved case chunks.
<<<<<<< HEAD
   * Uses Gemini with retrieved evidence and falls back to comprehensive domain expert analysis when unavailable.
=======
   * Dispatches to real Gemini LLM if configured; otherwise utilizes deterministic template engine.
>>>>>>> origin/main
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

<<<<<<< HEAD
    // Chat context & case continuity formatting (Multi-turn memory)
    let chatContextSection = '';
    if (options.history && Array.isArray(options.history) && options.history.length > 0) {
      const recentHistory = options.history.slice(-8);
      chatContextSection = `\nPREVIOUS CASE CONVERSATION HISTORY (REMEMBER THIS CONTEXT AND PRIOR FACTS):\n${recentHistory.map((h) => `${h.sender === 'user' ? 'Citizen' : 'VidhiSetu'}: ${h.text}`).join('\n')}\n`;
=======
    // Chat context & case continuity formatting
    let chatContextSection = '';
    if (options.history && Array.isArray(options.history) && options.history.length > 0) {
      const recentHistory = options.history.slice(-4);
      chatContextSection = `\nPREVIOUS CASE CONVERSATION HISTORY:\n${recentHistory.map((h) => `${h.sender === 'user' ? 'Citizen' : 'VidhiSetu'}: ${h.text}`).join('\n')}\n`;
>>>>>>> origin/main
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
<<<<<<< HEAD
2. MULTI-TURN CONVERSATION MEMORY: Maintain full conversational memory. When the user asks a follow-up, provides new details, or asks about notice/timeline/deductions/process, integrate all facts previously discussed in the chat and build directly on earlier turns.
3. SUITABLE INDIVIDUALIZED PROCESS: Provide a clear, chronological, step-by-step procedural roadmap tailored specifically to this problem (Immediate Evidence Gathering -> Statutory Notice & Cure Period -> Pre-Litigation Portals/Mediation -> Court/Tribunal Filing & Limitation -> Remedies & Damages).
4. Multilingual: If user input was in Telugu or Tanglish, provide accessible explanations in Telugu or Tanglish in "guidance" so they clearly understand their rights, preserving Indian statutory names in English.
5. Grounded in Evidence: Cite ONLY authentic Indian Kanoon records from the retrieved evidence. Do NOT fabricate citations or case names.
6. Follow all safety rules: no guaranteed wins, cautious language.`;
=======
2. ANCHOR INTEGRITY: You MUST keep your entire response strictly anchored to the citizen's actual grievance and category: "${analysis.category}".
   - If the dispute is a Tenancy dispute (e.g., landlord withholding security deposit), your advice MUST focus exclusively on tenancy law, deposit refund, statutory demand notice to landlord, and civil recovery / rent tribunal. Do NOT mention builder delay, RERA, or homebuyer rights!
   - If the dispute is a Real Estate / RERA dispute (e.g., builder delayed flat possession), your advice MUST focus on RERA Section 18, delay compensation interest, and homebuyer remedies.
3. Multilingual: If user input was in Telugu or Tanglish, provide accessible explanations in Telugu or Tanglish in "guidance" so they clearly understand their rights, preserving Indian statutory names in English.
4. Grounded in Evidence: Cite ONLY authentic Indian Kanoon records from the retrieved evidence. Do NOT fabricate citations or case names.
5. Follow all safety rules: no guaranteed wins, cautious language.`;
>>>>>>> origin/main

        const response = await geminiClient.generateStructured({
          prompt: structuredPrompt,
          systemInstruction: `${RAG_GUIDANCE_SYSTEM_PROMPT}\n\n${RAG_STRUCTURED_GUIDANCE_PROMPT}`,
          temperature: 0.2,
          timeoutMs: 30000,
        });

        if (response && response.data) {
          const guardedData = this.validateAndGuardGeneratedGuidance(response.data, analysis, query, chunks, options);
<<<<<<< HEAD
          const domain = matchLegalDomain(query, analysis.category, options.history);
          return {
            problemSummary: guardedData.problemSummary || analysis.summary,
            legalIssues: Array.isArray(guardedData.legalIssues) ? guardedData.legalIssues : analysis.legal_issues,
            possibleRights: Array.isArray(guardedData.possibleRights) && guardedData.possibleRights.length > 0 ? guardedData.possibleRights : domain.rights,
            relevantLaws: Array.isArray(guardedData.relevantLaws) && guardedData.relevantLaws.length > 0 ? guardedData.relevantLaws : domain.acts,
            relevantJudgments: Array.isArray(guardedData.relevantJudgments) && guardedData.relevantJudgments.length > 0 ? guardedData.relevantJudgments : domain.precedents,
            evidenceSuggestions: Array.isArray(guardedData.evidenceSuggestions) ? guardedData.evidenceSuggestions : domain.selfHelp?.requiredDocuments,
            missingEvidence: Array.isArray(guardedData.missingEvidence) ? guardedData.missingEvidence : domain.missingInformation,
            nextActions: Array.isArray(guardedData.nextActions) ? guardedData.nextActions : domain.nextSteps,
            guidance: guardedData.guidance || response.text,
            selfHelp: domain.selfHelp,
            disclaimer: guardedData.disclaimer || STANDARD_DISCLAIMER,
=======
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
>>>>>>> origin/main
            modelUsed: response.modelUsed,
            executionMode: guardedData.executionMode || 'gemini_llm',
          };
        }
      } catch (err) {
<<<<<<< HEAD
        console.warn(`[RagPipeline] Gemini generation failed (${err.code || err.message}); engaging comprehensive domain knowledge engine.`);
      }
    }

    // High-Fidelity 6-Pillar Domain Expert Generation (Flowchart Step 4 Alignment)
    const domain = matchLegalDomain(query, analysis.category, options.history);
    
    const summaryHeading = `### 📄 Case Summary\nBased on your inquiry regarding **${domain.category}**, here is an individualized legal assessment under Indian jurisprudence:\n${analysis.summary || domain.summary}\n`;

    const lawsList = domain.acts.map((a) => `- ⚖️ **${a.act} (${a.section})**: ${a.plainMeaning}\n  *Applicability: ${a.applicability}*`).join('\n\n');
    const lawsSection = `\n### ⚖️ Relevant Laws & Statutory Sections\n${lawsList}\n`;

    const precedentsList = (domain.precedents || []).map((p) => `- 🏛️ **${p.title}** (${p.citation}, *${p.court}*):\n  > "${p.keyExtract}"\n  💡 *Takeaway: ${p.whyRelevant}*`).join('\n\n');
    const precedentsSection = `\n### 🏛️ Similar Previous Cases (Indian Kanoon)\n${precedentsList}\n`;

    const rightsList = (domain.rights || []).map((r) => `- 💡 **${r}**`).join('\n');
    const rightsSection = `\n### 💡 Rights & Possible Options\n${rightsList}\n`;

    // Flowchart & User Request Alignment: Suitable Individualized Legal Process
    const processStepsList = (domain.selfHelp?.actionPlan || domain.nextSteps || []).map((s, idx) => {
      if (typeof s === 'string') return `- **Step ${idx + 1}**: ${s}`;
      return `- **Step ${s.step || idx + 1}: ${s.title}**\n  ${s.desc || s.description || ''}`;
    }).join('\n\n');
    const processSection = `\n### 📋 Suitable Legal Process & Step-by-Step Procedure\nHere is the tailored, step-by-step procedural roadmap to resolve this specific problem:\n\n${processStepsList}\n\n*Official Filing Portal:* **${domain.selfHelp?.portalName || 'District Court / eCourts'}** (${domain.selfHelp?.portalUrl || 'https://districts.ecourts.gov.in/'})\n`;

    const nextStepsList = (domain.nextSteps || []).map((s) => `- ${s}`).join('\n');
    const nextStepsSection = `\n### 📋 Immediate Practical Next Steps\n${nextStepsList}\n`;

    const missingList = (domain.missingInformation || []).map((m) => `- ❓ ${m}`).join('\n');
    const missingSection = `\n### ℹ️ Missing Information & Facts to Clarify\nTo strengthen your legal standing, please consider clarifying:\n${missingList}\n`;

    const synthesizedGuidance = `${summaryHeading}\n${lawsSection}\n${precedentsSection}\n${rightsSection}\n${processSection}\n${nextStepsSection}\n${missingSection}\n\n---\n*Disclaimer: ${STANDARD_DISCLAIMER}*`;

    return {
      problemSummary: analysis.summary || domain.summary,
      legalIssues: analysis.legal_issues && analysis.legal_issues.length > 0 ? analysis.legal_issues : [`Assessment under ${domain.acts[0]?.act}`, 'Dispute redressal and statutory remedies'],
      possibleRights: domain.rights,
      relevantLaws: domain.acts.map((a) => ({
        act: a.act,
        section: a.section,
        plainMeaning: a.plainMeaning,
        applicability: a.applicability,
      })),
      relevantJudgments: (domain.precedents || []).map((p) => ({
        id: p.kanoonId,
        caseId: p.kanoonId,
        title: p.title,
        caseName: p.title,
        court: p.court,
        citation: p.citation,
        publishDate: p.publishDate,
        date: p.publishDate,
        sourceUrl: p.sourceUrl,
        keyExtract: p.keyExtract,
        whyRelevant: p.whyRelevant,
      })),
      evidenceSuggestions: domain.selfHelp?.requiredDocuments || [],
      missingEvidence: domain.missingInformation || [],
      nextActions: domain.nextSteps || [],
      guidance: synthesizedGuidance,
      selfHelp: domain.selfHelp,
      modelUsed: 'VidhiSetu Indian Legal Engine (Local RAG)',
      executionMode: 'grounded_domain_engine',
    };
=======
        console.warn(`[RagPipeline] Gemini LLM generation failed (${err.code || err.message}), engaging high-fidelity deterministic grounded engine.`);
      }
    }

    // High-fidelity domain expert grounded fallback synthesis
    return this.generateDeterministicGuidance(query, analysis, chunks, options);
>>>>>>> origin/main
  }

  /**
   * Response Guard: Ensures the generated response did not drift from the anchor legal problem
   */
  validateAndGuardGeneratedGuidance(data, analysis, query, chunks, options = {}) {
<<<<<<< HEAD
    const withheldResponse = {
      problemSummary: analysis.summary,
      legalIssues: analysis.legal_issues || [],
      possibleRights: [],
      relevantLaws: [],
      relevantJudgments: [],
      evidenceSuggestions: [],
      missingEvidence: analysis.missing_information || [],
      nextActions: [],
      guidance: 'I could not verify a relevant, on-topic LLM response for this question, so I am withholding legal conclusions rather than substituting an offline template. Please try again or add context about what happened and where.',
      executionMode: 'llm_response_withheld',
    };

    if (!data || !data.guidance) {
      return withheldResponse;
=======
    if (!data || !data.guidance) {
      return this.generateDeterministicGuidance(query, analysis, chunks, options);
>>>>>>> origin/main
    }

    const catLower = (analysis.category || '').toLowerCase();
    const isTenancy = catLower.includes('tenan') || catLower.includes('deposit') || catLower.includes('rent');
    const isRera = catLower.includes('rera') || catLower.includes('real estate') || catLower.includes('builder');
<<<<<<< HEAD
    const isDomesticSafety = catLower.includes('domestic / family safety');
=======
>>>>>>> origin/main

    const guidanceLower = (data.guidance || '').toLowerCase();
    const summaryLower = (data.problemSummary || '').toLowerCase();

    // Guard 1: Tenancy dispute must not drift to RERA / builder
    if (isTenancy) {
      const mentionsRera = guidanceLower.includes('rera') || guidanceLower.includes('delayed flat possession') || summaryLower.includes('builder delay');
      const mentionsTenancy = guidanceLower.includes('deposit') || guidanceLower.includes('landlord') || guidanceLower.includes('tenant') || guidanceLower.includes('rent');

      if (mentionsRera && !mentionsTenancy) {
<<<<<<< HEAD
        console.warn('[RagPipeline Guard] Detected domain drift in Gemini response (RERA instead of Tenancy). Withholding response.');
        return withheldResponse;
=======
        console.warn('[RagPipeline Guard] Detected domain drift in Gemini response (RERA instead of Tenancy). Engaging grounded domain synthesis.');
        return this.generateDeterministicGuidance(query, analysis, chunks, options);
>>>>>>> origin/main
      }
    }

    // Guard 2: Builder / RERA dispute must not drift to Tenancy
    if (isRera) {
      const mentionsLandlord = guidanceLower.includes('landlord') && !guidanceLower.includes('builder');
      if (mentionsLandlord) {
<<<<<<< HEAD
        console.warn('[RagPipeline Guard] Detected domain drift in Gemini response (Tenancy instead of RERA). Withholding response.');
        return withheldResponse;
      }
    }

    if (isDomesticSafety) {
      const isOnTopic = /domestic|family|spouse|husband|wife|household|harassment|violence|safety/i.test(guidanceLower);
      const mentionsUnrelatedHousing = /security deposit|rental deposit|landlord|tenant|rera|builder/i.test(guidanceLower);
      if (!isOnTopic || mentionsUnrelatedHousing) {
        console.warn('[RagPipeline Guard] Withholding legal guidance that drifted from domestic/family safety.');
        return withheldResponse;
=======
        console.warn('[RagPipeline Guard] Detected domain drift in Gemini response (Tenancy instead of RERA). Engaging grounded domain synthesis.');
        return this.generateDeterministicGuidance(query, analysis, chunks, options);
>>>>>>> origin/main
      }
    }

    return data;
  }

<<<<<<< HEAD
  buildGreetingResponse(analysis, options = {}) {
    const greetingText = `Hello! I am **VidhiSetu AI**, your Indian legal assistant.

I can help analyze your legal questions under Indian law, cite authentic precedents from **Indian Kanoon**, and suggest actionable next steps.

### How can I help you today?
Here are some of the most common issues I can assist you with:
- 🏠 **Tenancy & Landlord Disputes**: Security deposit refunds, arbitrary deductions (painting / wear-and-tear), unlawful eviction, and 15-day statutory demand notices.
- 🏢 **Real Estate & RERA**: Builder delays in flat handover, statutory delay interest, or 100% refund under Section 18 of RERA.
- 🛍️ **Consumer Protection**: Defective products, refused refunds from e-commerce platforms, and service deficiencies under CPA 2019.
- 💼 **Employment & Labour**: Unpaid salary, wrongful termination, notice pay disputes, and full & final settlements.
- 💳 **Banking & Cheque Bounce**: Dishonour of cheques and statutory demand notices under Section 138 of the Negotiable Instruments Act.
- 🛡️ **Cyber Crime & UPI Fraud**: Unauthorized bank debits, online scams, and immediate freezing via 1930 / cybercrime portal.

Please describe what happened in your own words, and I will guide you through your legal rights and options!`;

    return {
      summary: 'VidhiSetu Legal AI Assistant introduction and domain capabilities.',
      problemSummary: 'VidhiSetu Legal AI Assistant introduction and domain capabilities.',
      category: 'General Legal Guidance',
      jurisdiction: analysis.jurisdiction || 'All India',
      detected_language: 'English',
      kanoonQuery: '',
      primaryKanoonQuery: '',
      kanoon_search_queries: [],
      legal_issues: ['Overview of Indian statutory rights, Kanoon precedents, and case assessment'],
      legalIssues: ['Overview of Indian statutory rights, Kanoon precedents, and case assessment'],
      possible_rights: [
        'Right to access statutory legal information',
        'Right to pre-litigation resolution and legal notice',
      ],
      possibleRights: [
        'Right to access statutory legal information',
        'Right to pre-litigation resolution and legal notice',
      ],
      relevant_laws: [
        { act: 'Constitution of India', section: 'Article 39A', plainMeaning: 'Equal justice and free legal aid to all citizens', applicability: 'Constitutional guarantee of access to justice' },
        { act: 'Code of Civil Procedure, 1908', section: 'Section 89', plainMeaning: 'Settlement of disputes outside the court (ADR)', applicability: 'Pre-litigation dispute resolution' },
      ],
      relevantLaws: [
        { act: 'Constitution of India', section: 'Article 39A', plainMeaning: 'Equal justice and free legal aid to all citizens', applicability: 'Constitutional guarantee of access to justice' },
        { act: 'Code of Civil Procedure, 1908', section: 'Section 89', plainMeaning: 'Settlement of disputes outside the court (ADR)', applicability: 'Pre-litigation dispute resolution' },
      ],
      similar_cases: [],
      relevantJudgments: [],
      guidance: greetingText,
      reply: greetingText,
      sources: [],
      allRetrievedJudgments: [],
      missing_information: [
        'Brief description of what happened in your situation',
        'City or State where the dispute arose',
        'Whether you have a written agreement or receipts',
      ],
      missingInformation: [
        'Brief description of what happened in your situation',
        'City or State where the dispute arose',
        'Whether you have a written agreement or receipts',
      ],
      suggestedNextSteps: [
        'My landlord is not refunding my security deposit',
        'Builder delayed my flat possession by 2 years',
        'Company terminated me without notice or salary',
        'Cheque given to me bounced due to insufficient funds',
      ],
      nextActions: [
        'Describe your legal dispute with key dates and amounts',
        'Mention any written agreement or notices exchanged',
      ],
      confidence: 'high',
      modelUsed: 'conversational_intro',
      executionMode: 'conversational_intro',
      disclaimer: STANDARD_DISCLAIMER,
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
    const category = (analysis.category || '').toLowerCase();
    const isDomesticSafety = category.includes('domestic / family safety');
    const isHarassment = category.includes('harassment');
    const isPendingBankTransaction = category.includes('banking / pending or failed transaction');
    const isBankTransaction = category.includes('banking / unauthorized electronic transaction') || isPendingBankTransaction;
    const includesDivorce = (analysis.legal_issues || []).some((issue) => /divorce/i.test(issue));
    const domesticText = analysis.missing_information?.length
      ? `I understand you are describing harassment involving a family or household relationship. ${analysis.missing_information.join(' ')} If you are in immediate danger, move to a safe place if possible and contact local emergency services.`
      : `I have noted the safety and incident details you provided${includesDivorce ? ', including that you are considering divorce' : ''}. I could not retrieve enough on-topic Indian Kanoon records to support a legal conclusion, so I will not guess at the law or remedies. If there is immediate danger, contact local emergency services or a trusted local support service. A qualified local advocate can advise on options based on your circumstances.`;
    const bankText = isPendingBankTransaction
      ? 'I understand the payment may be stuck or pending. Check the status in your official bank/payment app and whether your balance was actually debited. Do not retry while it is pending. Save the UTR/RRN and raise a dispute through official bank/payment support. If you did not authorize it, secure the account and call 1930. I could not retrieve enough verified Indian Kanoon evidence to assess reimbursement yet.'
      : 'I understand you are reporting money taken from your bank account without your knowledge. Contact your bank immediately using its official app or card number, report the transaction as unauthorized, ask the bank to secure the account and block compromised channels, and keep the complaint reference. Do not share OTPs, PINs, or passwords. If electronic fraud is suspected, call 1930 and file at cybercrime.gov.in. I could not retrieve enough verified Indian Kanoon evidence to assess liability or reimbursement yet.';
    const text = isBankTransaction
      ? bankText
      : isDomesticSafety
      ? domesticText
      : isHarassment
        ? 'I’m sorry you’re dealing with sexual harassment. Your message does not yet say what happened or what support you need, and I do not have relevant retrieved legal records to make a grounded legal assessment. Are you in immediate danger? If so, contact local emergency services. You can share where this happened, when it happened, whether it is ongoing, and what support you need. I will keep this separate from any earlier issue in the chat.'
      : 'Available legal records and previous court judgments on Indian Kanoon are currently insufficient to provide high-confidence guidance on this specific query. I have not substituted unrelated cases or an offline legal template. Please add the relevant facts or consult a qualified advocate.';
=======
    const text = 'Available legal records and previous court judgments on Indian Kanoon are currently insufficient to provide high-confidence statutory guidance on this specific query. A professional consultation with a licensed advocate is strongly advised.\n\n*(Note: Retrieved cases provide judicial context; applicability depends on specific factual correspondence with your case.)*';
>>>>>>> origin/main
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
<<<<<<< HEAD
      suggestedNextSteps: isBankTransaction ? (analysis.nextActions || []) : isDomesticSafety ? [] : ['Consult a licensed advocate for personalized advice'],
      nextActions: isBankTransaction ? (analysis.nextActions || []) : isDomesticSafety ? [] : ['Consult a licensed advocate for personalized advice'],
=======
      suggestedNextSteps: ['Consult a licensed advocate for personalized advice'],
      nextActions: ['Consult a licensed advocate for personalized advice'],
>>>>>>> origin/main
      confidence: 'low',
      modelUsed: 'none',
      executionMode: 'insufficient_evidence',
      disclaimer: STANDARD_DISCLAIMER,
    };
  }
<<<<<<< HEAD

  buildClarificationResponse(analysis) {
    const text = analysis.clarificationPrompt || 'I can help. What kind of problem are you dealing with? Please tell me what happened, who was involved, where and when it happened, and what outcome you want. If anyone is in immediate danger, contact local emergency services now.';
    return {
      summary: analysis.summary,
      problemSummary: analysis.summary,
      category: analysis.category,
      jurisdiction: analysis.jurisdiction,
      detected_language: analysis.detected_language,
      legal_issues: analysis.legal_issues || [],
      legalIssues: analysis.legal_issues || [],
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
      missing_information: analysis.missing_information,
      missingInformation: analysis.missing_information,
      suggestedNextSteps: analysis.nextActions || [],
      nextActions: analysis.nextActions || [],
      confidence: 'low',
      modelUsed: 'none',
      executionMode: analysis.executionMode || 'clarification_required',
      disclaimer: STANDARD_DISCLAIMER,
    };
  }
=======
>>>>>>> origin/main
}

export default RagPipeline;
