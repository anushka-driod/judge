import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import {
  Scale,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
  LogOut,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import './AdvocatePages.css';

export function AdvocateStatusPage() {
  const { currentUser, logout, refreshUser, isVerifiedAdvocate } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  // If advocate gets verified, redirect to advocate dashboard
  useEffect(() => {
    if (isVerifiedAdvocate) {
      navigate('/advocate/dashboard');
    }
  }, [isVerifiedAdvocate, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updated = await refreshUser();
      if (updated?.verificationStatus === 'verified') {
        navigate('/advocate/dashboard');
      }
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const status = currentUser?.verificationStatus || 'pending';
  const advocate = currentUser?.advocateDetails || {};

  const statusConfig = {
    pending: {
      title: 'Verification Pending',
      badgeClass: 'status-badge-pending',
      icon: Clock,
      headline: 'Your advocate application has been submitted.',
      message:
        'VidhiSetu is reviewing your professional information. You will be notified once verification is complete.',
      color: '#f59e0b',
    },
    under_review: {
      title: 'Under Review',
      badgeClass: 'status-badge-review',
      icon: Clock,
      headline: 'Application Currently Under Review by VidhiSetu Legal Cell',
      message:
        'Our compliance officers are authenticating your State Bar Council enrollment records.',
      color: '#3b82f6',
    },
    verified: {
      title: 'Verified Advocate',
      badgeClass: 'status-badge-verified',
      icon: CheckCircle2,
      headline: 'Congratulations! Your Advocate Credentials are Verified.',
      message:
        'You have full access to VidhiSetu lawyer consultation chambers and client matters.',
      color: '#10b981',
    },
    requires_information: {
      title: 'Action Required',
      badgeClass: 'status-badge-action',
      icon: AlertTriangle,
      headline: 'Additional Credentials Required',
      message:
        currentUser?.reviewRemarks ||
        'Please upload a clearer copy of your Bar Council Identity Card or latest certificate of practice.',
      color: '#f97316',
    },
    rejected: {
      title: 'Verification Failed',
      badgeClass: 'status-badge-rejected',
      icon: XCircle,
      headline: 'Application Could Not Be Verified',
      message:
        currentUser?.reviewRemarks ||
        'The submitted credentials could not be matched against State Bar Council public directories.',
      color: '#ef4444',
    },
  };

  const currentConfig = statusConfig[status] || statusConfig.pending;
  const StatusIcon = currentConfig.icon;

  return (
    <div className="advocate-status-container animate-fade-in">
      {/* Top Brand Bar */}
      <header className="advocate-header-strip">
        <div className="advocate-brand-logo">
          <Scale size={24} className="scale-icon" />
          <span className="brand-name">VidhiSetu Advocate Portal</span>
        </div>
        <div className="advocate-header-actions">
          <button
            type="button"
            className="btn-refresh-status"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>Check Status</span>
          </button>
          <button type="button" className="btn-status-logout" onClick={logout}>
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="advocate-status-main">
        {/* Verification Status Card */}
        <Card className="status-hero-card">
          <div className="status-hero-header">
            <div
              className="status-icon-bubble"
              style={{ backgroundColor: `${currentConfig.color}15`, color: currentConfig.color }}
            >
              <StatusIcon size={36} />
            </div>
            <div className="status-hero-text">
              <div className="status-pill-row">
                <span className={`status-pill ${currentConfig.badgeClass}`}>
                  {currentConfig.title}
                </span>
                <span className="app-id">ID: {currentUser?.id || 'APPL-2026'}</span>
              </div>
              <h1 className="status-hero-title">{currentConfig.headline}</h1>
              <p className="status-hero-desc">{currentConfig.message}</p>
            </div>
          </div>

          {/* Progress Tracker Bar */}
          <div className="verification-stepper">
            <div className={`step-node ${['pending', 'under_review', 'verified'].includes(status) ? 'step-done' : ''}`}>
              <div className="step-circle">1</div>
              <span className="step-label">Application Submitted</span>
            </div>
            <div className={`step-line ${['under_review', 'verified'].includes(status) ? 'line-done' : ''}`} />
            <div className={`step-node ${['under_review', 'verified'].includes(status) ? 'step-done' : status === 'pending' ? 'step-active' : ''}`}>
              <div className="step-circle">2</div>
              <span className="step-label">Bar Council Verification</span>
            </div>
            <div className={`step-line ${status === 'verified' ? 'line-done' : ''}`} />
            <div className={`step-node ${status === 'verified' ? 'step-done' : ''}`}>
              <div className="step-circle">3</div>
              <span className="step-label">Chambers Access</span>
            </div>
          </div>
        </Card>

        {/* Submitted Professional Details Summary */}
        <div className="advocate-details-grid">
          <Card className="advocate-summary-card">
            <h3 className="section-heading">Submitted Professional Record</h3>
            <div className="summary-fields-list">
              <div className="field-item">
                <span className="field-label">Advocate Name:</span>
                <strong className="field-val">{currentUser?.name}</strong>
              </div>
              <div className="field-item">
                <span className="field-label">Bar Enrollment No:</span>
                <strong className="field-val font-mono">{advocate.enrollmentNumber || 'KAR/1842/2014'}</strong>
              </div>
              <div className="field-item">
                <span className="field-label">State Bar Council:</span>
                <strong className="field-val">{advocate.barCouncil || 'Bar Council of Karnataka'}</strong>
              </div>
              <div className="field-item">
                <span className="field-label">Enrollment Year:</span>
                <strong className="field-val">{advocate.enrollmentYear || 2018}</strong>
              </div>
              <div className="field-item">
                <span className="field-label">Years of Experience:</span>
                <strong className="field-val">{advocate.experienceYears || 5} Years</strong>
              </div>
              <div className="field-item">
                <span className="field-label">Practice Areas:</span>
                <div className="tags-flex">
                  {(advocate.practiceAreas || ['Consumer Disputes', 'Civil Law']).map((area, i) => (
                    <span key={i} className="mini-tag">{area}</span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="advocate-docs-card">
            <h3 className="section-heading">Uploaded Credentials</h3>
            <p className="docs-note">Documents are encrypted and accessible strictly for administrative audit.</p>
            <div className="docs-list">
              {(advocate.documents || [
                { id: '1', name: 'Bar_Enrollment_Certificate.pdf', type: 'Bar Enrollment Certificate' },
                { id: '2', name: 'Advocate_Bar_ID.pdf', type: 'Bar Council Photo ID' },
              ]).map((doc) => (
                <div key={doc.id} className="doc-item-row">
                  <FileText size={20} className="doc-icon" />
                  <div className="doc-meta">
                    <span className="doc-name">{doc.name}</span>
                    <span className="doc-type-badge">{doc.type}</span>
                  </div>
                  <span className="doc-status-tag">Encrypted & Stored</span>
                </div>
              ))}
            </div>

            {status === 'requires_information' && (
              <div className="action-required-box">
                <AlertTriangle size={20} className="warn-icon" />
                <div>
                  <strong>Action Required:</strong>
                  <p>{currentUser?.reviewRemarks || 'Please submit updated practicing certificate.'}</p>
                  <Button variant="primary" size="sm" className="mt-2">
                    Upload Additional Document
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Demo Navigation to Admin Panel */}
            <div className="admin-demo-box">
              <ShieldCheck size={18} className="shield-icon" />
              <div className="demo-hint-text">
                <strong>Platform Reviewer Note:</strong>
                <span>Administrators can approve or update this advocate's application in the Verification Panel.</span>
              </div>
              <Link to="/admin/verifications" className="btn-goto-admin">
                Open Admin Reviewer <ArrowRight size={14} />
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
