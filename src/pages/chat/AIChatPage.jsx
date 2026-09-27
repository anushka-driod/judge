import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCases } from '../../context/CaseContext';
import { aiLegalService } from '../../services/aiLegalService';
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
} from 'lucide-react';
import './AIChatPage.css';

export function AIChatPage() {
  const {
    activeCaseId,
    activeCase,
    createChatCase,
    addMessageToCase,
    startFreshChat,
  } = useCases();

  const navigate = useNavigate();

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

  // Autofocus input when starting a fresh case conversation
  useEffect(() => {
    if (!activeCaseId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeCaseId]);

  // Adjust textarea height dynamically
  const handleTextChange = (e) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleSendMessage = async (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed && attachedFiles.length === 0) return;

    const userMessage = {
      id: `usr-msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      attachedFiles: [...attachedFiles],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let targetCaseId = activeCaseId;

    // 7. New Case Flow: If no active case, create one automatically from first message
    if (!targetCaseId) {
      const createdCase = createChatCase(trimmed);
      targetCaseId = createdCase.id;
    } else {
      addMessageToCase(targetCaseId, userMessage);
    }

    setInputText('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
  };

  const handleStarterClick = (starterText) => {
    handleSendMessage(starterText);
  };

  const starterCards = [
    {
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
      icon: '📦',
      title: 'Defective Product & Refund',
      desc: 'E-commerce platform refused return for damaged goods',
      prompt: 'I purchased an electronic appliance online that arrived damaged and defective, but the seller refused refund citing their 7-day return policy.',
    },
    {
      icon: '🏠',
      title: 'Builder Possession Delay',
      desc: 'RERA delayed handover compensation or full refund',
      prompt: 'My builder delayed flat possession by over 14 months beyond the date promised in the Agreement for Sale. Can I claim full refund under RERA?',
    },
  ];

  return (
    <div className="vidhisetu-chat-layout animate-fade-in">
      {/* Scrollable Conversation Stream */}
      <div className="chat-scroll-area">
        <div className="chat-inner-column">
          {/* Empty State / New Case Screen */}
          {currentMessages.length === 0 ? (
            <div className="chat-empty-hero animate-fade-in">
              <div className="hero-badge-container">
                <div className="hero-logo-badge">
                  <Scale size={32} />
                </div>
              </div>
              <h1 className="hero-title">VidhiSetu AI</h1>
              <p className="hero-subtitle">
                How can I help with your legal situation today?
              </p>
              <p className="hero-explanation">
                Describe your dispute in everyday words. VidhiSetu researches relevant Indian statutes,
                court precedents, and guides you on self-help or advocate consultation.
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
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* 6. Message Input Box Fixed at Bottom (ChatGPT style) */}
      <div className="chat-bottom-dock">
        <div className="chat-dock-inner">
          {attachedFiles.length > 0 && (
            <div className="chat-attached-tray">
              {attachedFiles.map((f, i) => (
                <span key={i} className="tray-chip">
                  <FileText size={14} /> {f.name}
                </span>
              ))}
            </div>
          )}

          <div className="chat-composer-box">
            <button
              type="button"
              className="composer-attach-btn"
              onClick={() => setShowAttachModal(true)}
              title="Attach Agreements, Receipts, or Bounced Cheques"
              aria-label="Attach Documents"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder="Ask VidhiSetu about your legal issue, rights, notice period, or dispute…"
              value={inputText}
              rows={1}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
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

      {/* Document Attachment Modal */}
      {showAttachModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAttachModal(false)}>
          <div className="attach-modal-card-wrapper" onClick={(e) => e.stopPropagation()}>
            <Card className="attach-modal-card">
              <h3 className="card-title">Attach Supporting Evidence</h3>
              <p className="card-subtitle">
                Upload invoices, agreements, emails, or bank dishonour memos to help VidhiSetu assess your case.
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
                  Attach ({attachedFiles.length} files)
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
