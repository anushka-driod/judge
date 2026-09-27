import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  ShieldCheck,
  Calendar,
  IndianRupee,
  RefreshCw,
  Search,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [moreInfoPrompt, setMoreInfoPrompt] = useState(false);
  const [infoQuestions, setInfoQuestions] = useState('');
  const navigate = useNavigate();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await lawyerPortalClient.getRequests();
      setRequests(res || []);
      if (res && res.length > 0 && !selectedReq) {
        setSelectedReq(res[0]);
      }
    } catch (err) {
      console.warn('Failed to load consultation requests:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (id) => {
    setActionLoading(true);
    try {
      const res = await lawyerPortalClient.acceptRequest(id, 'Accepted by Counsel.');
      await fetchRequests();
      setSelectedReq(res.request);
    } catch (err) {
      alert('Failed to accept: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Please provide a reason for declining this request:');
    if (reason === null) return;
    setActionLoading(true);
    try {
      const res = await lawyerPortalClient.rejectRequest(id, reason);
      await fetchRequests();
      setSelectedReq(res.request);
    } catch (err) {
      alert('Failed to decline: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestMoreInfo = async (id) => {
    if (!infoQuestions.trim()) {
      alert('Please specify the questions or documents you require.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await lawyerPortalClient.requestMoreInfo(id, infoQuestions);
      setMoreInfoPrompt(false);
      setInfoQuestions('');
      await fetchRequests();
      setSelectedReq(res.request);
    } catch (err) {
      alert('Failed to submit question: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#fff' }}>
            Client Consultation Requests
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Review prospective citizen consultations and authorized case summaries
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'pending', 'accepted', 'rejected'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`lp-btn-action ${filter === st ? 'lp-btn-primary' : ''}`}
              style={{ textTransform: 'capitalize', fontSize: '0.8125rem', padding: '6px 14px' }}
            >
              {st}
            </button>
          ))}
          <button type="button" onClick={fetchRequests} className="lp-btn-action">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '24px' }}>
        {/* Left: Request List */}
        <div className="lp-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #22304d' }}>
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 600 }}>
              Showing {filtered.length} Requests
            </span>
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '30px 0' }}>
              No consultation requests match this filter.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map((r) => {
                const isSelected = selectedReq?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReq(r)}
                    style={{
                      padding: '14px',
                      background: isSelected ? 'rgba(37, 99, 235, 0.15)' : '#101626',
                      border: `1px solid ${isSelected ? '#3b82f6' : '#22304d'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: '#fff', fontSize: '0.9375rem' }}>{r.clientName}</strong>
                      <span className={`lp-badge lp-badge-${r.status === 'accepted' ? 'verified' : r.status === 'rejected' ? 'rejected' : 'pending'}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: '#60a5fa', fontWeight: 600 }}>
                      {r.caseTitle}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      <span>📅 {r.requestedDate} • {r.requestedTime}</span>
                      <strong style={{ color: '#34d399' }}>₹{r.feeAmount}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Detailed Inspection Card */}
        {selectedReq ? (
          <div className="lp-card">
            <div className="lp-card-header">
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Request Ref: {selectedReq.id} • Case ID: {selectedReq.caseId}
                </span>
                <h3 style={{ fontSize: '1.25rem', margin: '4px 0 0', color: '#fff', fontWeight: 700 }}>
                  {selectedReq.caseTitle}
                </h3>
              </div>
              <span className={`lp-badge lp-badge-${selectedReq.status === 'accepted' ? 'verified' : selectedReq.status === 'rejected' ? 'rejected' : 'pending'}`}>
                {selectedReq.status.toUpperCase()}
              </span>
            </div>

            {/* Client & Booking Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', background: '#101626', padding: '16px', borderRadius: '10px', border: '1px solid #22304d' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Client Name:</span>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9375rem' }}>{selectedReq.clientName}</div>
                <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{selectedReq.clientPhone} • {selectedReq.clientEmail}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Location / Forum:</span>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem' }}>{selectedReq.jurisdiction}</div>
                <div style={{ fontSize: '0.75rem', color: '#d4af37' }}>{selectedReq.category}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Consultation Schedule:</span>
                <div style={{ fontWeight: 600, color: '#fff' }}>
                  {selectedReq.requestedDate} at {selectedReq.requestedTime} ({selectedReq.consultationType.toUpperCase()})
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Consultation Fee & Status:</span>
                <div style={{ fontWeight: 700, color: '#34d399' }}>
                  ₹{selectedReq.feeAmount} • {selectedReq.paymentStatus}
                </div>
              </div>
            </div>

            {/* Case Summary (Anchored) */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 600 }}>
                Citizen Case Narration:
              </h4>
              <div style={{ padding: '14px', background: '#0e1526', border: '1px solid #22304d', borderRadius: '8px', fontSize: '0.875rem', lineHeight: 1.5, color: '#e2e8f0' }}>
                {selectedReq.shortSummary}
              </div>
            </div>

            {/* Client Notes */}
            {selectedReq.clientNotes && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.8125rem', color: '#cbd5e1', fontWeight: 600 }}>
                  Client Specific Questions:
                </h4>
                <div style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  "{selectedReq.clientNotes}"
                </div>
              </div>
            )}

            {/* Documents EXPLICITLY Shared */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={16} color="#34d399" />
                <h4 style={{ margin: 0, fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 600 }}>
                  Documents Explicitly Authorized by Client ({(selectedReq.sharedDocuments || []).length}):
                </h4>
              </div>

              {(selectedReq.sharedDocuments || []).length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', fontStyle: 'italic' }}>
                  No standalone documents attached. Only case summary authorized.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedReq.sharedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '10px 14px',
                        background: '#101626',
                        border: '1px solid #22304d',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="#60a5fa" />
                        <div>
                          <strong style={{ fontSize: '0.8125rem', color: '#fff' }}>{doc.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '8px' }}>
                            ({doc.type} • {doc.size})
                          </span>
                        </div>
                      </div>
                      <span className="lp-badge lp-badge-verified" style={{ fontSize: '0.6875rem' }}>
                        CONSENT GRANTED
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions: Accept, Reject, Request More Information */}
            {selectedReq.status === 'pending' && (
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #22304d', paddingTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => handleAccept(selectedReq.id)}
                  disabled={actionLoading}
                  className="lp-btn-action lp-btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <CheckCircle2 size={16} /> Accept Consultation
                </button>

                <button
                  type="button"
                  onClick={() => setMoreInfoPrompt(!moreInfoPrompt)}
                  className="lp-btn-action"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <HelpCircle size={16} /> Request More Information
                </button>

                <button
                  type="button"
                  onClick={() => handleReject(selectedReq.id)}
                  disabled={actionLoading}
                  className="lp-btn-action"
                  style={{ color: '#f87171' }}
                >
                  <XCircle size={16} /> Decline
                </button>
              </div>
            )}

            {/* More info question prompt */}
            {moreInfoPrompt && (
              <div style={{ marginTop: '16px', background: '#101626', padding: '16px', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  What specific clarifications or additional documents are required?
                </label>
                <textarea
                  rows={3}
                  value={infoQuestions}
                  onChange={(e) => setInfoQuestions(e.target.value)}
                  placeholder="e.g. Please clarify if a statutory 15-day notice was previously served in writing."
                  style={{ width: '100%', padding: '8px 12px', background: '#0e1526', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontSize: '0.875rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setMoreInfoPrompt(false)} className="lp-btn-action">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestMoreInfo(selectedReq.id)}
                    disabled={actionLoading}
                    className="lp-btn-action lp-btn-primary"
                  >
                    Submit Question to Client
                  </button>
                </div>
              </div>
            )}

            {selectedReq.status === 'accepted' && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Link
                  to={`/lawyer/cases/${selectedReq.caseId}`}
                  className="lp-btn-action lp-btn-primary"
                >
                  Open Dedicated Case Workspace →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="lp-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#64748b' }}>Select a consultation request to inspect.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LawyerRequestsPage;
