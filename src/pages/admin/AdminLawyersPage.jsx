import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  UserCheck,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function AdminLawyersPage() {
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionRemarks, setActionRemarks] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchLawyers = async () => {
    setLoading(true);
    try {
      const res = await lawyerPortalClient.adminGetLawyers(
        filterStatus === 'ALL' ? null : filterStatus
      );
      const list = res?.lawyers || res || [];
      setLawyers(list);
      if (list.length > 0 && !selectedLawyer) {
        setSelectedLawyer(list[0]);
      } else if (selectedLawyer) {
        const updated = list.find((l) => l.id === selectedLawyer.id);
        if (updated) setSelectedLawyer(updated);
      }
      const logs = await lawyerPortalClient.adminGetAuditLogs(20);
      setAuditLogs(logs?.auditLogs || []);
    } catch (err) {
      console.warn('Failed to fetch admin lawyers list:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLawyers();
  }, [filterStatus]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const remarks = actionRemarks || 'Bar Council registration & credentials verified.';
      await lawyerPortalClient.adminApproveLawyer(id, remarks);
      setActionRemarks('');
      await fetchLawyers();
    } catch (err) {
      alert('Failed to approve lawyer: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (id) => {
    setActionLoading(true);
    try {
      const remarks = actionRemarks || 'Application marked under administrative review.';
      await lawyerPortalClient.adminReviewLawyer(id, remarks);
      setActionRemarks('');
      await fetchLawyers();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    const reason = actionRemarks || window.prompt('Specify reason for rejection:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await lawyerPortalClient.adminRejectLawyer(id, reason);
      setActionRemarks('');
      await fetchLawyers();
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async (id) => {
    const remarks = actionRemarks || window.prompt('Specify additional documents requested:');
    if (!remarks) return;
    setActionLoading(true);
    try {
      await lawyerPortalClient.adminRequestInfo(id, remarks);
      setActionRemarks('');
      await fetchLawyers();
    } catch (err) {
      alert('Failed to request info: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (id) => {
    const reason = actionRemarks || window.prompt('Reason for platform suspension:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await lawyerPortalClient.adminSuspendLawyer(id, reason);
      setActionRemarks('');
      await fetchLawyers();
    } catch (err) {
      alert('Failed to suspend lawyer: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        padding: '32px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={28} color="#d4af37" />
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Admin Lawyer Verification & Oversight
              </h1>
            </div>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
              State Bar Council credentials auditing, document review, and access control lifecycle
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/lawyer/dashboard" className="lp-btn-action">
              <span>Lawyer Portal</span>
              <ExternalLink size={14} />
            </Link>
            <button type="button" onClick={fetchLawyers} className="lp-btn-action">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Docket</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {['ALL', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`lp-btn-action ${filterStatus === st ? 'lp-btn-primary' : ''}`}
              style={{ fontSize: '0.8125rem', padding: '6px 14px' }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* 2-Column Inspection View */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: '24px', marginBottom: '32px' }}>
          {/* Applications Docket */}
          <div className="lp-card" style={{ padding: '16px' }}>
            <h3 className="lp-card-title" style={{ marginBottom: '14px', fontSize: '1rem' }}>
              <span>Advocate Applications ({lawyers.length})</span>
            </h3>

            {lawyers.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>
                No lawyers found matching this filter.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lawyers.map((l) => {
                  const isSelected = selectedLawyer?.id === l.id;
                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLawyer(l)}
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
                        <strong style={{ color: '#fff', fontSize: '0.9375rem' }}>{l.name}</strong>
                        <span className={`lp-badge lp-badge-${l.verification_status?.toLowerCase()}`}>
                          {l.verification_status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#d4af37', fontWeight: 600 }}>
                        {l.bar_registration_number} • {l.state_bar_council}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                        {l.primary_court} • {l.years_of_experience} yrs exp • {l.location_city}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lawyer Inspection & Action Panel */}
          {selectedLawyer ? (
            <div className="lp-card">
              <div className="lp-card-header">
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                    {selectedLawyer.name}
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '2px' }}>
                    ID: {selectedLawyer.id} • {selectedLawyer.email}
                  </div>
                </div>

                <span className={`lp-badge lp-badge-${selectedLawyer.verification_status?.toLowerCase()}`}>
                  {selectedLawyer.verification_status}
                </span>
              </div>

              {/* Bar Council Records Box */}
              <div style={{ background: '#101626', padding: '16px', borderRadius: '10px', border: '1px solid #22304d', marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.8125rem', textTransform: 'uppercase', color: '#d4af37' }}>
                  Bar Council Record Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Bar Registration Number:</span>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem' }}>
                      {selectedLawyer.bar_registration_number}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>State Bar Council:</span>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{selectedLawyer.state_bar_council}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Year of Enrollment:</span>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{selectedLawyer.year_of_enrollment || 2012}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Years of Practice:</span>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{selectedLawyer.years_of_experience} Years</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Primary Court:</span>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{selectedLawyer.primary_court}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Consultation Fee:</span>
                    <div style={{ fontWeight: 700, color: '#34d399' }}>₹{selectedLawyer.consultation_fee}</div>
                  </div>
                </div>
              </div>

              {/* Submitted Verification Documents */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.875rem', color: '#fff' }}>
                  Submitted Verification Documents ({(selectedLawyer.verification_documents || []).length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedLawyer.verification_documents || []).map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        background: '#101626',
                        border: '1px solid #22304d',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={18} color="#60a5fa" />
                        <div>
                          <strong style={{ fontSize: '0.875rem', color: '#fff' }}>{doc.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{doc.type}</div>
                        </div>
                      </div>
                      <span className={`lp-badge lp-badge-${doc.verified ? 'verified' : 'pending'}`}>
                        {doc.verified ? 'VERIFIED' : 'PENDING AUDIT'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Action Remarks */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Administrative Audit Remarks / Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified against Karnataka Bar Council Roll, records match."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff', fontSize: '0.875rem' }}
                />
              </div>

              {/* Admin Decision Actions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #22304d', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedLawyer.id)}
                  disabled={actionLoading}
                  className="lp-btn-action"
                  style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 16px' }}
                >
                  <CheckCircle size={15} />
                  <span>Approve & Mark Verified</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReview(selectedLawyer.id)}
                  disabled={actionLoading}
                  className="lp-btn-action"
                  style={{ padding: '8px 14px' }}
                >
                  <Clock size={15} color="#f59e0b" />
                  <span>Mark Under Review</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestInfo(selectedLawyer.id)}
                  disabled={actionLoading}
                  className="lp-btn-action"
                  style={{ padding: '8px 14px' }}
                >
                  <span>Request More Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReject(selectedLawyer.id)}
                  disabled={actionLoading}
                  className="lp-btn-action"
                  style={{ color: '#f87171', padding: '8px 14px' }}
                >
                  <XCircle size={15} />
                  <span>Reject</span>
                </button>

                {selectedLawyer.verification_status === 'VERIFIED' && (
                  <button
                    type="button"
                    onClick={() => handleSuspend(selectedLawyer.id)}
                    disabled={actionLoading}
                    className="lp-btn-action"
                    style={{ color: '#ef4444', marginLeft: 'auto' }}
                  >
                    <span>Suspend Lawyer</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="lp-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#64748b' }}>Select an application to inspect.</p>
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="lp-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #22304d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="lp-card-title">
              <Clock size={18} color="#d4af37" />
              <span>Platform Verification & Security Audit Trail</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Immutable administrative log
            </span>
          </div>

          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 10).map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#fff' }}>{log.actor}</strong>
                    </td>
                    <td>
                      <span className="lp-badge lp-badge-lawyer" style={{ fontSize: '0.6875rem' }}>
                        {log.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#60a5fa', fontWeight: 600 }}>{log.action}</span>
                    </td>
                    <td>{log.entity}</td>
                    <td>
                      <code>{log.entityId}</code>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {JSON.stringify(log.metadata || {})}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLawyersPage;
