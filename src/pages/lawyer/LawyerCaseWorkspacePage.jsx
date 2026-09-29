import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  Briefcase,
  User,
  FileText,
  Sparkles,
  MessageSquare,
  Phone,
  Video,
  ListOrdered,
  Clock,
  StickyNote,
  ShieldCheck,
  ExternalLink,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Scale,
  RefreshCw,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerCaseWorkspacePage() {
  const { caseId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // AI Research State
  const [aiResearch, setAiResearch] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Action Plan State
  const [actionItems, setActionItems] = useState([]);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionPriority, setNewActionPriority] = useState('high');
  const [newActionDue, setNewActionDue] = useState('');

  // Notes State
  const [notes, setNotes] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState('LAWYER_PRIVATE'); // LAWYER_PRIVATE vs CLIENT_VISIBLE

  // Timeline State
  const [timeline, setTimeline] = useState([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');

  // Active Call Room State
  const [callActive, setCallActive] = useState(false);
  const [callSession, setCallSession] = useState(null);
  const [callType, setCallType] = useState('video');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const fetchWorkspace = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await lawyerPortalClient.getCaseById(caseId);
      setWorkspace(data);
      setActionItems(data.actionPlan || []);
      setTimeline(data.timeline || []);
      setNotes(data.notes || []);

      // Load messages
      const msgs = await lawyerPortalClient.getMessages(caseId);
      setMessages(msgs || []);
    } catch (err) {
      setError(err.message || 'Failed to load case workspace. Please verify access authorization.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [caseId]);

  // Load AI Research when AI tab is clicked
  const handleLoadAiResearch = async () => {
    setLoadingAi(true);
    try {
      const data = await lawyerPortalClient.getCaseAiResearch(caseId);
      setAiResearch(data);
    } catch (err) {
      console.warn('AI Research fetch notice:', err.message);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai' && !aiResearch) {
      handleLoadAiResearch();
    }
  }, [activeTab]);

  // Timer for active call
  useEffect(() => {
    let interval = null;
    if (callActive) {
      interval = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(interval);
  }, [callActive]);

  // Chat send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSendingMsg(true);
    try {
      const sent = await lawyerPortalClient.sendMessage(caseId, {
        text: newMessage,
      });
      setMessages((prev) => [...prev, sent.message || sent]);
      setNewMessage('');
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  // Add Action Item
  const handleAddAction = async (e) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;
    try {
      const item = await lawyerPortalClient.addActionItem(caseId, {
        title: newActionTitle,
        priority: newActionPriority,
        dueDate: newActionDue,
      });
      setActionItems((prev) => [...prev, item.item || item]);
      setNewActionTitle('');
      setNewActionDue('');
    } catch (err) {
      alert('Failed to add action: ' + err.message);
    }
  };

  // Toggle Action Status
  const handleToggleActionStatus = async (actionId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    try {
      const updated = await lawyerPortalClient.updateActionItem(caseId, actionId, {
        status: nextStatus,
      });
      setActionItems((prev) =>
        prev.map((a) => (a.id === actionId ? { ...a, status: nextStatus } : a))
      );
    } catch (err) {
      alert('Failed to update action status: ' + err.message);
    }
  };

  // Add Note (Private vs Client-Visible)
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    try {
      const created = await lawyerPortalClient.addNote(caseId, {
        type: newNoteType,
        content: newNoteContent,
      });
      setNotes((prev) => [...prev, created.note || created]);
      setNewNoteContent('');
    } catch (err) {
      alert('Failed to save note: ' + err.message);
    }
  };

  // Add Timeline Event
  const handleAddTimelineEvent = async (e) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    try {
      const created = await lawyerPortalClient.addTimelineEvent(caseId, {
        event: newEventTitle,
        description: newEventDesc,
      });
      setTimeline((prev) => [...prev, created.timelineEvent || created]);
      setNewEventTitle('');
      setNewEventDesc('');
    } catch (err) {
      alert('Failed to add timeline event: ' + err.message);
    }
  };

  // Start Call
  const handleStartCall = async (type) => {
    setCallType(type);
    try {
      const res = await lawyerPortalClient.initiateCall(caseId, type);
      setCallSession(res.session);
      setCallActive(true);
    } catch (err) {
      alert('Failed to initiate consultation call: ' + err.message);
    }
  };

  // End Call
  const handleEndCall = async () => {
    if (!callSession) {
      setCallActive(false);
      return;
    }
    const notesSummary = window.prompt('Add summary notes for this completed consultation session:');
    try {
      await lawyerPortalClient.endCall(callSession.id, {
        durationSeconds: callSeconds,
        summaryNotes: notesSummary || 'Consultation concluded.',
      });
    } catch (err) {
      console.warn('Call conclusion notice:', err.message);
    }
    setCallActive(false);
    setCallSession(null);
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: '#d4af37', margin: '0 auto 12px' }} />
        <p>Loading Authorized Case Workspace...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="lp-card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ color: '#fff' }}>Unauthorized or Case Not Found</h3>
        <p style={{ color: '#94a3b8', margin: '8px 0 20px' }}>{error}</p>
        <Link to="/lawyer/cases" className="lp-btn-action lp-btn-primary">
          ← Return to Authorized Cases
        </Link>
      </div>
    );
  }

  const { case: caseData, client, consultation, consent, sharedDocuments } = workspace;

  return (
    <div className="animate-fade-in">
      {/* Workspace Header Strip */}
      <div
        className="lp-card"
        style={{
          background: 'linear-gradient(135deg, #101626 0%, #151d30 100%)',
          marginBottom: '20px',
          padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="lp-badge lp-badge-lawyer">{caseData.category}</span>
              <span className="lp-badge lp-badge-verified">
                <ShieldCheck size={12} /> {consent.status.toUpperCase()} CONSENT
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Case ID: {caseData.id}</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
              {caseData.title}
            </h2>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              Client: <strong style={{ color: '#fff' }}>{client.name}</strong> • Jurisdiction:{' '}
              <strong style={{ color: '#cbd5e1' }}>{caseData.jurisdiction}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleStartCall('voice')}
              className="lp-btn-action"
              style={{ padding: '8px 14px' }}
            >
              <Phone size={16} color="#34d399" />
              <span>Voice Call</span>
            </button>
            <button
              type="button"
              onClick={() => handleStartCall('video')}
              className="lp-btn-action lp-btn-primary"
              style={{ padding: '8px 16px' }}
            >
              <Video size={16} />
              <span>Start Video Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive WebRTC / Voice Call Modal Banner if Active */}
      {callActive && (
        <div className="lp-card lp-call-room animate-fade-in" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s infinite' }} />
              <strong style={{ color: '#fff' }}>Live {callType.toUpperCase()} Consultation</strong>
              <span style={{ color: '#d4af37', fontFamily: 'monospace', fontWeight: 700, marginLeft: '12px' }}>
                {formatTimer(callSeconds)}
              </span>
            </div>
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              Vidhi Setu Encrypted Chambers Room
            </span>
          </div>

          {callType === 'video' ? (
            <div className="lp-call-video-grid">
              <div className="lp-video-tile">
                <img
                  src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=600"
                  alt="Counsel"
                />
                <div className="lp-video-label">Adv. Rajeshwar Rao (You)</div>
              </div>
              <div className="lp-video-tile" style={{ backgroundColor: '#1e293b' }}>
                {isCameraOff ? (
                  <div style={{ color: '#64748b', textAlign: 'center' }}>
                    <VideoOff size={40} style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: 0 }}>Client Camera Paused</p>
                  </div>
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600"
                    alt="Client"
                  />
                )}
                <div className="lp-video-label">{client.name} (Client)</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Phone size={36} color="#34d399" />
              </div>
              <h3 style={{ margin: 0 }}>Encrypted Voice Session with {client.name}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Audio stream active • No default recordings</p>
            </div>
          )}

          {/* Call Controls */}
          <div className="lp-call-controls">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="lp-call-btn"
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff size={20} color="#f87171" /> : <Mic size={20} />}
            </button>

            {callType === 'video' && (
              <button
                type="button"
                onClick={() => setIsCameraOff(!isCameraOff)}
                className="lp-call-btn"
                title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isCameraOff ? <VideoOff size={20} color="#f87171" /> : <Video size={20} />}
              </button>
            )}

            <button
              type="button"
              onClick={handleEndCall}
              className="lp-call-btn lp-call-btn-danger"
              title="Conclude Consultation"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="lp-tabs-bar">
        {[
          { id: 'overview', label: 'Overview', icon: Briefcase },
          { id: 'client', label: 'Client Details', icon: User },
          { id: 'documents', label: `Documents (${sharedDocuments.length})`, icon: FileText },
          { id: 'ai', label: 'AI Legal Research', icon: Sparkles },
          { id: 'messages', label: `Messages (${messages.length})`, icon: MessageSquare },
          { id: 'action_plan', label: `Action Plan (${actionItems.length})`, icon: ListOrdered },
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'notes', label: `Case Notes (${notes.length})`, icon: StickyNote },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`lp-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div>
            {/* IMMUTABLE ORIGINAL PROBLEM ANCHOR */}
            <div className="lp-card">
              <div className="lp-card-header">
                <h3 className="lp-card-title">
                  <Scale size={18} color="#d4af37" />
                  <span>Original Legal Problem Anchor</span>
                </h3>
                <span className="lp-badge lp-badge-lawyer">IMMUTABLE USER NARRATIVE</span>
              </div>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#101626',
                  border: '1px solid #22304d',
                  borderRadius: '8px',
                  lineHeight: 1.6,
                  color: '#e2e8f0',
                  fontSize: '0.9375rem',
                }}
              >
                {caseData.originalProblem}
              </div>
              <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Note: As per Section 11 of the Vidhi Setu Architecture, the user's original statement remains anchored to prevent case fragmentation.
              </p>
            </div>

            {/* Quick Action Plan Summary */}
            <div className="lp-card">
              <div className="lp-card-header">
                <h3 className="lp-card-title">
                  <ListOrdered size={18} color="#3b82f6" />
                  <span>Immediate Action Steps</span>
                </h3>
                <span className="lp-badge lp-badge-lawyer">LAWYER-PROVIDED ACTION PLAN</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {actionItems.slice(0, 3).map((act) => (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#101626',
                      borderRadius: '8px',
                      border: '1px solid #22304d',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', color: act.status === 'completed' ? '#94a3b8' : '#fff', textDecoration: act.status === 'completed' ? 'line-through' : 'none' }}>
                      {act.title}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: act.priority === 'high' ? '#f87171' : '#fbbf24', fontWeight: 600 }}>
                      {act.priority.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            {/* Consultation Details */}
            <div className="lp-card">
              <div className="lp-card-header">
                <h3 className="lp-card-title">
                  <Clock size={18} color="#10b981" />
                  <span>Consultation Docket</span>
                </h3>
                <span className="lp-badge lp-badge-verified">CONFIRMED</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Mode:</span>
                  <strong style={{ color: '#fff' }}>{consultation.type.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Date & Time:</span>
                  <strong style={{ color: '#fff' }}>{consultation.scheduledDate} at {consultation.scheduledTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Fee:</span>
                  <strong style={{ color: '#34d399' }}>₹{consultation.feeAmount} (Verified)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Payment Status:</span>
                  <span className="lp-badge lp-badge-verified">{consultation.paymentStatus}</span>
                </div>
              </div>
            </div>

            {/* Client Consent Box */}
            <div className="lp-card">
              <div className="lp-card-header">
                <h3 className="lp-card-title">
                  <ShieldCheck size={18} color="#34d399" />
                  <span>Client Consent Scope</span>
                </h3>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '0.8125rem', color: '#cbd5e1' }}>
                Client explicitly granted access on {consent.consentedAt ? new Date(consent.consentedAt).toLocaleDateString() : 'Active session'}.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span className="lp-badge lp-badge-verified">✓ Case Summary</span>
                <span className="lp-badge lp-badge-verified">✓ Explicit Documents ({sharedDocuments.length})</span>
                <span className="lp-badge lp-badge-verified">✓ Secure Chat</span>
                <span className="lp-badge lp-badge-verified">✓ Action Roadmap</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLIENT DETAILS */}
      {activeTab === 'client' && (
        <div className="lp-card" style={{ maxWidth: '800px' }}>
          <h3 className="lp-card-title" style={{ marginBottom: '20px' }}>
            <User size={20} color="#60a5fa" />
            <span>Authorized Client Information</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Full Name:</span>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>{client.name}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Client ID:</span>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{client.id}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Verified Email:</span>
              <div style={{ fontSize: '0.9375rem', color: '#fff' }}>{client.email}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Phone Number:</span>
              <div style={{ fontSize: '0.9375rem', color: '#fff' }}>{client.phone}</div>
            </div>
          </div>

          {client.notes && (
            <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #22304d' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Client Submission Remarks:</span>
              <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '0.9375rem' }}>"{client.notes}"</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="lp-card">
          <div className="lp-card-header">
            <h3 className="lp-card-title">
              <FileText size={20} color="#60a5fa" />
              <span>Explicitly Authorized Case Documents</span>
            </h3>
            <span className="lp-badge lp-badge-verified">
              <ShieldCheck size={13} /> CLIENT CONSENT VERIFIED
            </span>
          </div>

          {sharedDocuments.length === 0 ? (
            <p style={{ color: '#64748b', padding: '30px 0', textAlign: 'center' }}>
              No standalone evidence documents explicitly authorized for this case.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sharedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '16px',
                    background: '#101626',
                    border: '1px solid #22304d',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={22} color="#60a5fa" />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.9375rem', color: '#fff' }}>{doc.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        Type: {doc.type} • Size: {doc.size}
                      </div>
                    </div>
                  </div>

                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Viewing secure authorized document preview: ${doc.name}`);
                    }}
                    className="lp-btn-action"
                    style={{ fontSize: '0.8125rem', padding: '6px 14px' }}
                  >
                    <span>Secure Preview</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI / RAG GROUNDED RESEARCH (INDIAN KANOON + GEMINI) */}
      {activeTab === 'ai' && (
        <div>
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              borderRadius: '8px',
              color: '#7dd3fc',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
              <Sparkles size={16} />
              <span>AI-GENERATED RESEARCH DISCLAIMER</span>
            </div>
            This grounded legal dossier is compiled by the centralized Vidhi Setu AI & Indian Kanoon RAG Engine based on statutory provisions and high court / supreme court precedents. It does not constitute binding legal counsel and must be reviewed and verified by qualified counsel before client advice or litigation.
          </div>

          {loadingAi ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <RefreshCw size={24} className="animate-spin" style={{ color: '#0ea5e9', margin: '0 auto 10px' }} />
              <p>Executing Indian Kanoon Query & Grounded Gemini RAG Synthesis...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* AI Identified Issues & Summary */}
              <div className="lp-card">
                <div className="lp-card-header">
                  <h3 className="lp-card-title">
                    <Sparkles size={18} color="#0ea5e9" />
                    <span>Identified Legal Issues & Statutory Synthesis</span>
                  </h3>
                  <span className="lp-badge lp-badge-ai">AI-GENERATED RESEARCH</span>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                    Key Triable Legal Issues:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#e2e8f0', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    {(aiResearch?.keyIssues || []).map((iss, idx) => (
                      <li key={idx}>{iss}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                    RAG Grounded Assessment:
                  </h4>
                  <div style={{ padding: '14px', background: '#0e1526', borderRadius: '8px', border: '1px solid #22304d', fontSize: '0.875rem', lineHeight: 1.6, color: '#e2e8f0' }}>
                    {aiResearch?.aiSummary}
                  </div>
                </div>
              </div>

              {/* Relevant Statutory Sections */}
              <div className="lp-card">
                <div className="lp-card-header">
                  <h3 className="lp-card-title">
                    <Scale size={18} color="#d4af37" />
                    <span>Applicable Statutory Provisions</span>
                  </h3>
                  <span className="lp-badge lp-badge-ai">AI-GENERATED RESEARCH</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {(aiResearch?.relevantLaws || []).map((law, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        background: '#101626',
                        border: '1px solid #22304d',
                        borderRadius: '8px',
                      }}
                    >
                      <strong style={{ fontSize: '0.9375rem', color: '#fff' }}>{law.title}</strong>
                      <div style={{ fontSize: '0.8125rem', color: '#d4af37', fontWeight: 600, margin: '2px 0 6px' }}>
                        {law.section}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.4 }}>
                        {law.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Traceable Indian Kanoon Court Judgments */}
              <div className="lp-card">
                <div className="lp-card-header">
                  <h3 className="lp-card-title">
                    <Scale size={18} color="#3b82f6" />
                    <span>Traceable Judicial Precedents (Indian Kanoon)</span>
                  </h3>
                  <span className="lp-badge lp-badge-ai">AI-GENERATED RESEARCH</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(aiResearch?.courtJudgments || []).map((prec, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        background: '#101626',
                        border: '1px solid #22304d',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#60a5fa' }}>{prec.title}</strong>
                          <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '2px' }}>
                            {prec.court} • Decided: {prec.date} • Citation: {prec.citation}
                          </div>
                        </div>

                        {prec.url && (
                          <a
                            href={prec.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lp-btn-action"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#38bdf8' }}
                          >
                            <span>Indian Kanoon Source</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>

                      <p style={{ margin: '8px 0 0', fontSize: '0.8125rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                        <strong>Ratio Decidendi:</strong> {prec.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CASE-LINKED REALTIME CHAT */}
      {activeTab === 'messages' && (
        <div className="lp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #22304d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#fff', fontSize: '1rem' }}>Privileged Case Conversation</strong>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Participants: Adv. {caseData.assignedLawyer || 'Rajeshwar Rao'} & {client.name}
              </div>
            </div>
            <span className="lp-badge lp-badge-verified">END-TO-END SECURE</span>
          </div>

          <div
            style={{
              height: '420px',
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: '#090d16',
            }}
          >
            {messages.map((m) => {
              const isLawyer = m.senderRole === 'lawyer';
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isLawyer ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    backgroundColor: isLawyer ? '#1e3a8a' : '#151d30',
                    border: `1px solid ${isLawyer ? '#2563eb' : '#22304d'}`,
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px', fontSize: '0.6875rem', color: isLawyer ? '#bfdbfe' : '#94a3b8' }}>
                    <strong>{m.senderName} ({m.senderRole.toUpperCase()})</strong>
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{m.text}</div>
                  {m.attachments && m.attachments.length > 0 && (
                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      {m.attachments.map((att, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#93c5fd' }}>
                          <FileText size={13} /> {att.name} ({att.size})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid #22304d', display: 'flex', gap: '12px', background: '#101626' }}>
            <input
              type="text"
              placeholder="Type privileged legal message to client..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#090d16',
                border: '1px solid #22304d',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={sendingMsg}
              className="lp-btn-action lp-btn-primary"
              style={{ padding: '0 20px' }}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: ACTION PLAN */}
      {activeTab === 'action_plan' && (
        <div className="lp-card">
          <div className="lp-card-header">
            <div>
              <h3 className="lp-card-title">
                <ListOrdered size={20} color="#d4af37" />
                <span>LAWYER-PROVIDED ACTION PLAN</span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                Statutory legal steps formulated by counsel for client execution and court filing
              </p>
            </div>
            <span className="lp-badge lp-badge-lawyer">LAWYER-AUTHORED</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {actionItems.map((act) => (
              <div
                key={act.id}
                style={{
                  padding: '14px 16px',
                  background: '#101626',
                  border: '1px solid #22304d',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={act.status === 'completed'}
                    onChange={() => handleToggleActionStatus(act.id, act.status)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', color: act.status === 'completed' ? '#94a3b8' : '#fff', textDecoration: act.status === 'completed' ? 'line-through' : 'none' }}>
                      {act.title}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Target Date: {act.dueDate}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: act.priority === 'high' ? '#f87171' : act.priority === 'medium' ? '#fbbf24' : '#60a5fa', fontWeight: 700 }}>
                    {act.priority.toUpperCase()} PRIORITY
                  </span>
                  <span className={`lp-badge lp-badge-${act.status === 'completed' ? 'verified' : 'pending'}`}>
                    {act.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Action Item */}
          <form onSubmit={handleAddAction} style={{ background: '#101626', padding: '16px', borderRadius: '8px', border: '1px solid #22304d' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.875rem', color: '#fff', fontWeight: 600 }}>
              Add Next Action Item
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px' }}>
              <input
                type="text"
                placeholder="Action description (e.g. Serve Speed Post Notice)"
                value={newActionTitle}
                onChange={(e) => setNewActionTitle(e.target.value)}
                style={{ padding: '8px 12px', background: '#090d16', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontSize: '0.875rem' }}
              />
              <select
                value={newActionPriority}
                onChange={(e) => setNewActionPriority(e.target.value)}
                style={{ padding: '8px 12px', background: '#090d16', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontSize: '0.875rem' }}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <input
                type="date"
                value={newActionDue}
                onChange={(e) => setNewActionDue(e.target.value)}
                style={{ padding: '8px 12px', background: '#090d16', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontSize: '0.875rem' }}
              />
              <button type="submit" className="lp-btn-action lp-btn-primary">
                <Plus size={16} /> Add Action
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 7: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="lp-card">
          <div className="lp-card-header">
            <h3 className="lp-card-title">
              <Clock size={20} color="#3b82f6" />
              <span>Chronological Case Progression Timeline</span>
            </h3>
          </div>

          <div style={{ position: 'relative', paddingLeft: '28px', borderLeft: '2px solid #22304d', display: 'flex', flexDirection: 'column', gap: '20px', margin: '20px 0 30px' }}>
            {timeline.map((ev, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-35px', top: '0', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '2px solid #090d16' }} />
                <strong style={{ fontSize: '0.9375rem', color: '#fff' }}>{ev.event}</strong>
                <p style={{ margin: '4px 0', fontSize: '0.8125rem', color: '#94a3b8' }}>{ev.description}</p>
                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  {new Date(ev.timestamp).toLocaleString()} • {ev.actor}
                </span>
              </div>
            ))}
          </div>

          {/* Add Timeline Event */}
          <form onSubmit={handleAddTimelineEvent} style={{ background: '#101626', padding: '16px', borderRadius: '8px', border: '1px solid #22304d' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.875rem', color: '#fff', fontWeight: 600 }}>
              Record Timeline Milestone
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '12px' }}>
              <input
                type="text"
                placeholder="Milestone Event Title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                style={{ padding: '8px 12px', background: '#090d16', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontSize: '0.875rem' }}
              />
              <input
                type="text"
                placeholder="Remarks / Description"
                value={newEventDesc}
                onChange={(e) => setNewEventDesc(e.target.value)}
                style={{ padding: '8px 12px', background: '#090d16', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontSize: '0.875rem' }}
              />
              <button type="submit" className="lp-btn-action lp-btn-primary">
                Add Milestone
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 8: CASE NOTES (SEPARATES LAWYER-PRIVATE VS CLIENT-VISIBLE) */}
      {activeTab === 'notes' && (
        <div className="lp-card">
          <div className="lp-card-header">
            <div>
              <h3 className="lp-card-title">
                <StickyNote size={20} color="#fbbf24" />
                <span>Case Notes & Strategy Log</span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                Strict backend enforcement separating lawyer-private strategy notes from client-visible communications.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {notes.map((n) => {
              const isPrivate = n.type === 'LAWYER_PRIVATE';
              return (
                <div
                  key={n.id}
                  style={{
                    padding: '16px',
                    background: isPrivate ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                    border: `1px solid ${isPrivate ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: isPrivate ? '#fca5a5' : '#93c5fd',
                      }}
                    >
                      {isPrivate ? '🔒 LAWYER-PRIVATE NOTE (CONFIDENTIAL)' : '👁️ CLIENT-VISIBLE NOTE'}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                      {new Date(n.createdAt).toLocaleString()} • {n.authorName}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: '#f8fafc' }}>
                    {n.content}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Add New Note */}
          <form onSubmit={handleAddNote} style={{ background: '#101626', padding: '16px', borderRadius: '8px', border: '1px solid #22304d' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.875rem', color: '#fff', fontWeight: 600 }}>
              Add Case Note
            </h4>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: '#fca5a5', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="noteType"
                  value="LAWYER_PRIVATE"
                  checked={newNoteType === 'LAWYER_PRIVATE'}
                  onChange={() => setNewNoteType('LAWYER_PRIVATE')}
                />
                <strong>LAWYER-PRIVATE NOTE</strong> (Client will NEVER see this)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: '#93c5fd', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="noteType"
                  value="CLIENT_VISIBLE"
                  checked={newNoteType === 'CLIENT_VISIBLE'}
                  onChange={() => setNewNoteType('CLIENT_VISIBLE')}
                />
                <strong>CLIENT-VISIBLE NOTE</strong> (Shared with client)
              </label>
            </div>

            <textarea
              rows={3}
              placeholder="Record case facts, strategy thoughts, or instructions..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: '#090d16', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', marginBottom: '12px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="lp-btn-action lp-btn-primary">
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default LawyerCaseWorkspacePage;
