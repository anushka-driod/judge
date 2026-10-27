import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
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
  Mail,
  Calendar,
  Award,
  BookOpen,
  Briefcase,
  Check,
  Lock,
} from 'lucide-react';
import './AdvocatePages.css';

export function AdvocateStatusPage() {
  const { currentUser, logout, refreshUser, isVerifiedAdvocate } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [portalLawyer, setPortalLawyer] = useState(null);
  const [lastChecked, setLastChecked] = useState(new Date());

  // Fetch freshest data from lawyer portal client on mount and refresh
  const fetchPortalData = async () => {
    try {
      const res = await lawyerPortalClient.getMe();
      if (res && res.lawyer) {
        setPortalLawyer(res.lawyer);
        if (res.lawyer.verification_status === 'VERIFIED') {
          navigate('/lawyer/dashboard');
        }
      }
    } catch (e) {
      // Non-blocking fallback to currentUser
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  // If advocate gets verified, redirect to advocate dashboard or lawyer dashboard
  useEffect(() => {
    if (isVerifiedAdvocate) {
      navigate('/lawyer/dashboard');
    }
  }, [isVerifiedAdvocate, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refreshUser(), fetchPortalData()]);
      setLastChecked(new Date());
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const advocate = portalLawyer || currentUser?.advocateDetails || {};
  const status = String(
    portalLawyer?.verification_status ||
    currentUser?.verification_status ||
    currentUser?.verificationStatus ||
    'PENDING'
  ).toLowerCase();

  const isVerified = status === 'verified';
  const isUnderReview = status === 'under_review';
  const isRequiresInfo = status === 'requires_information' || status === 'more_info_needed';
  const isRejected = status === 'rejected';
  const isSuspended = status === 'suspended';
  const isPending = !isVerified && !isUnderReview && !isRequiresInfo && !isRejected && !isSuspended;

  // Real uploaded verification documents from backend (never fake or mock documents)
  const uploadedDocuments = portalLawyer?.verification_documents || advocate.documents || [];

  const statusConfig = {
    pending: {
      title: 'Awaiting Admin Approval',
      badgeClass: 'status-badge-pending',
      icon: Clock,
      headline: 'Your advocate registration is awaiting administrator approval.',
      message:
        'Your application and Bar Council credentials have been securely stored in our administrative database. Platform administrators will audit your professional records before chambers access is granted.',
      color: '#d4af37',
      step2Label: 'In Progress: Bar Council Audit',
      step2State: 'current',
    },
    under_review: {
      title: 'Formal Document Audit',
      badgeClass: 'status-badge-review',
      icon: Clock,
      headline: 'Application Currently Under Formal Administrative Review',
      message:
        'The VidhiSetu Bar Verification Council is currently cross-referencing your State Bar Council roll and uploaded certificates.',
      color: '#38bdf8',
      step2Label: 'Active: State Bar Roll Audit',
      step2State: 'current',
    },
    verified: {
      title: 'Verified Advocate',
      badgeClass: 'status-badge-verified',
      icon: CheckCircle2,
      headline: 'Advocate Credentials Verified & Approved',
      message:
        'Congratulations! Your Bar Council credentials have been validated. Your Advocate Chambers access is fully activated.',
      color: '#10b981',
      step2Label: 'Completed: Verified by Admin',
      step2State: 'completed',
    },
    requires_information: {
      title: 'Action Required',
      badgeClass: 'status-badge-action',
      icon: AlertTriangle,
      headline: 'Additional Credentials Required',
      message:
        portalLawyer?.admin_remarks ||
        currentUser?.reviewRemarks ||
        'Please provide additional Bar Council enrollment proof or an updated Certificate of Practice.',
      color: '#f97316',
      step2Label: 'Action Required: Documentation',
      step2State: 'action_required',
    },
    rejected: {
      title: 'Verification Not Approved',
      badgeClass: 'status-badge-rejected',
      icon: XCircle,
      headline: 'Advocate Application Not Approved',
      message:
        portalLawyer?.admin_remarks ||
        currentUser?.reviewRemarks ||
        'The submitted credentials could not be authenticated against the public records of the State Bar Council.',
      color: '#ef4444',
      step2Label: 'Audit Unsuccessful',
      step2State: 'failed',
    },
    suspended: {
      title: 'Chambers Suspended',
      badgeClass: 'status-badge-rejected',
      icon: AlertTriangle,
      headline: 'Chambers Access Suspended',
      message:
        portalLawyer?.admin_remarks ||
        currentUser?.reviewRemarks ||
        'Your advocate portal privileges are temporarily suspended. Please contact legal administrative oversight.',
      color: '#ef4444',
      step2Label: 'Suspended by Oversight',
      step2State: 'failed',
    },
  };

  const currentConfig =
    (isVerified && statusConfig.verified) ||
    (isUnderReview && statusConfig.under_review) ||
    (isRequiresInfo && statusConfig.requires_information) ||
    (isRejected && statusConfig.rejected) ||
    (isSuspended && statusConfig.suspended) ||
    statusConfig.pending;

  const StatusIcon = currentConfig.icon;
  const appId = portalLawyer?.id || advocate.id || currentUser?.id || 'APPL-PENDING';

  return (
    <div className="advocate-status-container animate-fade-in">
      {/* Top Brand Bar */}
      <header className="advocate-header-strip">
        <div className="advocate-brand-logo">
          <div className="scale-icon-wrap">
            <Scale size={22} className="scale-icon" />
          </div>
          <div className="brand-titles">
            <span className="brand-name">VidhiSetu</span>
            <span className="brand-sub">Advocate Verification Chambers</span>
          </div>
        </div>

        <div className="advocate-header-actions">
          <button
            type="button"
            className="btn-refresh-status"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Query latest verification decision"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Checking...' : 'Check Status'}</span>
          </button>
          <button
            type="button"
            className="btn-status-logout"
            onClick={logout}
            title="Securely sign out of current session"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="advocate-status-main">
        {/* Verification Status Hero Card */}
        <Card className="status-hero-card">
          <div className="status-hero-header">
            <div
              className="status-icon-bubble"
              style={{
                backgroundColor: `${currentConfig.color}18`,
                color: currentConfig.color,
                border: `1px solid ${currentConfig.color}40`,
              }}
            >
              <StatusIcon size={38} />
            </div>
            <div className="status-hero-text">
              <div className="status-pill-row">
                <span className={`status-pill ${currentConfig.badgeClass}`}>
                  {currentConfig.title}
                </span>
                <span className="app-id">Ref ID: {appId}</span>
                <span className="last-sync-badge">
                  Updated: {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h1 className="status-hero-title">{currentConfig.headline}</h1>
              <p className="status-hero-desc">{currentConfig.message}</p>
            </div>
          </div>

          {/* Three-Step Progress Indicator (Completed, Current, Pending stages) */}
          <div className="verification-stepper-box">
            <div className="stepper-title-row">
              <span className="stepper-heading">Advocate Onboarding & Verification Lifecycle</span>
              <span className="stepper-subheading">Three-stage administrative verification pipeline</span>
            </div>

            <div className="verification-stepper">
              {/* Stage 1: Application Submitted (Always completed once registered) */}
              <div className="step-node step-completed">
                <div className="step-circle step-circle-completed">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="step-details">
                  <span className="step-state-badge badge-completed">Stage 1 • Completed</span>
                  <strong className="step-label">Application Submitted</strong>
                  <span className="step-sub">Record Saved Persistently</span>
                </div>
              </div>

              {/* Connecting Line 1-2 */}
              <div
                className={`step-line ${
                  isVerified || isUnderReview || isPending ? 'line-active' : ''
                }`}
              />

              {/* Stage 2: Bar Council Verification */}
              <div
                className={`step-node ${
                  isVerified
                    ? 'step-completed'
                    : isRequiresInfo
                    ? 'step-action-required'
                    : isRejected || isSuspended
                    ? 'step-failed'
                    : 'step-current'
                }`}
              >
                <div
                  className={`step-circle ${
                    isVerified
                      ? 'step-circle-completed'
                      : isRequiresInfo
                      ? 'step-circle-action'
                      : isRejected || isSuspended
                      ? 'step-circle-failed'
                      : 'step-circle-current'
                  }`}
                >
                  {isVerified ? (
                    <Check size={16} strokeWidth={3} />
                  ) : isRequiresInfo ? (
                    <AlertTriangle size={16} />
                  ) : isRejected || isSuspended ? (
                    <XCircle size={16} />
                  ) : (
                    <span className="step-number-text">2</span>
                  )}
                </div>
                <div className="step-details">
                  <span
                    className={`step-state-badge ${
                      isVerified
                        ? 'badge-completed'
                        : isRequiresInfo
                        ? 'badge-action'
                        : isRejected || isSuspended
                        ? 'badge-failed'
                        : 'badge-current'
                    }`}
                  >
                    Stage 2 • {isVerified ? 'Completed' : isPending || isUnderReview ? 'Current Stage' : 'Audit Notice'}
                  </span>
                  <strong className="step-label">Bar Council Verification</strong>
                  <span className="step-sub">{currentConfig.step2Label}</span>
                </div>
              </div>

              {/* Connecting Line 2-3 */}
              <div className={`step-line ${isVerified ? 'line-completed' : 'line-pending'}`} />

              {/* Stage 3: Chambers Access */}
              <div className={`step-node ${isVerified ? 'step-completed' : 'step-pending'}`}>
                <div
                  className={`step-circle ${
                    isVerified ? 'step-circle-completed' : 'step-circle-pending'
                  }`}
                >
                  {isVerified ? <Check size={16} strokeWidth={3} /> : <Lock size={15} />}
                </div>
                <div className="step-details">
                  <span className={`step-state-badge ${isVerified ? 'badge-completed' : 'badge-pending'}`}>
                    Stage 3 • {isVerified ? 'Unlocked' : 'Pending Approval'}
                  </span>
                  <strong className="step-label">Chambers Access</strong>
                  <span className="step-sub">
                    {isVerified ? 'Full Consultations Access' : 'Locked Until Verified'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action when Verified */}
          {isVerified && (
            <div className="verified-actions-banner">
              <div>
                <strong>Chambers Access Unlocked:</strong>
                <p>Your advocate credentials are approved. Proceed to your practice dashboard.</p>
              </div>
              <Link to="/lawyer/dashboard" className="btn-enter-chambers">
                <span>Enter Lawyer Chambers</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </Card>

        {/* Submitted Professional Details & Dark Document Cards Grid */}
        <div className="advocate-details-grid">
          {/* Professional Record Summary */}
          <Card className="advocate-summary-card">
            <div className="card-header-styled">
              <Award size={18} className="gold-icon" />
              <h3 className="section-heading">Submitted Professional Record</h3>
            </div>

            <div className="summary-fields-list">
              <div className="field-item">
                <span className="field-label">Advocate Name</span>
                <strong className="field-val">{portalLawyer?.name || currentUser?.name || 'Advocate'}</strong>
              </div>

              <div className="field-item">
                <span className="field-label">Bar Enrollment Number</span>
                <strong className="field-val font-mono gold-text">
                  {portalLawyer?.bar_registration_number ||
                    advocate.barNumber ||
                    advocate.enrollmentNumber ||
                    'Pending'}
                </strong>
              </div>

              <div className="field-item">
                <span className="field-label">State Bar Council</span>
                <strong className="field-val">
                  {portalLawyer?.state_bar_council || advocate.barCouncil || advocate.stateBarCouncil || 'State Bar Council'}
                </strong>
              </div>

              <div className="field-row-split">
                <div className="field-item">
                  <span className="field-label">Experience</span>
                  <strong className="field-val">
                    {portalLawyer?.years_of_experience || advocate.experienceYears || 3} Years
                  </strong>
                </div>

                <div className="field-item">
                  <span className="field-label">Primary Court</span>
                  <strong className="field-val">
                    {portalLawyer?.primary_court || advocate.primaryCourt || 'District & Sessions Court'}
                  </strong>
                </div>
              </div>

              <div className="field-item">
                <span className="field-label">Registered Practice Areas</span>
                <div className="tags-flex">
                  {(
                    portalLawyer?.specializations ||
                    advocate.practiceAreas ||
                    ['Civil & Contract Law', 'Consumer Disputes']
                  ).map((area, i) => (
                    <span key={i} className="mini-tag">
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {portalLawyer?.admin_remarks && (
                <div className="remarks-box">
                  <span className="field-label">Administrative Auditor Remarks:</span>
                  <p className="remarks-text">{portalLawyer.admin_remarks}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Genuine Uploaded Credentials (Dark Document Cards) */}
          <Card className="advocate-docs-card">
            <div className="card-header-styled">
              <FileText size={18} className="gold-icon" />
              <h3 className="section-heading">Uploaded Credentials & Evidence</h3>
            </div>
            <p className="docs-note">
              Authentic uploaded verification files recorded in your application dossier.
            </p>

            <div className="docs-list">
              {uploadedDocuments.length > 0 ? (
                uploadedDocuments.map((doc, idx) => {
                  const docTitle = doc.title || doc.name || `Document Proof #${idx + 1}`;
                  const docType = doc.type || 'Bar Enrollment Credential';
                  const docSize = doc.sizeFormatted || (doc.size ? `${Math.round(doc.size / 1024)} KB` : 'Attached');
                  const uploadDate = doc.uploadedAt
                    ? new Date(doc.uploadedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recent Upload';

                  const isDocVerified = doc.verified === true || isVerified;

                  return (
                    <div key={doc.id || idx} className="doc-item-row">
                      <div className="doc-icon-wrap">
                        <FileText size={20} className="doc-icon" />
                      </div>
                      <div className="doc-meta">
                        <div className="doc-title-row">
                          <span className="doc-name">{docTitle}</span>
                        </div>
                        <div className="doc-sub-row">
                          <span className="doc-type-badge">{docType}</span>
                          <span className="doc-meta-separator">•</span>
                          <span className="doc-size-text">{docSize}</span>
                          <span className="doc-meta-separator">•</span>
                          <span className="doc-date-text">{uploadDate}</span>
                        </div>
                      </div>
                      <div className="doc-status-col">
                        <span
                          className={`doc-status-badge ${
                            isDocVerified ? 'doc-status-verified' : 'doc-status-pending'
                          }`}
                        >
                          {isDocVerified ? 'Verified by Admin' : 'Uploaded & In Review'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-docs-box">
                  <AlertTriangle size={24} className="gold-icon" />
                  <p className="no-docs-title">No Uploaded Documents Found</p>
                  <p className="no-docs-desc">
                    No verification files are currently associated with this profile. If you recently registered, documents will reflect upon database sync.
                  </p>
                </div>
              )}
            </div>

            {/* Action Required Box for re-uploads */}
            {isRequiresInfo && (
              <div className="action-required-box">
                <AlertTriangle size={20} className="warn-icon" />
                <div>
                  <strong>Action Required:</strong>
                  <p>{portalLawyer?.admin_remarks || 'Please upload updated credential documentation.'}</p>
                </div>
              </div>
            )}

            {/* Support Inquiries (Clean display with NO stray period) */}
            <div className="admin-support-box">
              <ShieldCheck size={20} className="shield-icon" />
              <div className="support-info-text">
                <strong className="support-title">Advocate Support & Administrative Inquiries</strong>
                <p className="support-desc">
                  Have questions about your Bar Council enrollment verification or need an expedited review? Contact the official VidhiSetu administrative panel:
                </p>
                <div className="support-action-row">
                  <a
                    href="mailto:adminvidhisetu@gmail.com"
                    className="admin-email-link"
                    title="Send inquiry to VidhiSetu Admin"
                  >
                    <Mail size={14} />
                    <span>adminvidhisetu@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default AdvocateStatusPage;

