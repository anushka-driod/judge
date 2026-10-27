import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUI } from '../../hooks/useUI';
import { authService } from '../../services/authService';
import { BASE_URL } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import {
  Scale,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  ArrowLeft,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import './AdminPages.css';

export function AdminVerificationPage() {
  const { showToast } = useUI();

  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notificationRetryLoading, setNotificationRetryLoading] = useState(false);
  const [actionRemarks, setActionRemarks] = useState('');
  const [modalAction, setModalAction] = useState(null); // 'verify' | 'reject' | 'request_info'
  const pendingCount = advocates.filter((advocate) =>
    ['PENDING', 'UNDER_REVIEW'].includes(String(advocate.verification_status || 'PENDING').toUpperCase())
  ).length;

  const fetchAdvocates = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await authService.getAdvocateApplications();
      setAdvocates(Array.isArray(list) ? list : []);
      if (list.length > 0 && !selectedAdvocate) {
        setSelectedAdvocate(list[0]);
      } else if (selectedAdvocate) {
        const updated = list.find((a) => a.id === selectedAdvocate.id);
        if (updated) setSelectedAdvocate(updated);
        else setSelectedAdvocate(null);
      }
    } catch (err) {
      console.error('Failed to load advocate applications', err);
      setLoadError(err.message || 'Failed to load advocate applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvocates();
  }, []);

  const handleUpdateStatus = async (status) => {
    if (!selectedAdvocate) return;
    if (status === 'verified' && !actionRemarks.trim()) {
      showToast('Record the verification checks completed before approving this application.', 'error');
      return;
    }
    setActionLoading(true);

    try {
      await authService.updateAdvocateStatus(
        selectedAdvocate.id,
        status,
        actionRemarks.trim() || undefined
      );

      showToast(`Advocate application updated to ${status.toUpperCase()}`, 'success');
      setModalAction(null);
      setActionRemarks('');
      await fetchAdvocates();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadDocument = async (document) => {
    try {
      const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');
      const targetUrl = document.url.startsWith('http')
        ? document.url
        : document.url.startsWith('/api') && BASE_URL !== '/api'
          ? `${BASE_URL.replace(/\/api$/, '')}${document.url}`
          : document.url;
      const response = await fetch(targetUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`Document download failed with status ${response.status}.`);
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = window.document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = document.title || document.name || 'verification-document';
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showToast(err.message || 'Unable to download verification document.', 'error');
    }
  };

  const retryStatusNotification = async () => {
    if (!selectedAdvocate) return;
    setNotificationRetryLoading(true);
    try {
      const result = await authService.retryAdvocateStatusNotification(selectedAdvocate.id);
      if (result.success) {
        showToast('Applicant email provider accepted the notification.', 'success');
      } else {
        showToast('Decision remains saved, but the email provider did not accept the notification.', 'error');
      }
      await fetchAdvocates();
    } catch (err) {
      showToast(err.message || 'Could not retry the applicant notification.', 'error');
    } finally {
      setNotificationRetryLoading(false);
    }
  };

  return (
    <div className="admin-verif-container animate-fade-in">
      {/* Top Admin Header */}
      <header className="admin-header-bar">
        <div className="admin-header-left">
          <Link to="/chat" className="admin-back-btn">
            <ArrowLeft size={16} /> Back to VidhiSetu Chatbot
          </Link>
          <div className="admin-brand-title">
            <Scale size={22} className="admin-scale-icon" />
            <span>VidhiSetu Bar Verification & Compliance Cell</span>
            <span className="admin-badge">Admin Oversight</span>
          </div>
        </div>
        <button type="button" className="btn-refresh-admin" onClick={fetchAdvocates}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </header>

      {loadError && (
        <Alert type="danger">
          <span>{loadError}</span>
        </Alert>
      )}

      <main className="admin-main-grid">
        {/* Left: Queue of Advocate Applications */}
        <div className="admin-queue-col">
          <div className="queue-header">
            <h3>Advocate Applications</h3>
            <span className="queue-count">{pendingCount} Pending / {advocates.length} Total</span>
          </div>

          <div className="queue-list" role="list">
            {loading ? (
              <div className="queue-loading">Loading applications...</div>
            ) : advocates.length === 0 ? (
              <div className="queue-empty">No advocate applications in queue.</div>
            ) : (
              advocates.map((adv) => {
                const isSelected = selectedAdvocate?.id === adv.id;
                const status = String(adv.verification_status || 'PENDING').toLowerCase();

                return (
                  <div
                    key={adv.id}
                    className={`queue-item ${isSelected ? 'queue-item-selected' : ''}`}
                    onClick={() => setSelectedAdvocate(adv)}
                    role="listitem"
                  >
                    <div className="queue-item-top">
                      <strong className="adv-name">{adv.name}</strong>
                      <span className={`status-pill pill-${status}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="queue-item-meta">
                      <span className="enrollment-tag">{adv.bar_registration_number || 'NO ENROLLMENT'}</span>
                      <span className="state-tag">{adv.state_bar_council || 'State not provided'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Advocate Dossier & Verification Actions */}
        <div className="admin-dossier-col">
          {selectedAdvocate ? (
            <Card className="dossier-card">
              {/* Dossier Header */}
              <div className="dossier-header">
                <div>
                  <div className="dossier-status-strip">
                    <span className={`status-pill pill-${String(selectedAdvocate.verification_status || 'PENDING').toLowerCase()}`}>
                      Status: {(selectedAdvocate.verification_status || 'PENDING').toUpperCase()}
                    </span>
                    <span className="dossier-email">{selectedAdvocate.email}</span>
                  </div>
                  <h2 className="dossier-name">{selectedAdvocate.name}</h2>
                  <p className="dossier-location">
                    {[selectedAdvocate.location_city, selectedAdvocate.state_bar_council].filter(Boolean).join(', ') || 'Location not provided'} • Phone: {selectedAdvocate.phone || 'N/A'}
                  </p>
                </div>

                {/* Direct Action Buttons */}
                <div className="dossier-actions-group">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle}
                    disabled={actionLoading || String(selectedAdvocate.verification_status).toUpperCase() === 'VERIFIED'}
                    onClick={() => {
                      setModalAction('verify');
                      setActionRemarks('');
                    }}
                  >
                    Approve Advocate
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={AlertTriangle}
                    disabled={actionLoading}
                    onClick={() => {
                      setModalAction('request_info');
                      setActionRemarks('');
                    }}
                  >
                    Request More Info
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    icon={XCircle}
                    disabled={actionLoading || String(selectedAdvocate.verification_status).toUpperCase() === 'REJECTED'}
                    onClick={() => {
                      setModalAction('reject');
                      setActionRemarks('');
                    }}
                  >
                    Reject Application
                  </Button>
                </div>
              </div>

              {['VERIFIED', 'REJECTED'].includes(String(selectedAdvocate.verification_status).toUpperCase()) && (
                <div className="dossier-notification-status" aria-live="polite">
                  <span>
                    Applicant notification: {selectedAdvocate.status_notification_status || 'not attempted'}
                    {selectedAdvocate.status_notification_sent ? ' (accepted by provider)' : ''}
                  </span>
                  {!selectedAdvocate.status_notification_sent && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={notificationRetryLoading}
                      disabled={notificationRetryLoading}
                      onClick={retryStatusNotification}
                    >
                      Retry applicant email
                    </Button>
                  )}
                </div>
              )}

              {/* Remarks Banner if present */}
              {selectedAdvocate.admin_remarks && (
                <Alert type="warning">
                  <span><strong>Audit Remarks:</strong> {selectedAdvocate.admin_remarks}</span>
                </Alert>
              )}

              {/* Professional Credentials Section */}
              <div className="dossier-section">
                <h4 className="dossier-section-title">Bar Council & Enrollment Records</h4>
                <div className="dossier-grid-3">
                  <div className="dossier-datum">
                    <span className="datum-label">Enrollment Number</span>
                    <strong className="datum-val font-mono">
                      {selectedAdvocate.bar_registration_number || 'Not provided'}
                    </strong>
                  </div>
                  <div className="dossier-datum">
                    <span className="datum-label">State Bar Council</span>
                    <strong className="datum-val">
                      {selectedAdvocate.state_bar_council || 'Not provided'}
                    </strong>
                  </div>
                  <div className="dossier-datum">
                    <span className="datum-label">Year of Enrollment</span>
                    <strong className="datum-val">
                      {selectedAdvocate.year_of_enrollment || 'Not provided'}
                    </strong>
                  </div>
                  <div className="dossier-datum">
                    <span className="datum-label">Years of Experience</span>
                    <strong className="datum-val">
                      {selectedAdvocate.years_of_experience ?? 'Not provided'}{selectedAdvocate.years_of_experience != null ? ' Years' : ''}
                    </strong>
                  </div>
                  <div className="dossier-datum">
                    <span className="datum-label">Chambers / Office Address</span>
                    <strong className="datum-val">
                      {selectedAdvocate.office_address || 'Not provided'}
                    </strong>
                  </div>
                </div>

                <div className="datum-full mt-3">
                  <span className="datum-label">Specializations & Practice Areas</span>
                  <div className="tags-row">
                    {(selectedAdvocate.specializations || []).map((area, idx) => (
                      <span key={idx} className="practice-area-tag">{area}</span>
                    ))}
                    {!(selectedAdvocate.specializations || []).length && <span>Not provided</span>}
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Review */}
              <div className="dossier-section">
                <h4 className="dossier-section-title">Uploaded Verification Credentials</h4>
                <div className="admin-docs-grid">
                  {(selectedAdvocate.verification_documents || []).map((doc) => (
                    <div key={doc.id} className="admin-doc-card">
                      <FileText size={28} className="doc-icon-blue" />
                      <div className="doc-info-block">
                        <strong>{doc.title}</strong>
                        <span className="doc-type-text">{doc.type}</span>
                        <span className="doc-secure-badge">{doc.sizeFormatted || 'Private document'}</span>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => downloadDocument(doc)}>
                        Download
                      </Button>
                    </div>
                  ))}
                  {!(selectedAdvocate.verification_documents || []).length && (
                    <Alert type="warning">No verification documents were submitted.</Alert>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="dossier-placeholder">
              <UserCheck size={36} />
              <p>Select an advocate application from the left list to review credentials.</p>
            </div>
          )}
        </div>
      </main>

      {/* Decision Modal */}
      {modalAction && (
        <div className="admin-modal-backdrop" onClick={() => setModalAction(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {modalAction === 'verify' && 'Approve Advocate Credentials'}
              {modalAction === 'reject' && 'Reject Advocate Application'}
              {modalAction === 'request_info' && 'Request Additional Information'}
            </h3>
            <p className="modal-desc">
              Audit log will record this action under compliance protocol for{' '}
              <strong>{selectedAdvocate.name}</strong>.
            </p>

            <div className="modal-body">
              <label className="input-label">Audit Remarks / Justification</label>
              <textarea
                className="modal-textarea"
                rows={4}
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="Enter remarks recorded in audit history..."
                required
              />
            </div>

            <div className="modal-footer">
              <Button variant="secondary" size="md" disabled={actionLoading} onClick={() => setModalAction(null)}>
                Cancel
              </Button>
              <Button
                variant={modalAction === 'reject' ? 'danger' : 'primary'}
                size="md"
                loading={actionLoading}
                disabled={actionLoading}
                onClick={() =>
                  handleUpdateStatus(
                    modalAction === 'verify'
                      ? 'verified'
                      : modalAction === 'reject'
                      ? 'rejected'
                      : 'requires_information'
                  )
                }
              >
                Confirm {modalAction.replace('_', ' ').toUpperCase()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
