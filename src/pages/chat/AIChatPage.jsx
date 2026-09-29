<<<<<<< HEAD
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCases } from '../../context/CaseContext';
import { aiLegalService } from '../../services/aiLegalService';
import { MarkdownMessage } from '../../components/chat/MarkdownMessage';
=======
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCases } from '../../context/CaseContext';
import { aiLegalService } from '../../services/aiLegalService';
>>>>>>> origin/main
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { FileUpload } from '../../components/common/FileUpload';
import {
  Scale,
  Send,
  Paperclip,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  User,
  Users,
  AlertTriangle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowUp,
<<<<<<< HEAD
  ArrowDown,
  Copy,
  Check,
  RotateCw,
  Square,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Mic,
  MicOff,
  Compass,
  ShieldCheck,
  Lightbulb,
  Download,
  Calendar,
  MessageSquare,
  Phone,
  Video,
} from 'lucide-react';
import { mockLawyers } from '../../data/mockData';
=======
} from 'lucide-react';
>>>>>>> origin/main
import './AIChatPage.css';

export function AIChatPage() {
  const {
    activeCaseId,
    activeCase,
    createChatCase,
    addMessageToCase,
<<<<<<< HEAD
    updateMessageInCase,
    removeLastMessage,
=======
>>>>>>> origin/main
    startFreshChat,
  } = useCases();

  const navigate = useNavigate();
<<<<<<< HEAD
  const location = useLocation();

  // Input & composer state
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Streaming & generation state
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingMeta, setStreamingMeta] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [selectedPaths, setSelectedPaths] = useState({});

  // Scrolling & submission state
  const scrollAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const isSubmittingRef = useRef(false);
  const currentCaseIdRef = useRef(activeCaseId);
  const streamingTextRef = useRef('');
  const streamingMetaRef = useRef(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetch('/api/system/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.offlineMode || !data.isOnline) {
          setIsOffline(true);
        }
      })
      .catch(() => {
        setIsOffline(true);
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (location.state?.prefillQuery && !inputText) {
      setInputText(location.state.prefillQuery);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (abortControllerRef.current && currentCaseIdRef.current !== activeCaseId) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsAiThinking(false);
      setIsStreaming(false);
      setStreamingText('');
      setStreamingMeta(null);
      isSubmittingRef.current = false;
    }
    currentCaseIdRef.current = activeCaseId;
  }, [activeCaseId]);

  // Active messages from current case
  const currentMessages = activeCase?.messages || [];

  /**
   * Scroll to bottom with optional behavior
   */
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  /**
   * Intelligent Scroll Tracker
   * Checks if user is near bottom (< 90px threshold)
   * Shows floating jump button when scrolled up
   */
  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distanceFromBottom < 90;
    isNearBottomRef.current = isAtBottom;

    // Show jump button if user scrolled up more than 150px
    setShowScrollBottomBtn(distanceFromBottom > 150 && el.scrollHeight > el.clientHeight);
  }, []);

  /**
   * Auto-scroll on new messages or thinking state:
   * ONLY auto-scrolls if the user is ALREADY near the bottom.
   * If the user scrolled up to read an older message, DO NOT force-scroll!
   */
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [currentMessages.length, isAiThinking, isStreaming, scrollToBottom]);

  /**
   * Auto-scroll during streaming chunks if user remains at bottom
   */
  useEffect(() => {
    if (isStreaming && isNearBottomRef.current) {
      // Use instant scroll during rapid token streaming to prevent jerky animation
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    }
  }, [streamingText, isStreaming]);
=======

  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Active messages from current selected case (or empty for new case)
  const currentMessages = activeCase?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, isAiThinking]);
>>>>>>> origin/main

  // Autofocus input when starting a fresh case conversation
  useEffect(() => {
    if (!activeCaseId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeCaseId]);

<<<<<<< HEAD
  // Refocus input whenever AI generation completes, errors, or is stopped
  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    const isGenerating = isAiThinking || isStreaming;
    if (wasGeneratingRef.current && !isGenerating) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
    }
    wasGeneratingRef.current = isGenerating;
  }, [isAiThinking, isStreaming]);

  // Adjust textarea height dynamically up to 180px
=======
  // Adjust textarea height dynamically
>>>>>>> origin/main
  const handleTextChange = (e) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

<<<<<<< HEAD
  const handleClarificationAnswer = (question) => {
    setInputText('My answer: ');
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(11, 11);
    });
    console.info('[AIChatPage] Awaiting user response to clarification:', question);
  };

  /**
   * Flowchart Step 2: Voice Input Toggle (Web Speech API)
   */
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const spoken = finalTranscript || interimTranscript;
        if (spoken) {
          setInputText((prev) => {
            const prefix = prev.trim() ? prev.trim() + ' ' : '';
            return prefix + spoken;
          });
        }
      };

      recognition.onerror = (event) => {
        console.warn('[VoiceInput] Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[VoiceInput] Failed to start voice recognition:', err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  /**
   * Flowchart Step 5 / 6B: Match verified advocates based on case category
   */
  const getRecommendedLawyers = (category = '') => {
    const cat = (category || '').toLowerCase();
    let matches = [];

    if (cat.includes('crim') || cat.includes('bail') || cat.includes('fir') || cat.includes('police')) {
      matches = mockLawyers.filter((l) => l.practiceAreas.some((p) => /criminal|bail|police/i.test(p)));
    } else if (cat.includes('fam') || cat.includes('divorce') || cat.includes('matrimonial') || cat.includes('domestic')) {
      matches = mockLawyers.filter((l) => l.practiceAreas.some((p) => /family|divorce|matrimonial/i.test(p)));
    } else if (cat.includes('cyber') || cat.includes('fraud') || cat.includes('scam') || cat.includes('online')) {
      matches = mockLawyers.filter((l) => l.practiceAreas.some((p) => /cyber|fraud|tech/i.test(p)));
    } else if (cat.includes('tenan') || cat.includes('rent') || cat.includes('deposit') || cat.includes('eviction')) {
      matches = mockLawyers.filter((l) => l.practiceAreas.some((p) => /tenancy|rent|property|eviction/i.test(p)));
    } else if (cat.includes('labour') || cat.includes('employ') || cat.includes('salary') || cat.includes('termination')) {
      matches = mockLawyers.filter((l) => l.practiceAreas.some((p) => /employment|labour/i.test(p)));
    } else if (cat.includes('rera') || cat.includes('builder') || cat.includes('real estate')) {
      matches = mockLawyers.filter((l) => l.practiceAreas.some((p) => /rera|real estate|builder/i.test(p)));
    } else if (cat.includes('cheque') || cat.includes('138') || cat.includes('bank') || cat.includes('negotiable')) {
      matches = mockLawyers.filter((l) => l.practiceAreas.some((p) => /banking|cheque|financial|disputes/i.test(p)));
    } else if (cat.includes('consumer') || cat.includes('defect') || cat.includes('e-commerce') || cat.includes('refund')) {
      matches = mockLawyers.filter((l) => l.practiceAreas.some((p) => /consumer|contract/i.test(p)));
    }

    if (matches.length < 2) {
      const ids = new Set(matches.map((m) => m.id));
      for (const l of mockLawyers) {
        if (!ids.has(l.id)) {
          matches.push(l);
          if (matches.length >= 2) break;
        }
      }
    }

    return matches.slice(0, 2);
  };

  /**
   * Flowchart Step 5: Toggle between 6A (Self-Help) and 6B (Consult Lawyer)
   */
  const togglePath = (msgId, pathType) => {
    setSelectedPaths((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === pathType ? null : pathType,
    }));
  };

  /**
   * Send Message (With Real SSE Streaming and fallback)
   */
  const handleSendMessage = async (textToSend = inputText) => {
    const trimmed = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!trimmed && attachedFiles.length === 0) return;
    if (isSubmittingRef.current || isAiThinking || isStreaming) return;

    isSubmittingRef.current = true;
=======
  const handleSendMessage = async (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed && attachedFiles.length === 0) return;
>>>>>>> origin/main

    const userMessage = {
      id: `usr-msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      attachedFiles: [...attachedFiles],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

<<<<<<< HEAD
    let targetCaseId = currentCaseIdRef.current || activeCaseId;

    // New Case Flow: If no active case, create one automatically
    if (!targetCaseId) {
      const createdCase = createChatCase(trimmed);
      targetCaseId = createdCase.id;
      currentCaseIdRef.current = targetCaseId;
=======
    let targetCaseId = activeCaseId;

    // 7. New Case Flow: If no active case, create one automatically from first message
    if (!targetCaseId) {
      const createdCase = createChatCase(trimmed);
      targetCaseId = createdCase.id;
>>>>>>> origin/main
    } else {
      addMessageToCase(targetCaseId, userMessage);
    }

<<<<<<< HEAD
    // Reset composer immediately so input is cleared and ready for next turn
=======
>>>>>>> origin/main
    setInputText('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
<<<<<<< HEAD

    // Always scroll to bottom when user explicitly sends a message
    isNearBottomRef.current = true;
    setTimeout(() => scrollToBottom('smooth'), 50);

    // Prepare streaming state
    setIsAiThinking(true);
    setIsStreaming(false);
    setStreamingText('');
    setStreamingMeta(null);
    streamingTextRef.current = '';
    streamingMetaRef.current = null;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Safety watchdog: reset after 25s max if anything hangs, committing partial text
    const safetyTimeout = setTimeout(() => {
      if (isSubmittingRef.current) {
        console.warn('[AIChatPage] Safety watchdog triggered: resetting AI thinking/streaming states.');
        if (streamingTextRef.current && streamingTextRef.current.trim()) {
          const rescuedAiMessage = {
            id: `ai-msg-rescued-${Date.now()}`,
            sender: 'ai',
            text: streamingTextRef.current,
            detectedLaws: streamingMetaRef.current?.detectedLaws || [],
            detectedPrecedents: streamingMetaRef.current?.detectedPrecedents || [],
            possibleRights: streamingMetaRef.current?.possibleRights || [],
            selfHelp: streamingMetaRef.current?.selfHelp || null,
            suggestedNextSteps: streamingMetaRef.current?.suggestedNextSteps || [],
            missingInformation: streamingMetaRef.current?.missingInformation || [],
            category: streamingMetaRef.current?.category || '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addMessageToCase(targetCaseId, rescuedAiMessage);
        }
        setIsAiThinking(false);
        setIsStreaming(false);
        setStreamingText('');
        setStreamingMeta(null);
        streamingTextRef.current = '';
        streamingMetaRef.current = null;
        isSubmittingRef.current = false;
        setTimeout(() => textareaRef.current?.focus(), 60);
      }
    }, 25000);

    try {
      const conversationContext = [...currentMessages, userMessage];

      await aiLegalService.sendMessageStream(
        trimmed,
        conversationContext,
        attachedFiles,
        {
          signal: abortController.signal,
          onMeta: (meta) => {
            streamingMetaRef.current = meta;
            setStreamingMeta(meta);
          },
          onChunk: (chunk, accText) => {
            streamingTextRef.current = accText;
            setIsAiThinking(false);
            setIsStreaming(true);
            setStreamingText(accText);
          },
          onComplete: (fullReply, meta) => {
            clearTimeout(safetyTimeout);
            setIsAiThinking(false);
            setIsStreaming(false);
            isSubmittingRef.current = false;

            const replyToSave = fullReply || streamingTextRef.current || 'I have analyzed your situation under Indian legal principles.';
            const metaToSave = meta || streamingMetaRef.current;

            const finalAiMessage = {
              id: `ai-msg-${Date.now()}`,
              sender: 'ai',
              text: replyToSave,
              detectedLaws: metaToSave?.detectedLaws || metaToSave?.relevant_laws || [],
              detectedPrecedents: metaToSave?.detectedPrecedents || metaToSave?.similar_cases || [],
              possibleRights: metaToSave?.possibleRights || metaToSave?.rights_and_options || [],
              selfHelp: metaToSave?.selfHelp || null,
              suggestedNextSteps: metaToSave?.suggestedNextSteps || [],
              missingInformation: metaToSave?.missingInformation || metaToSave?.missing_information || [],
              category: metaToSave?.category || '',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            addMessageToCase(targetCaseId, finalAiMessage);
            setStreamingText('');
            setStreamingMeta(null);
            streamingTextRef.current = '';
            streamingMetaRef.current = null;
            setTimeout(() => {
              textareaRef.current?.focus();
            }, 60);
          },
          onError: (err) => {
            clearTimeout(safetyTimeout);
            console.error('[AIChatPage] Stream callback error:', err);
            setIsAiThinking(false);
            setIsStreaming(false);
            isSubmittingRef.current = false;
          },
        }
      );
    } catch (err) {
      clearTimeout(safetyTimeout);
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        const fallbackText = 'The legal AI service is unavailable, so no answer was generated. Please try again when the service is connected.';
        const fallbackAi = {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addMessageToCase(targetCaseId, fallbackAi);
      }
    } finally {
      clearTimeout(safetyTimeout);
      setIsAiThinking(false);
      setIsStreaming(false);
      setStreamingText('');
      setStreamingMeta(null);
      streamingTextRef.current = '';
      streamingMetaRef.current = null;
      isSubmittingRef.current = false;
      abortControllerRef.current = null;
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
    }
  };

  /**
   * Stop ongoing generation
   */
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const currentCase = currentCaseIdRef.current || activeCaseId;
    if (streamingText && currentCase) {
      const partialAiMessage = {
        id: `ai-msg-stopped-${Date.now()}`,
        sender: 'ai',
        text: streamingText,
        detectedLaws: streamingMeta?.detectedLaws || [],
        detectedPrecedents: streamingMeta?.detectedPrecedents || [],
        possibleRights: streamingMeta?.possibleRights || [],
        selfHelp: streamingMeta?.selfHelp || null,
        suggestedNextSteps: streamingMeta?.suggestedNextSteps || [],
        missingInformation: streamingMeta?.missingInformation || [],
        category: streamingMeta?.category || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addMessageToCase(currentCase, partialAiMessage);
    }

    setIsAiThinking(false);
    setIsStreaming(false);
    setStreamingText('');
    setStreamingMeta(null);
    streamingTextRef.current = '';
    streamingMetaRef.current = null;
    isSubmittingRef.current = false;
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
  };

  /**
   * Regenerate response for the latest user prompt
   */
  const handleRegenerate = () => {
    if (!activeCaseId || currentMessages.length < 2 || isAiThinking || isStreaming) return;

    // Find the last user message
    let lastUserMessage = null;
    for (let idx = currentMessages.length - 1; idx >= 0; idx--) {
      if (currentMessages[idx].sender === 'user') {
        lastUserMessage = currentMessages[idx];
        break;
      }
    }

    if (!lastUserMessage) return;

    // Remove the last AI message
    if (currentMessages[currentMessages.length - 1].sender === 'ai') {
      removeLastMessage(activeCaseId);
    }

    // Re-trigger send with previous prompt
    handleSendMessage(lastUserMessage.text);
  };

  /**
   * Copy message text to clipboard
   */
  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  /**
   * Provide user feedback (thumbs up / down)
   */
  const handleFeedback = (msgId, type) => {
    setFeedbackGiven((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? null : type,
    }));
  };

  /**
   * Start fresh chat / clear active case safely
   */
  const handleStartFreshChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAiThinking(false);
    setIsStreaming(false);
    setStreamingText('');
    setStreamingMeta(null);
    isSubmittingRef.current = false;
    currentCaseIdRef.current = null;
    startFreshChat();
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
=======
    setIsAiThinking(true);

    try {
      // Call Member 3 RAG Pipeline / Legal Analyzer
      const aiResponse = await aiLegalService.sendMessage(
        trimmed,
        currentMessages,
        attachedFiles
      );

      const aiMessage = {
        id: `ai-msg-${Date.now()}`,
        sender: 'ai',
        text: aiResponse.reply || aiResponse.guidance || 'I have analyzed your situation under Indian legal principles.',
        detectedLaws: aiResponse.detectedLaws || aiResponse.relevant_laws || [],
        detectedPrecedents: aiResponse.detectedPrecedents || aiResponse.similar_cases || [],
        suggestedNextSteps: aiResponse.suggestedNextSteps || [],
        missingInformation: aiResponse.missing_information || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      addMessageToCase(targetCaseId, aiMessage);
    } catch (err) {
      console.error('Chat error:', err);
      const fallbackAi = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'I apologize, but I encountered an issue analyzing this specific issue. Please ensure your problem includes context like dates, state, or contract terms.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addMessageToCase(targetCaseId, fallbackAi);
    } finally {
      setIsAiThinking(false);
    }
>>>>>>> origin/main
  };

  const handleStarterClick = (starterText) => {
    handleSendMessage(starterText);
  };

  const starterCards = [
    {
<<<<<<< HEAD
      icon: '🏠',
      title: 'Security Deposit Withheld',
      desc: 'Landlord refuses deposit refund or made arbitrary deductions',
      prompt: 'My landlord is withholding my ₹70,000 security deposit after I vacated the house with proper 30-day notice and claims ₹25,000 for painting.',
    },
    {
=======
>>>>>>> origin/main
      icon: '🏢',
      title: 'Wrongful Job Dismissal',
      desc: 'Terminated without 30 days statutory notice or severance pay',
      prompt: 'My employer removed me from my job without giving me notice or severance pay. What are my rights under Indian labour law?',
    },
    {
      icon: '💳',
      title: 'Cheque Dishonour (Sec 138)',
      desc: 'Bounced cheque and 30-day statutory notice period limitation',
      prompt: 'A business client gave me a cheque of ₹2,50,000 which bounced due to insufficient funds. What is the legal procedure and time limit to take action?',
    },
    {
<<<<<<< HEAD
      icon: '🛡️',
      title: 'Cyber Fraud & Unauthorized Debit',
      desc: 'Unrecognized UPI/bank debit and 1930 reporting helpline',
      prompt: '₹45,000 was debited from my bank account via unauthorized UPI transactions without any OTP or alert. What immediate steps and legal notice should I issue?',
    },
    {
=======
>>>>>>> origin/main
      icon: '📦',
      title: 'Defective Product & Refund',
      desc: 'E-commerce platform refused return for damaged goods',
      prompt: 'I purchased an electronic appliance online that arrived damaged and defective, but the seller refused refund citing their 7-day return policy.',
    },
    {
<<<<<<< HEAD
      icon: '🏗️',
      title: 'Builder Possession Delay',
      desc: 'RERA delayed handover compensation or 100% full refund',
      prompt: 'My builder delayed flat possession by over 14 months beyond the date promised in the Agreement for Sale. Can I claim full refund under RERA?',
    },
    {
      icon: '📜',
      title: 'Mutual Consent Divorce',
      desc: 'Section 13B mutual consent procedure and 6-month period',
      prompt: 'My spouse and I have lived separately for over a year and wish to file for mutual consent divorce. What is the court process, cooling period, and paperwork needed?',
    },
    {
      icon: '⚖️',
      title: 'Property Partition & Rights',
      desc: 'Ancestral property share dispute among legal heirs',
      prompt: 'My siblings are refusing to give me my lawful share of our ancestral residential property after our father passed away without leaving a will. What legal steps should I take?',
    },
=======
      icon: '🏠',
      title: 'Builder Possession Delay',
      desc: 'RERA delayed handover compensation or full refund',
      prompt: 'My builder delayed flat possession by over 14 months beyond the date promised in the Agreement for Sale. Can I claim full refund under RERA?',
    },
>>>>>>> origin/main
  ];

  return (
    <div className="vidhisetu-chat-layout animate-fade-in">
<<<<<<< HEAD
      {/* 1. Header Toolbar */}
      <header className="chat-top-toolbar">
        <div className="chat-top-left">
          <div className="chat-brand-pill">
            <Scale size={16} className="chat-brand-icon" />
            <span className="chat-brand-title">
              {activeCase?.title || 'Public Legal Agent'}
            </span>
          </div>
          {activeCase?.category && (
            <span className="chat-category-badge">{activeCase.category}</span>
          )}
        </div>

        <div className="chat-top-right">
          <div
            className={`chat-connectivity-badge ${isOffline ? 'badge-offline' : ''}`}
            title={isOffline ? 'Legal AI backend is operating in local RAG mode' : 'Legal AI backend is connected'}
          >
            <span className={`connectivity-dot ${isOffline ? 'dot-offline' : 'dot-online'}`} />
            <span>{isOffline ? 'Local Legal AI' : 'Legal AI Connected'}</span>
          </div>

          {activeCaseId && (
            <button
              type="button"
              className="chat-fresh-btn"
              onClick={handleStartFreshChat}
              title="Start a new chat"
            >
              <Sparkles size={14} />
              <span>+ New Inquiry</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Scrollable Conversation Stream */}
      <div
        className="chat-scroll-area"
        ref={scrollAreaRef}
        onScroll={handleScroll}
      >
        <div className="chat-inner-column">
          {/* Empty State / Welcome Screen */}
=======
      {/* Scrollable Conversation Stream */}
      <div className="chat-scroll-area">
        <div className="chat-inner-column">
          {/* Empty State / New Case Screen */}
>>>>>>> origin/main
          {currentMessages.length === 0 ? (
            <div className="chat-empty-hero animate-fade-in">
              <div className="hero-badge-container">
                <div className="hero-logo-badge">
                  <Scale size={32} />
                </div>
              </div>
<<<<<<< HEAD
              <h1 className="hero-title">Public AI Legal Agent</h1>
              <p className="hero-subtitle">
                Individualized Legal Procedures • Authentic Kanoon Precedents • Multi-Turn Memory
              </p>
              
              <div className="hero-pill-badges">
                <span className="hero-pill">
                  <Users size={12} /> Free Public Access
                </span>
                <span className="hero-pill">
                  <Clock size={12} /> Suitable Individualized Process
                </span>
                <span className="hero-pill">
                  <MessageSquare size={12} /> Chat Context Memory
                </span>
                <span className="hero-pill">
                  <ShieldCheck size={12} /> Grounded in Indian Law
                </span>
              </div>

              <p className="hero-explanation">
                Explain any legal grievance in your own words (English, Telugu, or Tanglish). VidhiSetu tailors a suitable legal roadmap for your specific issue, cites authentic Indian judicial precedents, and remembers your facts as you ask follow-up questions.
=======
              <h1 className="hero-title">VidhiSetu AI</h1>
              <p className="hero-subtitle">
                How can I help with your legal situation today?
              </p>
              <p className="hero-explanation">
                Describe your dispute in everyday words. VidhiSetu researches relevant Indian statutes,
                court precedents, and guides you on self-help or advocate consultation.
>>>>>>> origin/main
              </p>

              <div className="hero-starters-grid">
                {starterCards.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="starter-card"
                    onClick={() => handleStarterClick(card.prompt)}
                  >
                    <span className="starter-emoji">{card.icon}</span>
                    <div className="starter-content">
                      <strong className="starter-card-title">{card.title}</strong>
                      <span className="starter-card-desc">{card.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Conversation Messages */
            <div className="chat-messages-list">
<<<<<<< HEAD
              {currentMessages.map((msg, index) => {
                const isLastAiMessage =
                  msg.sender === 'ai' && index === currentMessages.length - 1;

                return (
                  <div
                    key={msg.id}
                    className={`chat-message-row message-from-${msg.sender}`}
                  >
                    <div className="message-avatar">
                      {msg.sender === 'ai' ? (
                        <div className="ai-avatar-badge" title="VidhiSetu Legal Assistant">
                          <Scale size={16} />
                        </div>
                      ) : (
                        <div className="user-avatar-badge" title="You">
                          <User size={16} />
                        </div>
                      )}
                    </div>

                    <div className="message-bubble">
                      <div className="message-header-meta">
                        <span className="message-sender-name">
                          {msg.sender === 'ai' ? 'VidhiSetu AI' : 'You'}
                        </span>
                        <span className="message-time">{msg.timestamp}</span>
                      </div>

                      {/* Render Rich Markdown Text */}
                      <div className="message-text">
                        <MarkdownMessage content={msg.text} />
                      </div>

                      {/* Attached file chips */}
                      {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                        <div className="message-attachments">
                          <span className="attachments-title">Attached Evidence:</span>
                          {msg.attachedFiles.map((file, idx) => (
                            <span key={idx} className="attachment-chip">
                              <FileText size={14} /> {file.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Relevant Indian Statutes */}
                      {msg.detectedLaws && msg.detectedLaws.length > 0 && (
                        <div className="chat-sources-block">
                          <div className="sources-heading">
                            <BookOpen size={15} />
                            <span>Relevant Indian Statutes:</span>
                          </div>
                          <div className="sources-cards-list">
                            {msg.detectedLaws.map((law, idx) => (
                              <div key={idx} className="source-card">
                                <strong>
                                  {law.act || law.act_name || law.name}{' '}
                                  {law.section ? `– ${law.section}` : ''}
                                </strong>
                                {(law.plainMeaning || law.explanation || law.summary) && (
                                  <p>{law.plainMeaning || law.explanation || law.summary}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cited Judicial Precedents (Indian Kanoon) */}
                      {msg.detectedPrecedents && msg.detectedPrecedents.length > 0 && (
                        <div className="chat-sources-block precedents-block">
                          <div className="sources-heading">
                            <Scale size={15} />
                            <span>Court Precedents (Indian Kanoon):</span>
                          </div>
                          <div className="sources-cards-list">
                            {msg.detectedPrecedents.map((judg, idx) => (
                              <div key={idx} className="source-card precedent-source-card">
                                <div className="precedent-card-top">
                                  <strong>
                                    {judg.title || judg.caseName} {judg.year ? `(${judg.year})` : ''}
                                  </strong>
                                  {judg.court && (
                                    <span className="citation-badge court-badge">
                                      {judg.court}
                                    </span>
                                  )}
                                  {judg.citation && (
                                    <span className="citation-badge">{judg.citation}</span>
                                  )}
                                </div>
                                {(judg.keyExtract || judg.extract) && (
                                  <blockquote className="precedent-extract">
                                    <strong>Case Extract:</strong> "
                                    {((judg.keyExtract || judg.extract).length > 250
                                      ? (judg.keyExtract || judg.extract).slice(0, 250) + '…'
                                      : judg.keyExtract || judg.extract)}
                                    "
                                  </blockquote>
                                )}
                                {judg.whyRelevant && (
                                  <p className="takeaway-text">💡 {judg.whyRelevant}</p>
                                )}
                                <div className="precedent-links-row">
                                  <Link
                                    to={`/judgments/${judg.caseId || judg.id || judg.documentId || '109283'}`}
                                    className="precedent-kanoon-link"
                                  >
                                    View Full Court Judgment →
                                  </Link>
                                  {judg.sourceUrl && (
                                    <a
                                      href={judg.sourceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="precedent-kanoon-link link-external"
                                    >
                                      <span>Indian Kanoon</span>
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Statutory Rights & Possible Options (Flowchart Step 4 - Pillar 4) */}
                      {msg.possibleRights && msg.possibleRights.length > 0 && (
                        <div className="chat-sources-block rights-options-block">
                          <div className="sources-heading">
                            <ShieldCheck size={15} />
                            <span>Statutory Rights & Possible Options:</span>
                          </div>
                          <div className="rights-cards-list">
                            {msg.possibleRights.map((item, idx) => (
                              <div key={idx} className="source-card right-option-card">
                                <div className="right-card-header">
                                  <Lightbulb size={14} className="right-bulb-icon" />
                                  <strong>{item.title || item.right}</strong>
                                </div>
                                {item.description && <p className="right-desc">{item.description}</p>}
                                {item.basis && <span className="right-basis-pill">Statutory Basis: {item.basis}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Information / Clarification Questions (Flowchart Step 4 - Pillar 6) */}
                      {msg.missingInformation && msg.missingInformation.length > 0 && (
                        <div className="missing-info-card">
                          <div className="missing-info-header">
                            <HelpCircle size={15} />
                            <span>Important Questions to Clarify:</span>
                          </div>
                          <ul className="missing-info-list">
                            {msg.missingInformation.map((item, idx) => (
                              <li key={idx}>
                                <span>{item}</span>
                                <button
                                  type="button"
                                  className="clarify-chip-btn"
                                  aria-label={`Answer clarification: ${item}`}
                                  onClick={() => handleClarificationAnswer(item)}
                                >
                                  Answer in chat
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggested Next Steps (Flowchart Step 4 - Pillar 5) */}
                      {msg.suggestedNextSteps && msg.suggestedNextSteps.length > 0 && (
                        <div className="suggested-actions-box">
                          <span className="suggested-actions-title">
                            <CheckCircle2 size={15} /> Practical Next Steps:
                          </span>
                          <ul className="suggested-actions-list">
                            {msg.suggestedNextSteps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                          <div className="action-box-footer">
                            <Link
                              to={`/cases/${activeCaseId || 'case-101'}/action-plan`}
                              className="action-link-btn"
                            >
                              <span>Open Step-by-Step Action Plan</span>
                              <ArrowRight size={14} />
                            </Link>
                            <Link
                              to={`/cases/${activeCaseId || 'case-101'}/lawyers`}
                              className="action-link-btn btn-secondary"
                            >
                              <Users size={14} />
                              <span>Find Recommended Advocates</span>
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Flowchart Step 5: Choose Path ("Do you need a lawyer?") */}
                      {msg.sender === 'ai' && (msg.suggestedNextSteps?.length > 0 || msg.detectedLaws?.length > 0 || msg.possibleRights?.length > 0) && (
                        <div className="flowchart-path-card animate-fade-in">
                          <div className="flowchart-path-header">
                            <div className="path-header-text">
                              <div className="path-step-badge">
                                <Compass size={13} />
                                <span>Step 5: Choose Your Legal Path</span>
                              </div>
                              <h4 className="path-question-title">Do you need a lawyer?</h4>
                              <p className="path-question-desc">
                                Select whether to resolve this issue independently using free self-help tools or consult a verified advocate.
                              </p>
                            </div>
                            <div className="path-choice-toggles">
                              <button
                                type="button"
                                className={`path-choice-btn selfhelp-toggle ${selectedPaths[msg.id] === 'selfhelp' ? 'selected' : ''}`}
                                onClick={() => togglePath(msg.id, 'selfhelp')}
                              >
                                <span className="choice-number-tag">Option 6A</span>
                                <span className="choice-label">No (Self-Help)</span>
                              </button>
                              <button
                                type="button"
                                className={`path-choice-btn lawyer-toggle ${selectedPaths[msg.id] === 'lawyer' ? 'selected' : ''}`}
                                onClick={() => togglePath(msg.id, 'lawyer')}
                              >
                                <span className="choice-number-tag">Option 6B</span>
                                <span className="choice-label">Yes (Consult Lawyer)</span>
                              </button>
                            </div>
                          </div>

                          {/* 6A. Self-Help Case Flow */}
                          {selectedPaths[msg.id] === 'selfhelp' && (
                            <div className="flowchart-flow-container selfhelp-flow-container animate-fade-in">
                              <div className="flow-container-title-bar">
                                <span className="flow-container-badge green-badge">6A. Self-Help Case Flow</span>
                                <span className="flow-container-heading">Step-by-Step Action Plan & Filing Roadmap</span>
                              </div>

                              {/* Step-by-step Action Plan */}
                              <div className="flow-sub-block">
                                <div className="flow-sub-heading">
                                  <Clock size={14} />
                                  <span>Step-by-Step Action Plan:</span>
                                </div>
                                <div className="flow-timeline-items">
                                  {(msg.selfHelp?.actionPlan || [
                                    { step: 1, title: 'Preserve Written Evidence & Timeline', desc: 'Compile chronological logs of all receipts, bank memos, agreements, contracts, and digital correspondence.' },
                                    { step: 2, title: 'Draft and Issue Statutory Demand Notice', desc: 'Send formal legal notice specifying statutory cure period via Registered Post AD or Speed Post.' },
                                    { step: 3, title: 'Monitor Statutory Notice Period', desc: 'Track receipt of postal delivery confirmation. If unfulfilled upon deadline, cause of action crystallizes.' },
                                    { step: 4, title: 'Self-Representation Filing Online', desc: 'Submit petition directly on national grievance or dispute portals without mandatory advocate fee (e-Daakhil, Cybercrime, RERA).' },
                                    { step: 5, title: 'Track Case & Receive Relief', desc: 'Monitor hearing dates online, submit certified documents, and obtain legally enforceable refund or award.' }
                                  ]).map((stepItem, sIdx) => (
                                    <div key={sIdx} className="timeline-node">
                                      <div className="timeline-node-number">{stepItem.step || sIdx + 1}</div>
                                      <div className="timeline-node-content">
                                        <strong>{stepItem.title}</strong>
                                        <p>{stepItem.desc || stepItem.description}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Required Documents Checklist */}
                              <div className="flow-sub-block">
                                <div className="flow-sub-heading">
                                  <FileText size={14} />
                                  <span>Required Documents Checklist:</span>
                                </div>
                                <div className="docs-checklist-grid">
                                  {(msg.selfHelp?.requiredDocuments || [
                                    'Government Photo ID (Aadhaar / PAN Card / Voter ID)',
                                    'Primary Contract / Agreement / Cheque / Purchase Invoice',
                                    'Bank Statement & Transaction Proofs / UTR Number',
                                    'Written Communications (Email threads, WhatsApp export, SMS)',
                                    'Postal Tracking Receipt & Speed Post Delivery Confirmation Report'
                                  ]).map((doc, dIdx) => (
                                    <div key={dIdx} className="doc-item-pill">
                                      <CheckCircle2 size={13} className="doc-check-icon" />
                                      <span>{doc}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Official Filing Portals */}
                              <div className="flow-sub-block">
                                <div className="flow-sub-heading">
                                  <ExternalLink size={14} />
                                  <span>Filing / Submission Process (Official National Portals):</span>
                                </div>
                                <div className="official-portals-grid">
                                  <a href="https://edaakhil.nic.in" target="_blank" rel="noreferrer" className="official-portal-link">
                                    <strong>e-Daakhil Consumer Portal</strong>
                                    <span>File consumer complaints online directly with District & State Commissions</span>
                                    <span className="portal-action-text">Visit edaakhil.nic.in <ExternalLink size={11} /></span>
                                  </a>
                                  <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="official-portal-link">
                                    <strong>National Cyber Crime Portal</strong>
                                    <span>Financial fraud helpline (1930) and cyber complaint lodging</span>
                                    <span className="portal-action-text">Visit cybercrime.gov.in <ExternalLink size={11} /></span>
                                  </a>
                                  <a href="https://nalsa.gov.in" target="_blank" rel="noreferrer" className="official-portal-link">
                                    <strong>Legal Services Authority (NALSA / DLSA)</strong>
                                    <span>Free legal aid & pre-litigation Lok Adalat mediation</span>
                                    <span className="portal-action-text">Visit nalsa.gov.in <ExternalLink size={11} /></span>
                                  </a>
                                </div>
                              </div>

                              {/* Action Plan Export & Interactive View */}
                              <div className="flow-actions-row">
                                <Link to={`/cases/${activeCaseId || 'case-101'}/action-plan`} className="flow-btn-primary">
                                  <FileText size={14} />
                                  <span>Open Interactive Action Plan</span>
                                </Link>
                                <button
                                  type="button"
                                  className="flow-btn-secondary"
                                  onClick={() => {
                                    const content = `VIDHISETU LEGAL GUIDANCE - SELF-HELP ACTION PLAN\nIssue: ${activeCase?.title || 'Legal Inquiry'}\nDate: ${new Date().toLocaleDateString()}\n\n1. STATUTORY LAWS:\n${(msg.detectedLaws || []).map(l => `- ${l.act || l.name}: ${l.plainMeaning || l.explanation || ''}`).join('\n')}\n\n2. RIGHTS & REMEDIES:\n${(msg.possibleRights || []).map(r => `- ${r.title || r.right}: ${r.description || ''}`).join('\n')}\n\n3. ACTION PLAN:\n${(msg.suggestedNextSteps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nGenerated by VidhiSetu Legal AI Platform.`;
                                    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `VidhiSetu_Self_Help_Plan_${Date.now()}.txt`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                >
                                  <Download size={14} />
                                  <span>Export Action Plan</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 6B. Lawyer Consultation Flow */}
                          {selectedPaths[msg.id] === 'lawyer' && (
                            <div className="flowchart-flow-container lawyer-flow-container animate-fade-in">
                              <div className="flow-container-title-bar">
                                <span className="flow-container-badge blue-badge">6B. Lawyer Consultation Flow</span>
                                <span className="flow-container-heading">Verified Legal Counsel Matching</span>
                              </div>
                              <p className="lawyer-match-desc">
                                Top verified advocates matching <strong>{msg.category || activeCase?.category || 'your legal issue'}</strong>:
                              </p>

                              <div className="lawyers-recommendation-grid">
                                {getRecommendedLawyers(msg.category || activeCase?.category).map((advocate) => (
                                  <div key={advocate.id} className="rec-lawyer-card">
                                    <div className="rec-lawyer-top">
                                      <img src={advocate.photoUrl} alt={advocate.name} className="rec-lawyer-avatar" />
                                      <div className="rec-lawyer-meta">
                                        <strong className="rec-lawyer-name">{advocate.name}</strong>
                                        <span className="rec-lawyer-bar">{advocate.barCouncilId} • {advocate.experienceYears}+ Yrs Exp</span>
                                        <span className="rec-lawyer-court">{advocate.court}</span>
                                        <span className="rec-lawyer-stars">⭐ {advocate.rating} ({advocate.reviewCount} reviews)</span>
                                      </div>
                                    </div>

                                    <div className="rec-lawyer-areas">
                                      {advocate.practiceAreas.slice(0, 3).map((area, aIdx) => (
                                        <span key={aIdx} className="rec-area-chip">{area}</span>
                                      ))}
                                    </div>

                                    <p className="rec-lawyer-snippet">{advocate.bio}</p>

                                    <div className="rec-lawyer-channels-row">
                                      <span className="channel-pill"><MessageSquare size={11} /> Chat</span>
                                      <span className="channel-pill"><Phone size={11} /> Voice Call</span>
                                      <span className="channel-pill"><Video size={11} /> Video Call</span>
                                    </div>

                                    <div className="rec-lawyer-bottom">
                                      <div className="fee-info">
                                        <span className="fee-title">Consultation Fee</span>
                                        <strong className="fee-val">₹{advocate.consultationFee}</strong>
                                      </div>
                                      <Link to={`/lawyers/${advocate.id}`} className="request-consult-btn">
                                        Request Consultation →
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="lawyer-flow-more-row">
                                <Link to={`/cases/${activeCaseId || 'case-101'}/lawyers`} className="view-all-advocates-link">
                                  <Users size={14} />
                                  <span>View All Verified Advocates on VidhiSetu Network →</span>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Message Action Toolbar (Copy, Regenerate, Feedback) */}
                      {msg.sender === 'ai' && (
                        <div className="message-action-toolbar">
                          <button
                            type="button"
                            className="msg-action-btn"
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            title="Copy response"
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check size={13} className="text-success" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {isLastAiMessage && !isStreaming && !isAiThinking && (
                            <button
                              type="button"
                              className="msg-action-btn"
                              onClick={handleRegenerate}
                              title="Regenerate this response"
                            >
                              <RotateCw size={13} />
                              <span>Regenerate</span>
                            </button>
                          )}

                          <div className="msg-feedback-group">
                            <button
                              type="button"
                              className={`msg-action-btn icon-only ${feedbackGiven[msg.id] === 'up' ? 'active-thumb' : ''}`}
                              onClick={() => handleFeedback(msg.id, 'up')}
                              title="Helpful response"
                            >
                              <ThumbsUp size={13} />
                            </button>
                            <button
                              type="button"
                              className={`msg-action-btn icon-only ${feedbackGiven[msg.id] === 'down' ? 'active-thumb' : ''}`}
                              onClick={() => handleFeedback(msg.id, 'down')}
                              title="Not helpful"
                            >
                              <ThumbsDown size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Streaming Active Response */}
              {isStreaming && (
                <div className="chat-message-row message-from-ai streaming-row">
                  <div className="message-avatar">
                    <div className="ai-avatar-badge thinking-glow">
                      <Scale size={16} />
                    </div>
                  </div>
                  <div className="message-bubble">
                    <div className="message-header-meta">
                      <span className="message-sender-name">VidhiSetu AI</span>
                      <span className="streaming-status-tag">Generating response…</span>
                    </div>

                    <div className="message-text">
                      <MarkdownMessage content={streamingText} isStreaming={true} />
                    </div>

                    {/* Show preliminary statutes if received */}
                    {streamingMeta?.detectedLaws && streamingMeta.detectedLaws.length > 0 && (
                      <div className="chat-sources-block animate-fade-in">
                        <div className="sources-heading">
                          <BookOpen size={15} />
                          <span>Identified Indian Statutes:</span>
                        </div>
                        <div className="sources-cards-list">
                          {streamingMeta.detectedLaws.slice(0, 2).map((law, idx) => (
                            <div key={idx} className="source-card">
                              <strong>{law.act || law.act_name || law.name}</strong>
=======
              {currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message-row message-from-${msg.sender}`}
                >
                  <div className="message-avatar">
                    {msg.sender === 'ai' ? (
                      <div className="ai-avatar-badge">
                        <Scale size={16} />
                      </div>
                    ) : (
                      <div className="user-avatar-badge">
                        <User size={16} />
                      </div>
                    )}
                  </div>

                  <div className="message-bubble">
                    <div className="message-header-meta">
                      <span className="message-sender-name">
                        {msg.sender === 'ai' ? 'VidhiSetu AI' : 'You'}
                      </span>
                      <span className="message-time">{msg.timestamp}</span>
                    </div>

                    {/* Body text with formatted paragraphs */}
                    <div className="message-text">
                      {msg.text.split('\n\n').map((para, i) => (
                        <p
                          key={i}
                          dangerouslySetInnerHTML={{
                            __html: para
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>'),
                          }}
                        />
                      ))}
                    </div>

                    {/* Attached file chips */}
                    {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                      <div className="message-attachments">
                        <span className="attachments-title">Attached Proofs:</span>
                        {msg.attachedFiles.map((file, idx) => (
                          <span key={idx} className="attachment-chip">
                            <FileText size={14} /> {file.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Relevant Statutory Laws */}
                    {msg.detectedLaws && msg.detectedLaws.length > 0 && (
                      <div className="chat-sources-block">
                        <div className="sources-heading">
                          <BookOpen size={16} />
                          <span>Relevant Indian Statutes:</span>
                        </div>
                        <div className="sources-cards-list">
                          {msg.detectedLaws.map((law, idx) => (
                            <div key={idx} className="source-card">
                              <strong>
                                {law.act || law.act_name} {law.section ? `– ${law.section}` : ''}
                              </strong>
                              {law.plainMeaning && <p>{law.plainMeaning}</p>}
>>>>>>> origin/main
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
<<<<<<< HEAD
                  </div>
                </div>
              )}

              {/* AI Thinking Animation (Initial phase before tokens arrive) */}
=======

                    {/* Cited Judicial Precedents (Indian Kanoon) */}
                    {msg.detectedPrecedents && msg.detectedPrecedents.length > 0 && (
                      <div className="chat-sources-block precedents-block">
                        <div className="sources-heading">
                          <Scale size={16} />
                          <span>Retrieved Legal Precedents (Indian Kanoon):</span>
                        </div>
                        <div className="sources-cards-list">
                          {msg.detectedPrecedents.map((judg, idx) => (
                            <div key={idx} className="source-card precedent-source-card">
                              <div className="precedent-card-top">
                                <strong>
                                  {judg.title} {judg.year ? `(${judg.year})` : ''}
                                </strong>
                                {judg.court && (
                                  <span className="citation-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                                    {judg.court}
                                  </span>
                                )}
                                {judg.citation && (
                                  <span className="citation-badge">{judg.citation}</span>
                                )}
                              </div>
                              {judg.keyExtract && (
                                <blockquote
                                  style={{
                                    fontSize: '0.82rem',
                                    color: '#334155',
                                    background: '#f8fafc',
                                    borderLeft: '3px solid #3b82f6',
                                    padding: '6px 10px',
                                    margin: '6px 0',
                                    borderRadius: '0 4px 4px 0',
                                  }}
                                >
                                  <strong>Relevant Case Extract:</strong> "{judg.keyExtract.length > 250 ? judg.keyExtract.slice(0, 250) + '...' : judg.keyExtract}"
                                </blockquote>
                              )}
                              {judg.keyTakeaway && !judg.keyExtract && (
                                <p className="takeaway-text">💡 {judg.keyTakeaway}</p>
                              )}
                              <div className="precedent-links-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                                <Link
                                  to={`/judgments/${judg.caseId || judg.id || '109283'}`}
                                  className="precedent-kanoon-link"
                                  style={{ fontWeight: 600, color: '#2563eb' }}
                                >
                                  View Full Court Judgment →
                                </Link>
                                {judg.sourceUrl && (
                                  <a
                                    href={judg.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="precedent-kanoon-link"
                                    style={{ color: '#64748b' }}
                                  >
                                    Indian Kanoon Source ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Information / Follow-up Questions */}
                    {msg.missingInformation && msg.missingInformation.length > 0 && (
                      <div className="missing-info-card">
                        <div className="missing-info-header">
                          <HelpCircle size={15} />
                          <span>Important Questions to Clarify:</span>
                        </div>
                        <ul className="missing-info-list">
                          {msg.missingInformation.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggested Next Steps */}
                    {msg.suggestedNextSteps && msg.suggestedNextSteps.length > 0 && (
                      <div className="suggested-actions-box">
                        <span className="suggested-actions-title">
                          <CheckCircle2 size={15} /> Recommended Next Steps:
                        </span>
                        <ul className="suggested-actions-list">
                          {msg.suggestedNextSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                        <div className="action-box-footer">
                          <Link
                            to={`/cases/${activeCaseId || 'case-101'}/action-plan`}
                            className="action-link-btn"
                          >
                            <span>Open Step-by-Step Action Plan</span>
                            <ArrowRight size={14} />
                          </Link>
                          <Link
                            to={`/cases/${activeCaseId || 'case-101'}/lawyers`}
                            className="action-link-btn btn-secondary"
                          >
                            <Users size={14} />
                            <span>Find Recommended Advocates</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* AI Thinking Animation */}
>>>>>>> origin/main
              {isAiThinking && (
                <div className="chat-message-row message-from-ai">
                  <div className="message-avatar">
                    <div className="ai-avatar-badge thinking-glow">
                      <Scale size={16} />
                    </div>
                  </div>
                  <div className="message-bubble thinking-bubble">
                    <span className="ai-thinking-text">
                      VidhiSetu AI is analyzing Indian statutes & court precedents…
                    </span>
                    <div className="thinking-dots">
                      <span className="dot dot-1" />
                      <span className="dot dot-2" />
                      <span className="dot dot-3" />
                    </div>
                  </div>
                </div>
              )}

<<<<<<< HEAD
              {/* Bottom anchor for scrolling */}
              <div ref={messagesEndRef} className="scroll-sentinel" />
=======
              <div ref={messagesEndRef} />
>>>>>>> origin/main
            </div>
          )}
        </div>
      </div>

<<<<<<< HEAD
      {/* 3. Floating Jump to Bottom Button */}
      {showScrollBottomBtn && (
        <button
          type="button"
          className="jump-to-bottom-btn animate-fade-in"
          onClick={() => scrollToBottom('smooth')}
          title="Scroll to latest messages"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={16} />
          <span>New Messages</span>
        </button>
      )}

      {/* 4. Docked Composer Box (Always Grounded at Bottom) */}
      <footer className="chat-bottom-dock">
        <div className="chat-dock-inner">
          {/* File Attachment Tray */}
=======
      {/* 6. Message Input Box Fixed at Bottom (ChatGPT style) */}
      <div className="chat-bottom-dock">
        <div className="chat-dock-inner">
>>>>>>> origin/main
          {attachedFiles.length > 0 && (
            <div className="chat-attached-tray">
              {attachedFiles.map((f, i) => (
                <span key={i} className="tray-chip">
                  <FileText size={14} /> {f.name}
<<<<<<< HEAD
                  <button
                    type="button"
                    className="tray-chip-remove"
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    title="Remove file"
                  >
                    ×
                  </button>
=======
>>>>>>> origin/main
                </span>
              ))}
            </div>
          )}

<<<<<<< HEAD
          {/* Voice Input Listening State Indicator */}
          {isListening && (
            <div className="voice-listening-banner animate-fade-in">
              <span className="listening-pulse-dot" />
              <span>🎤 Listening... Speak your legal problem clearly in English or Hindi. Click mic button to finish.</span>
            </div>
          )}

          {/* Composer Input Box */}
=======
>>>>>>> origin/main
          <div className="chat-composer-box">
            <button
              type="button"
              className="composer-attach-btn"
              onClick={() => setShowAttachModal(true)}
<<<<<<< HEAD
              title="Attach Agreements, Invoices, Dishonour Memos, or Notice Copies"
=======
              title="Attach Agreements, Receipts, or Bounced Cheques"
>>>>>>> origin/main
              aria-label="Attach Documents"
            >
              <Paperclip size={18} />
            </button>

<<<<<<< HEAD
            {/* Flowchart Step 2: Voice Input Button */}
            <button
              type="button"
              className={`composer-mic-btn ${isListening ? 'mic-active' : ''}`}
              onClick={toggleVoiceInput}
              title={isListening ? 'Listening... click to stop recording' : 'Voice Input (Optional: speak your legal inquiry)'}
              aria-label="Voice Input"
            >
              {isListening ? <MicOff size={18} className="mic-listening-pulse" /> : <Mic size={18} />}
            </button>

            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder={
                isAiThinking || isStreaming
                  ? 'VidhiSetu AI is analyzing Indian statutes & precedents…'
                  : 'Ask VidhiSetu about your legal rights, notice procedure, or dispute…'
              }
=======
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder="Ask VidhiSetu about your legal issue, rights, notice period, or dispute…"
>>>>>>> origin/main
              value={inputText}
              rows={1}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
<<<<<<< HEAD
              disabled={isAiThinking || isStreaming}
              id="chat-composer-textarea"
            />

            {/* Send / Stop Generation Toggle Button */}
            {isStreaming || isAiThinking ? (
              <button
                type="button"
                className="composer-stop-btn"
                onClick={handleStopGeneration}
                title="Stop generating"
                aria-label="Stop generating"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                className={`composer-send-btn ${
                  inputText.trim() || attachedFiles.length > 0 ? 'send-btn-active' : ''
                }`}
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() && attachedFiles.length === 0}
                title="Send message (Enter)"
                aria-label="Send message"
              >
                <ArrowUp size={18} />
              </button>
            )}
          </div>

          {/* Legal Footnote Disclaimer */}
          <div className="chat-legal-footnote">
            <span>
              VidhiSetu provides informational guidance based on Indian statutory law and judicial precedents. It does not replace professional legal representation.
            </span>
          </div>
        </div>
      </footer>
=======
            />

            <button
              type="button"
              className={`composer-send-btn ${inputText.trim() || attachedFiles.length > 0 ? 'send-btn-active' : ''}`}
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() && attachedFiles.length === 0}
              title="Send message (Enter)"
              aria-label="Send message"
            >
              <ArrowUp size={18} />
            </button>
          </div>

          <div className="chat-legal-footnote">
            <span>
              VidhiSetu provides informational legal guidance based on Indian law and judicial records. It does not replace professional legal representation.
            </span>
          </div>
        </div>
      </div>
>>>>>>> origin/main

      {/* Document Attachment Modal */}
      {showAttachModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAttachModal(false)}>
          <div className="attach-modal-card-wrapper" onClick={(e) => e.stopPropagation()}>
            <Card className="attach-modal-card">
              <h3 className="card-title">Attach Supporting Evidence</h3>
              <p className="card-subtitle">
<<<<<<< HEAD
                Upload rental agreements, cheques, invoices, or written correspondence to assist VidhiSetu.
=======
                Upload invoices, agreements, emails, or bank dishonour memos to help VidhiSetu assess your case.
>>>>>>> origin/main
              </p>
              <div style={{ marginTop: '16px' }}>
                <FileUpload
                  multiple
                  onFilesSelected={(files) => setAttachedFiles(files)}
                />
              </div>
              <div className="attach-modal-footer">
                <Button variant="outline" onClick={() => setShowAttachModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setShowAttachModal(false)}>
<<<<<<< HEAD
                  Done ({attachedFiles.length} files)
=======
                  Attach ({attachedFiles.length} files)
>>>>>>> origin/main
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
<<<<<<< HEAD

export default AIChatPage;
=======
>>>>>>> origin/main
