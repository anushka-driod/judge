import React, { createContext, useContext, useState, useEffect } from 'react';
import { caseService } from '../services/caseService';

const CaseContext = createContext(null);
const STORAGE_KEY = 'vidhisetu_cases_v2';

// Seed conversations for default cases
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
        text: 'I vacated my rental flat in Bengaluru after 2 years with all utility bills paid. The owner is refusing to return my security deposit of ₹70,000 citing general wear and tear.',
        timestamp: '09:00 AM',
      },
      {
        id: 'seed-103-2',
        sender: 'ai',
        text: `Under Indian contract jurisprudence and Model Tenancy principles:\n\n1. **Ordinary Wear & Tear**: Landlords cannot make deductions from security deposits for normal wear and tear (such as faded paint or regular aging of premises).\n2. **Itemized Accounting**: If any deduction is claimed, the landlord must provide itemized inspection proofs and valid repair invoices.\n3. **Legal Notice**: You can dispatch a formal legal demand notice claiming return of the deposit with 18% annual interest for wrongful retention.`,
        detectedLaws: [
          {
            act: 'Indian Contract Act, 1872',
            section: 'Section 73',
            title: 'Compensation for breach of contract',
          },
        ],
        suggestedNextSteps: [
          'Gather move-out photos and handover confirmation messages',
          'Send formal demand notice giving 7 days to transfer ₹70,000',
        ],
        timestamp: '09:02 AM',
      },
    ],
  },
];

export function CaseProvider({ children }) {
  const [cases, setCases] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved cases from localStorage:', e);
    }
    return initialSeedCases;
  });

  const [activeCaseId, setActiveCaseId] = useState(() => {
    return initialSeedCases[0]?.id || null;
  });

  // Save to localStorage whenever cases change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
    } catch (e) {
      console.warn('Failed to persist cases to localStorage:', e);
    }
  }, [cases]);

  // Derived sorted list: Pinned first, then newest updatedAt
  const sortedCases = [...cases].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  const activeCase = cases.find((c) => c.id === activeCaseId) || null;

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
  const createChatCase = (firstMessageText, initialAiResponse = null) => {
    const newId = `case-${Date.now()}`;
    const generatedTitle = generateTitleFromText(firstMessageText);
    const now = new Date().toISOString();

    const newCase = {
      id: newId,
      title: generatedTitle,
      category: 'Legal Consultation',
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}-usr`,
          sender: 'user',
          text: firstMessageText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
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

    setCases((prev) => [newCase, ...prev]);
    setActiveCaseId(newId);
    return newCase;
  };

  /**
   * Appends a message to an existing case.
   */
  const addMessageToCase = (caseId, message) => {
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
  };

  /**
   * Pin or unpin a case. Pinned cases stay at the top.
   */
  const togglePinCase = (caseId) => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, isPinned: !c.isPinned } : c))
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

  return (
    <CaseContext.Provider
      value={{
        cases: sortedCases,
        rawCases: cases,
        activeCaseId,
        activeCase,
        selectCase,
        startFreshChat,
        createChatCase,
        addMessageToCase,
        togglePinCase,
        renameCase,
        deleteCase,
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
