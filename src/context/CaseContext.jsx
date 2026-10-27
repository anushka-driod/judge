import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { caseService } from '../services/caseService';
import { conversationService } from '../services/conversationService';
import { useAuth } from '../hooks/useAuth';

const CaseContext = createContext(null);

// Seed conversations for default demo accounts
const initialSeedCases = [
  {
    id: 'case-101',
    title: 'Defective Smartphone Refund Dispute',
    category: 'Consumer Dispute & Refund',
    isPinned: true,
    createdAt: '2026-08-20T10:30:00Z',
    updatedAt: '2026-08-20T10:32:00Z',
    messages: [
      {
        id: 'seed-101-1',
        sender: 'user',
        text: 'I ordered a smartphone online for ₹24,999, but it arrived defective and refurbished. The seller refused a refund claiming their 7-day return window passed. What are my legal rights?',
        timestamp: '10:30 AM',
      },
      {
        id: 'seed-101-2',
        sender: 'ai',
        text: `Based on Indian consumer law, this is governed by the **Consumer Protection Act, 2019**.\n\n### Key Findings:\n1. **Unfair Trade Practice**: Under Section 2(47), supplying defective or refurbished goods in place of new goods constitutes an unfair trade practice.\n2. **Private Policy Override**: The Supreme Court and NCDRC have repeatedly ruled that private website return policies cannot override statutory consumer rights.\n3. **Available Remedies**: You are entitled to a 100% refund with interest and compensation for harassment.`,
        detectedLaws: [
          {
            act: 'Consumer Protection Act, 2019',
            section: 'Section 2(47) & Section 35',
            title: 'Unfair Trade Practice & e-Daakhil Filing',
          },
        ],
        detectedPrecedents: [
          {
            title: 'Ramesh Sharma vs. Cloud Retail India Ltd.',
            court: 'NCDRC (2022)',
            citation: '2022 SCC OnLine NCDRC 142',
          },
        ],
        suggestedNextSteps: [
          'Preserve original invoice and unboxing photos',
          'Lodge a free grievance on National Consumer Helpline (1915)',
          'Issue a formal 15-day pre-litigation demand notice',
        ],
        timestamp: '10:31 AM',
      },
    ],
  },
  {
    id: 'case-102',
    title: 'Dishonoured Cheque of ₹4,50,000',
    category: 'Banking & Cheque Bounce (Sec 138)',
    isPinned: false,
    createdAt: '2026-08-10T14:15:00Z',
    updatedAt: '2026-08-10T14:18:00Z',
    messages: [
      {
        id: 'seed-102-1',
        sender: 'user',
        text: 'A business client gave me an HDFC cheque for ₹4,50,000 for materials supplied. The cheque bounced with the memo "Funds Insufficient". What is the deadline to take legal action?',
        timestamp: '02:15 PM',
      },
      {
        id: 'seed-102-2',
        sender: 'ai',
        text: `Under Indian law, cheque bounce is primarily governed by **Section 138 of the Negotiable Instruments Act, 1881**.\n\n### Critical Time Limitations:\n1. **30-Day Window**: You must send a formal written **Statutory Demand Notice** within **30 days** of receiving the Bank Return Memo.\n2. **15-Day Cure Period**: The drawer has 15 days from receiving your notice to make the payment.\n3. **Court Complaint**: If payment is not received within 15 days, you have 1 month to file a criminal complaint before the Judicial Magistrate.\n\n*Important:* Do not miss the 30-day notice limitation or criminal recourse will be forfeited.`,
        detectedLaws: [
          {
            act: 'Negotiable Instruments Act, 1881',
            section: 'Section 138 & 142',
            title: 'Dishonour of Cheque & Limitation Periods',
          },
        ],
        detectedPrecedents: [
          {
            title: 'Dashrath Rupsingh Rathod vs. State of Maharashtra',
            court: 'Supreme Court of India',
            citation: '(2014) 9 SCC 129',
          },
        ],
        suggestedNextSteps: [
          'Collect official stamped Bank Return Memo',
          'Draft and dispatch 15-Day Demand Notice by Registered Speed Post',
          'Track postal delivery confirmation slip',
        ],
        timestamp: '02:17 PM',
      },
    ],
  },
  {
    id: 'case-103',
    title: 'Withheld Rental Security Deposit ₹70k',
    category: 'Tenancy & Security Deposit',
    isPinned: false,
    createdAt: '2026-06-15T09:00:00Z',
    updatedAt: '2026-06-15T09:05:00Z',
    messages: [
      {
        id: 'seed-103-1',
        sender: 'user',
        text: 'I vacated my rented apartment in Bengaluru 45 days ago after giving proper 1-month notice. Landlord is refusing to refund my ₹70,000 security deposit citing false painting charges. How do I recover it?',
        timestamp: '09:00 AM',
      },
      {
        id: 'seed-103-2',
        sender: 'ai',
        text: `Under tenancy jurisprudence and the **Karnataka Rent Control & Tenancy principles**:\n\n1. **Ordinary Wear & Tear**: Landlords cannot deduct standard wall painting or wear-and-tear costs from your deposit unless explicitly stipulated in a signed agreement.\n2. **Right to Refund**: Deposit must be refunded within 30 days of handing over vacant possession.\n3. **Legal Redress**: Issue an advocate demand notice followed by a summary recovery suit under Order 37 of CPC or approaching the Rent Court.\n\n*Next steps:* Issue formal pre-litigation demand notice giving 7 days.`,
        detectedLaws: [
          {
            act: 'Transfer of Property Act, 1882',
            section: 'Section 108',
            title: 'Rights and liabilities of lessor and lessee',
          },
        ],
        detectedPrecedents: [],
        suggestedNextSteps: [
          'Collect original lease agreement and move-out inspection handover',
          'Send 7-Day Pre-Litigation Legal Demand Notice via Registered Post',
        ],
        timestamp: '09:02 AM',
      },
    ],
  },
];
void initialSeedCases;

export function CaseProvider({ children }) {
  const { currentUser, isAuthenticated } = useAuth();
  const userId = currentUser?.id ? String(currentUser.id) : null;
  const sessionKey = userId ? `user:${userId}` : 'anonymous';
  return (
    <CaseSessionProvider key={sessionKey} userId={userId} isAuthenticated={isAuthenticated}>
      {children}
    </CaseSessionProvider>
  );
}

function CaseSessionProvider({ children, userId, isAuthenticated }) {
  const activeUserIdRef = useRef(userId);
  const [cases, setCases] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [conversationError, setConversationError] = useState('');

  useEffect(() => {
    activeUserIdRef.current = userId;
    let isMounted = true;
    if (!isAuthenticated || !userId) {
      setCases([]);
      setActiveCaseId(null);
      setConversationError('');
      return () => {
        isMounted = false;
      };
    }

    async function loadBackendConversations() {
      try {
        const res = await conversationService.getConversations();
        const convList = res?.conversations || (Array.isArray(res) ? res : []);
        const formatted = convList.map((conversation) => ({
          id: conversation.id,
          title: conversation.title || 'Legal Consultation',
          category: conversation.category || 'General Legal Guidance',
          isPinned: Boolean(conversation.isPinned ?? conversation.is_pinned),
          createdAt: conversation.createdAt || conversation.created_at || new Date().toISOString(),
          updatedAt: conversation.updatedAt || conversation.updated_at || new Date().toISOString(),
          messages: Array.isArray(conversation.messages) ? conversation.messages : [],
          messageCount: conversation.message_count || conversation.messageCount || 0,
        }));
        if (isMounted && activeUserIdRef.current === userId) {
          setCases(formatted);
          setActiveCaseId(formatted[0]?.id || null);
          setConversationError('');
        }
      } catch (err) {
        if (isMounted && activeUserIdRef.current === userId) {
          console.error("Unable to load this account's conversations:", err);
          setConversationError(err.message || 'Unable to load saved conversations.');
        }
      }
    }

    loadBackendConversations();
    return () => {
      isMounted = false;
    };
  }, [userId, isAuthenticated]);

  // Lazy-load complete messages for active conversation if needed
  useEffect(() => {
    if (!activeCaseId || !userId) return;
    const targetCase = cases.find((c) => c.id === activeCaseId);
    if (targetCase && (!targetCase.messages || targetCase.messages.length === 0)) {
      conversationService.getConversationById(activeCaseId).then((res) => {
        if (activeUserIdRef.current === userId && res?.conversation?.messages?.length > 0) {
          setCases((prev) =>
            prev.map((c) => (c.id === activeCaseId ? { ...c, messages: res.conversation.messages } : c))
          );
        }
      }).catch((error) => console.error('Unable to load conversation messages:', error));
    }
  }, [activeCaseId, cases, userId]);

  // Derived sorted list: Pinned first, then newest updatedAt
  const sortedCases = [...cases].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  // Active case is null when user clicks "+ New Case" / starts fresh chat
  const activeCase = activeCaseId ? (cases.find((c) => c.id === activeCaseId) || null) : null;

  // Helper to generate a clean, concise title from user text
  const generateTitleFromText = (text) => {
    if (!text) return 'New Legal Inquiry';
    const clean = text.replace(/["'*_]/g, '').trim();
    const words = clean.split(/\s+/);
    if (words.length <= 6) {
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    return words.slice(0, 5).join(' ') + '…';
  };

  /**
   * Starts a brand new case from the first user message.
   */
  const createChatCase = async (firstMessageText, initialAiResponse = null) => {
    if (!isAuthenticated || !userId) {
      throw new Error('Sign in before starting a private legal conversation.');
    }
    const newId = `case-${Date.now()}`;
    const generatedTitle = generateTitleFromText(firstMessageText);
    const now = new Date().toISOString();

    const userMsg = {
      id: `msg-${Date.now()}-usr`,
      sender: 'user',
      text: firstMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newCase = {
      id: newId,
      title: generatedTitle,
      category: 'Legal Consultation',
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      messages: [userMsg],
    };

    if (initialAiResponse) {
      newCase.messages.push({
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: initialAiResponse.reply || initialAiResponse.guidance || 'I have analyzed your situation.',
        detectedLaws: initialAiResponse.detectedLaws || [],
        detectedPrecedents: initialAiResponse.detectedPrecedents || [],
        suggestedNextSteps: initialAiResponse.suggestedNextSteps || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    await conversationService.createConversation({
      id: newId,
      title: generatedTitle,
      category: 'Legal Consultation',
      isPinned: false,
      initialMessage: userMsg,
    });
    if (activeUserIdRef.current !== userId) {
      throw new Error('Your account changed before the conversation could be opened. Please try again.');
    }
    setConversationError('');
    if (initialAiResponse) {
      await conversationService.addMessage(newId, {
        id: newCase.messages[1].id,
        sender: 'ai',
        text: newCase.messages[1].text,
        meta: {
          detectedLaws: initialAiResponse.detectedLaws || [],
          detectedPrecedents: initialAiResponse.detectedPrecedents || [],
          suggestedNextSteps: initialAiResponse.suggestedNextSteps || [],
        },
      });
    }

    setCases((prev) => [newCase, ...prev]);
    setActiveCaseId(newId);
    return newCase;
  };

  /**
   * Appends a message to an existing case.
   */
  const addMessageToCase = (caseId, message) => {
    if (!isAuthenticated || !userId) {
      return Promise.resolve(false);
    }
    const now = new Date().toISOString();
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            updatedAt: now,
            messages: [...(c.messages || []), message],
          };
        }
        return c;
      })
    );

    // Sync to backend database
    const ownerAtStart = userId;
    return conversationService.addMessage(caseId, {
      id: message.id,
      sender: message.sender,
      text: message.text,
      meta: {
        detectedEmotion: message.detectedEmotion,
        detectedLaws: message.detectedLaws,
        detectedPrecedents: message.detectedPrecedents,
        suggestedNextSteps: message.suggestedNextSteps,
        factGatheringQuestions: message.factGatheringQuestions,
        agentSteps: message.agentSteps,
      },
    }).then(() => {
      if (activeUserIdRef.current === ownerAtStart) setConversationError('');
      return true;
    }).catch((error) => {
      console.error('Failed to persist chat message:', error);
      if (activeUserIdRef.current === ownerAtStart) {
        setCases((prev) => prev.map((c) => (
          c.id === caseId
            ? { ...c, messages: (c.messages || []).filter((item) => item.id !== message.id) }
            : c
        )));
        setConversationError(error.message || 'Failed to save this chat message.');
      }
      return false;
    });
  };

  /**
   * Update a specific message in a case (e.g. for streaming response updates)
   */
  const updateMessageInCase = (caseId, messageId, patch) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: (c.messages || []).map((m) =>
              m.id === messageId ? { ...m, ...patch } : m
            ),
          };
        }
        return c;
      })
    );
  };

  /**
   * Remove the last message from a case (e.g. to retry/regenerate)
   */
  const removeLastMessage = (caseId) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId && c.messages && c.messages.length > 0) {
          return {
            ...c,
            messages: c.messages.slice(0, -1),
          };
        }
        return c;
      })
    );
  };

  /**
   * Pin or unpin a case. Pinned cases stay at the top.
   */
  const togglePinCase = (caseId) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const nextPinned = !c.isPinned;
          conversationService.updateConversation(caseId, { isPinned: nextPinned }).catch(() => null);
          return { ...c, isPinned: nextPinned };
        }
        return c;
      })
    );
  };

  /**
   * Renames a case title.
   */
  const renameCase = (caseId, newTitle) => {
    const trimmed = newTitle?.trim();
    if (!trimmed) return;
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, title: trimmed } : c))
    );
    conversationService.updateConversation(caseId, { title: trimmed }).catch(() => null);
  };

  /**
   * Deletes a case from the list.
   */
  const deleteCase = (caseId) => {
    setCases((prev) => {
      const remaining = prev.filter((c) => c.id !== caseId);
      if (activeCaseId === caseId) {
        setActiveCaseId(remaining[0]?.id || null);
      }
      return remaining;
    });
    conversationService.deleteConversation(caseId).catch(() => null);
  };

  /**
   * Resets active case to null to present a clean, empty chatbot screen.
   */
  const startFreshChat = () => {
    setActiveCaseId(null);
  };

  const selectCase = (caseId) => {
    setActiveCaseId(caseId);
  };

  /**
   * Delegates to caseService for dispute registration and deep guidance workflows
   */
  const createNewCase = async (caseData) => {
    const created = await caseService.createCase(caseData);
    const caseWithMessages = {
      ...created,
      messages: created.messages && created.messages.length > 0 ? created.messages : [
        {
          id: `msg-${Date.now()}-usr`,
          sender: 'user',
          text: caseData.description || caseData.title,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    setCases((prev) => [caseWithMessages, ...prev]);
    setActiveCaseId(created.id);
    return caseWithMessages;
  };

  const getCaseById = async (id) => {
    const found = cases.find((c) => c.id === id);
    if (found) return found;
    return await caseService.getCaseById(id);
  };

  const setCaseResolutionMode = async (caseId, mode) => {
    const updated = await caseService.selectCaseMode(caseId, mode);
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, mode, status: updated.status } : c)));
    return updated;
  };

  const updateCaseStatus = async (caseId, status) => {
    const updated = await caseService.updateCaseStatus(caseId, status);
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, status } : c)));
    return updated;
  };

  const updateActionStatus = async (caseId, actionId, newStatus) => {
    const updated = await caseService.updateActionPlanItem(caseId, actionId, newStatus);
    setCases((prev) => prev.map((c) => (c.id === caseId ? updated : c)));
    return updated;
  };

  return (
    <CaseContext.Provider
      value={{
        cases: sortedCases,
        rawCases: cases,
        activeCaseId,
        activeCase,
        conversationError,
        selectCase,
        startFreshChat,
        createChatCase,
        addMessageToCase,
        updateMessageInCase,
        removeLastMessage,
        togglePinCase,
        renameCase,
        deleteCase,
        createNewCase,
        getCaseById,
        setCaseResolutionMode,
        updateCaseStatus,
        updateActionStatus,
      }}
    >
      {children}
    </CaseContext.Provider>
  );
}

export function useCases() {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCases must be used within a CaseProvider');
  }
  return context;
}
