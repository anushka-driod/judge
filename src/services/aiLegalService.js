import { request } from './api';
import { mockLawsDatabase, mockJudgmentsDatabase } from '../data/mockData';

import { legalService } from './legalService';

const HARASSMENT_QUERY_PATTERN = /\b(?:sexual\s+)?(?:harassment|harrasment|harrassment|harassing|harrasing|harrassing|harassed|harrased|molestation|molest|abuse|abusive|threatened|threatening|domestic violence)\b/i;
const HARASSMENT_CONTEXT_PATTERN = /\b(workplace|work|office|online|public|school|college|university|home|when|date|ongoing|happened|occurred)\b/i;
const DOMESTIC_RELATIONSHIP_PATTERN = /\b(husband|wife|spouse|partner|father|mother|family member)\b/i;
const DIVORCE_QUERY_PATTERN = /\b(divorce|divorcing|marital separation|dissolution of marriage)\b/i;
const DIVORCE_FACT_PATTERN = /\b(mutual consent|contested|petition|filed|married|marriage date|children|custody|maintenance|alimony|state|court)\b/i;
const DIVORCE_REPLY_PATTERN = /\b(divorce|matrimonial|family law|spouse|husband|wife|marriage|maintenance|alimony|custody|Hindu Marriage Act|Special Marriage Act)\b/i;
const RENTAL_TOPIC_PATTERN = /\b(rental|rented|renting|landlord|tenant|tenancy|lease)\b/i;
const FAMILY_TOPIC_PATTERN = /\b(family|father|mother|parent|spouse|relative|inheritance)\b/i;
const TENANCY_QUERY_PATTERN = /\b(landlord|tenant|tenancy|rental|rent|deposit|lease|eviction)\b/i;
const TENANCY_RESPONSE_PATTERN = /\b(landlord|tenant|tenancy|security deposit|rental deposit|rent arrears|lease|eviction)\b/i;
const VAGUE_PROBLEM_PATTERN = /^(?:i have|i am having|i'm having|i am facing|i'm facing)\s+(?:(?:some|a|an)\s+)?(?:[\w'-]+\s+){0,3}(?:problems?|issues?|trouble)[.!?]*$/i;
const TENANCY_DRIFT_PATTERN = /\b(landlord|tenant|tenancy|security deposit|rental deposit|rera|builder|homebuyer)\b/i;
const NEW_LEGAL_ISSUE_PATTERN = /\b(landlord|tenant|tenancy|security deposit|builder|rera|cheque|employment|salary|consumer|fraud|refund|eviction|sexual harassment|divorce)\b/i;

function buildHarassmentClarification(query = '', history = []) {
  const messages = Array.isArray(history) ? history : [];
  const lastSafetyQuestionIndex = messages.findLastIndex((message) => message.sender === 'ai' && /harassment/i.test(message.text || '') && /safe right now|where did this happen|what support/i.test(message.text || ''));
  const episodeUsers = (lastSafetyQuestionIndex >= 0 ? messages.slice(lastSafetyQuestionIndex + 1) : messages.slice(-4))
    .filter((message) => message.sender === 'user')
    .map((message) => message.text || '');
  const facts = [...episodeUsers, query].join(' ').toLowerCase();
  const isDomestic = DOMESTIC_RELATIONSHIP_PATTERN.test(facts) || /\b(home|at home|in home)\b/i.test(facts);
  const atHome = /\b(home|at home|in home)\b/i.test(facts);
  const latestLocation = [...episodeUsers, query].findLast((text) => /\b(workplace|at work|office|online|public place|school|college|university|home|at home|in home)\b/i.test(text)) || '';
  const workplace = !isDomestic && /\b(workplace|at work|office|employer|colleague|coworker|boss)\b/i.test(latestLocation);
  const knownLocation = workplace || atHome || /\b(online|public place|school|college|university)\b/i.test(latestLocation);
  const knownTiming = /\b(yesterday|today|last (?:week|month|year)|\d+\s+(?:days?|weeks?|months?|years?) ago|on [a-z]+\s+\d{1,2})\b/i.test(facts);
  const knownOngoing = /\b(ongoing|still happening|continues|stopped|ended|not ongoing)\b/i.test(facts);
  const knownSafety = /\b(safe|unsafe|danger|not in danger)\b/i.test(facts);
  const knownReporting = /\b(reported|reporting|internal committee|complaint|not reported)\b/i.test(facts);
  const knownSupport = /\b(report|complaint|support|stop|action|advice|rights|divorce|what should i do)\b/i.test(facts);
  const knownConduct = /\b(physical harm|sexual conduct|threats|unwanted touching|messages|controlling|financial control|violence|hit|beat)\b/i.test(facts);
  const missingInformation = [];
  if (!knownSafety) missingInformation.push('Are you safe right now? If not, move to a safe place and contact local emergency services.');
  if (!knownConduct) missingInformation.push('What happened (for example, unwanted sexual conduct, physical harm, threats, messages, or controlling behavior)?');
  if (!knownLocation) missingInformation.push('Where did this happen (workplace, at home, online, public place, or elsewhere)?');
  if (!knownTiming || !knownOngoing) missingInformation.push('When did it happen, and is it ongoing?');
  if (workplace && !knownReporting) missingInformation.push('Have you reported it to your workplace Internal Committee or another authority?');
  if (/\bdivorce\b/i.test(facts)) missingInformation.push('You mentioned divorce. Are you looking for safety options, divorce-process information, or both?');
  else if (!knownSupport) missingInformation.push('What support or outcome are you looking for?');
  const questions = missingInformation.slice(0, 4);
  const acknowledgement = isDomestic
    ? `Thanks for clarifying that this involves a family member${atHome ? ' at home' : ''}. `
    : workplace
      ? 'Thanks for clarifying that it happened at work. '
      : knownLocation
        ? 'Thanks for clarifying where it happened. '
        : '';
  const divorceAcknowledgement = /\bdivorce\b/i.test(facts) ? ' I hear that you are also considering divorce; I can help with those options once we understand your safety needs.' : '';
  const reply = `I am sorry you are dealing with harassment. ${acknowledgement}${questions.join(' ')}${divorceAcknowledgement}`;
  return {
    reply,
    category: isDomestic ? 'Domestic / Family Safety & Harassment' : workplace ? 'Workplace Sexual Harassment' : 'Sexual Harassment / Safety',
    modelUsed: 'clarification_required',
    detectedLaws: [],
    detectedPrecedents: [],
    suggestedNextSteps: [],
    missingInformation: questions,
  };
}

function buildDivorceClarification(query = '', history = []) {
  const facts = [...history.filter((message) => message.sender === 'user').map((message) => message.text || ''), query].join(' ').toLowerCase();
  const consent = /\bmutual consent\b/i.test(facts) ? 'mutual consent' : /\bcontested\b/i.test(facts) ? 'contested' : '';
  const states = ['Andhra Pradesh', 'Delhi', 'Gujarat', 'Karnataka', 'Kerala', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'];
  const state = states.find((name) => facts.includes(name.toLowerCase()));
  const missingInformation = [];
  if (!consent) missingInformation.push('Is the divorce by mutual consent or contested?');
  if (!state) missingInformation.push('Which state are you in?');
  if (!/\b(petition|filed|not filed)\b/i.test(facts)) missingInformation.push('Has a divorce petition already been filed?');
  if (!/\b(children|child|maintenance|alimony|custody|no children)\b/i.test(facts)) missingInformation.push('Are children, maintenance, property, or immediate safety concerns involved?');
  if (!/\b(process|documents|filing|procedure|rights|support|what should i do)\b/i.test(facts)) missingInformation.push('What would you like help with first: the process, documents, or another issue?');
  const details = [consent, state].filter(Boolean).join(' in ');
  const acknowledgement = details ? `Thanks, I have noted ${details}. ` : '';
  const reply = `I can help with an Indian divorce or family-law question. ${acknowledgement}${missingInformation.slice(0, 4).join(' ')} You do not need to share names or other identifying details.`;
  return {
    reply,
    category: 'Family Law / Divorce',
    modelUsed: 'clarification_required',
    detectedLaws: [],
    detectedPrecedents: [],
    suggestedNextSteps: [],
    missingInformation: missingInformation.slice(0, 4),
  };
}

function buildRentalClarification() {
  const reply = 'I can help with a rental or housing issue, but I do not want to assume it is about a security deposit. Are you the tenant or landlord, and is the problem about rent, repairs, the agreement, notice, eviction, or something else? Please share your state and what happened.';
  const missingInformation = [
    'Are you the tenant, landlord, or another person involved?',
    'Is the issue about rent, repairs, an agreement, notice, eviction, or something else?',
    'What happened and in which state?',
  ];
  return { reply, category: 'Rental / Housing - details needed', modelUsed: 'clarification_required', detectedLaws: [], detectedPrecedents: [], suggestedNextSteps: [], missingInformation };
}

function buildFamilyClarification() {
  const reply = 'I can try to help, but “family issue” could involve very different legal matters. What happened with your father or family member: a property or inheritance dispute, maintenance, care, harassment, or something else? Please share your state and whether anyone is in immediate danger. You do not need to share names.';
  const missingInformation = [
    'What happened, and what is your relationship to the person involved?',
    'Is this about property or inheritance, maintenance, care, harassment, or something else?',
    'Which state are you in, and is anyone in immediate danger?',
  ];
  return { reply, category: 'Family matter - details needed', modelUsed: 'clarification_required', detectedLaws: [], detectedPrecedents: [], suggestedNextSteps: [], missingInformation };
}

export const aiLegalService = {
  /**
   * Real-time streaming legal guidance assistant via SSE with progressive fallback
   */
  async sendMessageStream(
    userMessage,
    conversationHistory = [],
    attachedDocs = [],
    { onMeta, onChunk, onComplete, onError, signal } = {}
  ) {
    const recentHistory = [...(conversationHistory || [])];
    if (recentHistory.at(-1)?.sender === 'user' && recentHistory.at(-1)?.text === userMessage) {
      recentHistory.pop();
    }
    const previousUserMessage = recentHistory.findLast((message) => message.sender === 'user');
    const latestAssistantMessage = recentHistory.findLast((message) => message.sender === 'ai');
    const hasRecentHarassmentReport = recentHistory.slice(-10).some((message) => message.sender === 'user' && HARASSMENT_QUERY_PATTERN.test(message.text || ''));
    const hasHarassmentHistory = hasRecentHarassmentReport &&
      /where did this happen|are you safe right now|please tell me where|what support/i.test(latestAssistantMessage?.text || '');
    const hasDivorceHistory = DIVORCE_QUERY_PATTERN.test(previousUserMessage?.text || '') &&
      DIVORCE_REPLY_PATTERN.test(latestAssistantMessage?.text || '') &&
      /mutual consent|contested|please share your state/i.test(latestAssistantMessage?.text || '');
    const isClarificationPrompt = /^clarification regarding:/i.test(userMessage.trim());
    const isDomesticHarassmentFollowUp = hasHarassmentHistory && DOMESTIC_RELATIONSHIP_PATTERN.test(userMessage) && /divorce|home|family|why/i.test(userMessage);
    const isHarassmentFollowUp = hasHarassmentHistory && (!NEW_LEGAL_ISSUE_PATTERN.test(userMessage) || isDomesticHarassmentFollowUp);
    const isDivorceFollowUp = hasDivorceHistory && !NEW_LEGAL_ISSUE_PATTERN.test(userMessage) && !HARASSMENT_QUERY_PATTERN.test(userMessage);
    const isHarassmentQuery = HARASSMENT_QUERY_PATTERN.test(userMessage) || isHarassmentFollowUp;
    const isDivorceQuery = DIVORCE_QUERY_PATTERN.test(userMessage) || isDivorceFollowUp;
    const isFamilyQuery = FAMILY_TOPIC_PATTERN.test(userMessage);
    const isTenancyQuery = TENANCY_QUERY_PATTERN.test(userMessage);
    const isBriefHarassmentReport = isHarassmentQuery && (
      (HARASSMENT_QUERY_PATTERN.test(userMessage) && !HARASSMENT_CONTEXT_PATTERN.test(userMessage)) ||
      (isHarassmentFollowUp && (isClarificationPrompt || isDomesticHarassmentFollowUp))
    );
    const isBriefDivorceReport = isDivorceQuery && (
      (DIVORCE_QUERY_PATTERN.test(userMessage) && !DIVORCE_FACT_PATTERN.test(userMessage)) ||
      (isDivorceFollowUp && isClarificationPrompt)
    );
    const isVagueInquiry = VAGUE_PROBLEM_PATTERN.test(userMessage.trim()) || /^(?:i need help|help me|please help|hi|hello)[.!?]*$/i.test(userMessage.trim());
    if (isVagueInquiry && recentHistory.length === 0) {
      const reply = 'Hello! I am VidhiSetu, your Public AI Legal Agent. How can I assist you today? Please explain your problem or dispute in plain words—for example, a tenancy dispute, unpaid salary, cheque bounce, consumer refund, or property issue. I will analyze your legal rights and provide an individualized step-by-step resolution process.';
      const meta = {
        category: 'General Legal Guidance',
        modelUsed: 'public_legal_agent',
        detectedLaws: [
          { act: 'Constitution of India', section: 'Article 39A', plainMeaning: 'Equal justice and free legal aid to all citizens.' },
          { act: 'Code of Civil Procedure, 1908', section: 'Section 89', plainMeaning: 'Alternative dispute resolution and pre-litigation settlement.' },
        ],
        detectedPrecedents: [],
        suggestedNextSteps: [
          'Describe what happened in your situation',
          'Mention the city or state where the dispute arose',
          'Mention any written agreements, notices, or receipts',
        ],
        missingInformation: [
          'What happened, in your own words?',
          'Who is involved (employer, landlord, seller, or another person)?',
          'Where and when did it happen?',
          'What outcome or support are you looking for?',
        ],
      };
      onMeta?.(meta);
      onChunk?.(reply, reply);
      onComplete?.(reply, meta);
      return { reply, ...meta };
    }

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');

    try {
      const response = await fetch(`${BASE_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: userMessage,
          message: userMessage,
          history: (conversationHistory || []).map((m) => ({ sender: m.sender, text: m.text })),
          attachedDocs,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Stream request failed with HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let metaReceived = null;

      let isCompleted = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            let event = null;
            try {
              event = JSON.parse(jsonStr);
            } catch (pe) {
              // Partial JSON frame; ignore parse failure and await remainder
              continue;
            }

            if (!event) continue;

            if (event.type === 'meta') {
              metaReceived = event;
              if (onMeta) onMeta(event);
            } else if (event.type === 'chunk') {
              accumulatedText += event.content || '';
              if (onChunk) onChunk(event.content || '', accumulatedText);
            } else if (event.type === 'done') {
              isCompleted = true;
              let fullText = event.fullReply || accumulatedText;
              try {
                reader.cancel().catch(() => {});
              } catch (_) {}
              if (onComplete) {
                try {
                  onComplete(fullText, metaReceived);
                } catch (cErr) {
                  console.error('[aiLegalService] onComplete callback error:', cErr);
                }
              }
              return { reply: fullText, ...metaReceived };
            } else if (event.type === 'error') {
              throw new Error(event.error || 'AI Legal Stream encountered an error');
            }
          }
        }

        // Flush any remaining buffer
        if (buffer && buffer.trim()) {
          const remainingLines = buffer.split('\n');
          for (const remLine of remainingLines) {
            const trimmed = remLine.trim();
            if (trimmed.startsWith('data:')) {
              try {
                const event = JSON.parse(trimmed.slice(5).trim());
                if (event.type === 'chunk') {
                  accumulatedText += event.content || '';
                  if (onChunk) onChunk(event.content || '', accumulatedText);
                } else if (event.type === 'done') {
                  accumulatedText = event.fullReply || accumulatedText;
                } else if (event.type === 'meta') {
                  metaReceived = event;
                  if (onMeta) onMeta(event);
                }
              } catch (_) {}
            }
          }
        }

        if (!isCompleted) {
          isCompleted = true;
          if (onComplete) {
            try {
              onComplete(accumulatedText, metaReceived);
            } catch (cErr) {
              console.error('[aiLegalService] onComplete callback error:', cErr);
            }
          }
        }
        return { reply: accumulatedText, ...metaReceived };
      } finally {
        try {
          reader.releaseLock();
        } catch (_) {}
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      console.warn('[aiLegalService] Backend stream unavailable, activating local intelligent legal fallback:', err.message);

      // Local Resilient Legal Guidance Fallback that maintains conversation memory
      const historyContextText = (conversationHistory || []).map((m) => m.text).join(' ').toLowerCase();
      const combinedQuery = `${userMessage} ${historyContextText}`.toLowerCase();

      let detectedCat = 'General Legal Guidance';
      let detectedLaws = [];
      let detectedPrecedents = [];
      let rights = [];
      let steps = [];

      if (/landlord|tenant|deposit|rent|lease|vacat|evict|painting/i.test(combinedQuery)) {
        detectedCat = 'Tenancy & Security Deposit';
        detectedLaws = [
          { act: 'Transfer of Property Act, 1882', section: 'Section 108(m) & (o)', plainMeaning: 'Tenant is not liable for regular wear and tear or aging of paint; deductions without verified contractor bills are unlawful.' },
          { act: 'Indian Contract Act, 1872', section: 'Section 73', plainMeaning: 'Compensation for breach of contract and wrongful retention of security deposit.' },
        ];
        detectedPrecedents = [
          { title: 'Suresh Kumar v. Om Prakash & Anr.', court: 'High Court of Delhi', citation: '2019 DLT 452', whyRelevant: 'Landlord cannot arbitrarily deduct wall painting or wear-and-tear charges from deposit.' },
        ];
        rights = [
          'Right to 100% refund of refundable security deposit upon peaceful handover',
          'Right against arbitrary deductions for normal wear & tear or nail holes',
          'Right to issue 15-day formal legal demand notice',
        ];
        steps = [
          '1. Review Lease Agreement: Verify notice period and key handover confirmation.',
          '2. Issue 15-Day Statutory Demand Notice via Speed Post AD.',
          '3. Apply for free pre-litigation mediation at District Legal Services Authority (DLSA).',
          '4. Approach jurisdictional Rent Court or file summary money recovery suit under Order 37 CPC.',
        ];
      } else if (/cheque|check|bounce|138|dishonour|drawer|memo/i.test(combinedQuery)) {
        detectedCat = 'Banking & Cheque Bounce (Sec 138 NI Act)';
        detectedLaws = [
          { act: 'Negotiable Instruments Act, 1881', section: 'Section 138', plainMeaning: 'Criminal liability for cheque dishonour with imprisonment up to 2 years or fine up to twice the cheque amount.' },
          { act: 'Negotiable Instruments Act, 1881', section: 'Section 143A', plainMeaning: 'Interim compensation up to 20% of cheque amount during trial.' },
        ];
        detectedPrecedents = [
          { title: 'Bir Singh v. Mukesh Kumar', court: 'Supreme Court of India', citation: '(2019) 4 SCC 197', whyRelevant: 'Once signature on cheque is admitted, statutory presumption mandates existence of debt.' },
        ];
        rights = [
          'Right to demand full cheque amount with interest from drawer',
          'Right to 20% interim compensation under Section 143A NI Act',
          'Right to file criminal complaint before Judicial Magistrate (JMFC/MM)',
        ];
        steps = [
          '1. Preserve Original Return Memo with bank stamp.',
          '2. Dispatch 15-Day Statutory Demand Notice within 30 days of receiving return memo.',
          '3. Wait for 15-day statutory payment window.',
          '4. File Section 138 criminal complaint within 30 days of notice expiry.',
        ];
      } else if (/salary|terminate|fired|wages|notice pay|fnf|employer|job|severance/i.test(combinedQuery)) {
        detectedCat = 'Employment & Labour Law';
        detectedLaws = [
          { act: 'Payment of Wages Act, 1936', section: 'Section 15', plainMeaning: 'Prompt payment of wages without unauthorized deductions within 7-10 days.' },
          { act: 'Industrial Disputes Act, 1947', section: 'Section 25F', plainMeaning: 'Retrenchment compensation and mandatory 1 month notice or pay in lieu thereof.' },
        ];
        detectedPrecedents = [
          { title: 'State of Haryana v. Om Prakash', court: 'Supreme Court of India', citation: '2006 (1) LLJ 65', whyRelevant: 'Abrupt termination without statutory notice pay or severance is illegal.' },
        ];
        rights = [
          'Right to 100% payment of earned wages and full & final settlement',
          'Right to statutory notice pay if terminated without notice period',
          'Right to relieving letter, service certificate, and PF transfer',
        ];
        steps = [
          '1. Send formal demand email to HR and management requesting itemized settlement.',
          '2. Issue 15-day statutory legal notice through an advocate.',
          '3. Register grievance on Ministry of Labour Samadhan Portal (samadhan.labour.gov.in).',
          '4. File claim before jurisdictional Assistant Labour Commissioner (ALC).',
        ];
      } else if (/consumer|flipkart|amazon|refund|defective|damaged|warranty/i.test(combinedQuery)) {
        detectedCat = 'Consumer Protection & E-Commerce';
        detectedLaws = [
          { act: 'Consumer Protection Act, 2019', section: 'Section 2(11) & Section 35', plainMeaning: 'Deficiency of service and filing of consumer complaint online on e-Daakhil portal.' },
          { act: 'Consumer Protection (E-Commerce) Rules, 2020', section: 'Rule 5 & 6', plainMeaning: 'Online marketplace entities cannot deny refunds for defective goods.' },
        ];
        detectedPrecedents = [
          { title: 'Lucknow Development Authority v. M.K. Gupta', court: 'Supreme Court of India', citation: '1994 AIR 787', whyRelevant: 'Commercial deficiency entitles consumer to 100% refund plus compensation for harassment.' },
        ];
        rights = [
          'Right to full refund or replacement under Consumer Protection Act 2019',
          'Right to compensation for mental agony and litigation expenses',
          'Right to file online complaint from home via e-Daakhil without lawyer fees',
        ];
        steps = [
          '1. File ticket on National Consumer Helpline (call 1915 or consumerhelpline.gov.in).',
          '2. Issue 15-day grievance notice to seller and marketplace grievance officer.',
          '3. Lodge complaint directly on e-Daakhil (edaakhil.nic.in) with District Commission.',
          '4. Claim full refund with 9-12% interest and compensation.',
        ];
      } else {
        detectedCat = 'Indian Civil & Statutory Law';
        detectedLaws = [
          { act: 'Constitution of India', section: 'Article 39A', plainMeaning: 'Equal justice and free legal aid to all citizens.' },
          { act: 'Code of Civil Procedure, 1908', section: 'Section 89', plainMeaning: 'Alternative dispute resolution through mediation, conciliation, and Lok Adalat.' },
        ];
        detectedPrecedents = [
          { title: 'Kailash Nath Associates v. DDA', court: 'Supreme Court of India', citation: '(2015) 4 SCC 136', whyRelevant: 'Damages can only be awarded where actual damage or breach is proven.' },
        ];
        rights = [
          'Right to pre-litigation conciliation via District Legal Services Authority (DLSA)',
          'Right to issue a formal 15-day statutory demand notice',
          'Right to seek redress before competent judicial commission or court',
        ];
        steps = [
          '1. Gather all written agreements, invoices, bank records, and correspondence.',
          '2. Send a formal 15-day demand notice by Speed Post AD specifying your claims.',
          '3. Approach District Legal Services Authority (nalsa.gov.in) for free mediation.',
          '4. Approach the appropriate court, tribunal, or statutory authority.',
        ];
      }

      const memoryAcknowledgment = recentHistory.length > 0
        ? `*Continuing previous conversation thread on ${detectedCat}:*\n\n`
        : '';

      const fallbackReply = `${memoryAcknowledgment}### 📄 Case Summary & Problem Assessment
Regarding your issue concerning **${detectedCat}**:
Under Indian law, your situation involves statutory rights and procedural remedies. Based on your description${recentHistory.length > 0 ? ' and our ongoing discussion' : ''}, here is the recommended individualized legal roadmap:

### ⚖️ Applicable Indian Statutes
${detectedLaws.map((l) => `- **${l.act} (${l.section})**: ${l.plainMeaning}`).join('\n')}

### 🏛️ Relevant Court Precedents
${detectedPrecedents.map((p) => `- **${p.title}** (*${p.court}*, ${p.citation}): ${p.whyRelevant}`).join('\n')}

### 💡 Your Legal Rights & Entitlements
${rights.map((r) => `- ${r}`).join('\n')}

### 📋 Suitable Legal Process & Step-by-Step Procedure
${steps.join('\n')}

### 📁 Immediate Evidence Checklist
- Written contract, agreement, invoice, or purchase memo
- Bank account statement and payment transaction proofs (UTR number)
- Written communications (emails, WhatsApp exports, letters)
- Postal speed post tracking slip confirming delivery of notice

---
*Disclaimer: This guidance is provided for informational and pre-litigation assistance under Indian law. It does not replace formal advocate representation in court.*`;

      const fallbackMeta = {
        category: detectedCat,
        modelUsed: 'VidhiSetu Indian Legal Engine (Local Mode)',
        detectedLaws,
        detectedPrecedents,
        possibleRights: rights.map((r) => ({ title: r, description: r })),
        suggestedNextSteps: steps,
        missingInformation: [
          'Specific dates of agreements, transactions, or notices',
          'State or city where the dispute arose',
          'Total financial amount involved in dispute',
        ],
        selfHelp: {
          actionPlan: steps.map((s, idx) => ({ step: idx + 1, title: s.split(':')[0] || `Step ${idx + 1}`, desc: s.split(':')[1] || s })),
          requiredDocuments: [
            'Written Agreement / Contract / Invoice',
            'Bank statements showing transaction proof',
            'Written communication logs (Email / WhatsApp)',
            'Postal speed post delivery confirmation report',
          ],
          filingProcess: 'Issue a 15-day legal notice by Speed Post. If unresolved, approach District Legal Services Authority (DLSA) or file before the competent jurisdictional court.',
          portalUrl: 'https://nalsa.gov.in/',
          portalName: 'National Legal Services Authority (NALSA / DLSA)',
        },
      };

      onMeta?.(fallbackMeta);
      onChunk?.(fallbackReply, fallbackReply);
      onComplete?.(fallbackReply, fallbackMeta);
      return { reply: fallbackReply, ...fallbackMeta };
    }
  },

  /**
   * Conversational legal guidance assistant.
   */
  async sendMessage(userMessage, conversationHistory = [], attachedDocs = []) {
    return request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage, history: conversationHistory, attachedDocs }),
    });
  },

  async getRelevantLaws(caseId) {
    return request(`/ai/cases/${caseId}/laws`, {}, () => mockLawsDatabase);
  },

  async getPrecedents(caseId) {
    return request(`/ai/cases/${caseId}/precedents`, {}, () => mockJudgmentsDatabase);
  },

  async searchJudgments(query, options) {
    return legalService.searchJudgments(query, options);
  },

  async getJudgmentDocument(docId, options) {
    return legalService.getJudgmentDocument(docId, options);
  },
};
