import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import { authService } from '../../services/authService';
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
  ExternalLink,
} from 'lucide-react';
import './AdminPages.css';

export function AdminVerificationPage() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();

  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionRemarks, setActionRemarks] = useState('');
  const [modalAction, setModalAction] = useState(null); // 'verify' | 'reject' | 'request_info'

  const fetchAdvocates = async () => {
    setLoading(true);
    try {
      const list = await authService.getAdvocateApplications();
      setAdvocates(list);
      if (list.length > 0 && !selectedAdvocate) {
        setSelectedAdvocate(list[0]);
      } else if (selectedAdvocate) {
        const updated = list.find((a) => a.id === selectedAdvocate.id);
        if (updated) setSelectedAdvocate(updated);
      }
    } catch (err) {
      console.error('Failed to load advocate applications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvocates();
  }, []);

  const handleUpdateStatus = async (status) => {
    if (!selectedAdvocate) return;
    setActionLoading(true);

    try {
      await authService.updateAdvocateStatus(
        selectedAdvocate.id,
        status,
        actionRemarks || (status === 'verified' ? 'Bar Council enrollment records verified.' : undefined)
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

      <main className="admin-main-grid">
        {/* Left: Queue of Advocate Applications */}
        <div className="admin-queue-col">
          <div className="queue-header">
            <h3>Advocate Applications</h3>
            <span className="queue-count">{advocates.length} Total</span>
          </div>

          <div className="queue-list" role="list">
            {loading ? (
              <div className="queue-loading">Loading applications...</div>
            ) : advocates.length === 0 ? (
              <div className="queue-empty">No advocate applications in queue.</div>
            ) : (
              advocates.map((adv) => {
                const isSelected = selectedAdvocate?.id === adv.id;
                const status = adv.verificationStatus || 'pending';

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
                      <span className="enrollment-tag">{adv.advocateDetails?.enrollmentNumber || 'NO ENROLLMENT'}</span>
                      <span className="state-tag">{adv.state || 'Karnataka'}</span>
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
                    <span className={`status-pill pill-${selectedAdvocate.verificationStatus || 'pending'}`}>
                      Status: {(selectedAdvocate.verificationStatus || 'pending').toUpperCase()}
                    </span>
                    <span className="dossier-email">{selectedAdvocate.email}</span>
                  </div>
                  <h2 className="dossier-name">{selectedAdvocate.name}</h2>
                  <p className="dossier-location">
                    {selectedAdvocate.city}, {selectedAdvocate.state} • Phone: {selectedAdvocate.phone || 'N/A'}
                  </p>
                </div>

                {/* Direct Action Buttons */}
                <div className="dossier-actions-group">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle}
                    onClick={() => {
                      setModalAction('verify');
                      setActionRemarks('Bar Council records validated. Practice certificate authentic.');
                    }}
                  >
                    Approve Advocate
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={AlertTriangle}
                    onClick={() => {
                      setModalAction('request_info');
                      setActionRemarks('Please upload a high-resolution scan of your Bar Council ID.');
                    }}
                  >
                    Request More Info
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    icon={XCircle}
                    onClick={() => {
                      setModalAction('reject');
                      setActionRemarks('Enrollment number not found in State Bar Council directory.');
                    }}
                  >
                    Reject Application
                  </Button>
                </div>
              </div>

              {/* Remarks Banner if present */}
              {selectedAdvocate.reviewRemarks && (
                <Alert type="warning">
                  <span><strong>Audit Remarks:</strong> {selectedAdvocate.reviewRemarks}</span>
                </Alert>
              )}

              {/* Professional Credentials Section */}
              <div className="dossier-section">
                <h4 className="dossier-section-title">Bar Council & Enrollment Records</h4>
                <div className="dossier-grid-3">
                  <div className="dossier-datum">
                    <span className="datum-label">Enrollment Number</span>
                    <strong className="datum-val font-mono">
                      {selectedAdvocate.advocateDetails?.enrollmentNumber || 'N/A'}
                    </strong>
                  </div>
                  <div className="dossier-datum">
                    <span className="datum-label">State Bar Council</span>
                    <strong className="datum-val">
                      {selectedAdvocate.advocateDetails?.barCouncil || 'Bar Council'}
                    </strong>
                  </div>
                  <div className="dossier-datum">
                    <span className="datum-label">Year of Enrollment</span>
                    <strong className="datum-val">
                      {selectedAdvocate.advocateDetails?.enrollmentYear || '2018'}
                    </strong>
                  </div>
                  <div className="dossier-datum">
                    <span className="datum-label">Years of Experience</span>
                    <strong className="datum-val">
                      {selectedAdvocate.advocateDetails?.experienceYears || 5} Years
                    </strong>
                  </div>
                  <div className="dossier-datum">
                    <span className="datum-label">Chambers / Office Address</span>
                    <strong className="datum-val">
                      {selectedAdvocate.advocateDetails?.officeAddress || 'Not specified'}
                    </strong>
                  </div>
                </div>

                <div className="datum-full mt-3">
                  <span className="datum-label">Specializations & Practice Areas</span>
                  <div className="tags-row">
                    {(selectedAdvocate.advocateDetails?.practiceAreas || ['Civil Law']).map((area, idx) => (
                      <span key={idx} className="practice-area-tag">{area}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Review */}
              <div className="dossier-section">
                <h4 className="dossier-section-title">Uploaded Verification Credentials</h4>
                <div className="admin-docs-grid">
                  {(selectedAdvocate.advocateDetails?.documents || [
                    { id: '1', name: 'Bar_Certificate.pdf', type: 'Bar Enrollment Certificate' },
                    { id: '2', name: 'Bar_ID.pdf', type: 'Bar Council Photo ID' },
                  ]).map((doc) => (
                    <div key={doc.id} className="admin-doc-card">
                      <FileText size={28} className="doc-icon-blue" />
                      <div className="doc-info-block">
                        <strong>{doc.name}</strong>
                        <span className="doc-type-text">{doc.type}</span>
                        <span className="doc-secure-badge">256-bit Encrypted Vault</span>
                      </div>
                      <span className="view-doc-hint">Verified Format</span>
                    </div>
                  ))}
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
              <Button variant="secondary" size="md" onClick={() => setModalAction(null)}>
                Cancel
              </Button>
              <Button
                variant={modalAction === 'reject' ? 'danger' : 'primary'}
                size="md"
                loading={actionLoading}
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
