import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCases } from '../../hooks/useCases';
import { useUI } from '../../hooks/useUI';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { Alert } from '../../components/common/Alert';
import { Loading } from '../../components/common/Loading';
import { CaseTimeline } from '../../components/case/CaseTimeline';
import { formatDate } from '../../utils/formatDate';
import {
  Briefcase,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  UserCheck,
  Scale,
  ListTodo,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import './Cases.css';

export function CaseDetailsPage() {
  const { caseId } = useParams();
  const { getCaseById, updateCaseStatus } = useCases();
  const { showToast } = useUI();

  const [legalCase, setLegalCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function load() {
      const data = await getCaseById(caseId);
      setLegalCase(data);
      setLoading(false);
    }
    load();
  }, [caseId, getCaseById]);

  if (loading) return <Loading text="Loading legal case dossier..." />;
  if (!legalCase) return <div>Case not found</div>;

  const tabs = [
    { id: 'overview', label: 'Case Overview', icon: Briefcase },
    { id: 'timeline', label: 'Timeline & Milestones', icon: Clock },
    { id: 'actions', label: 'Action Plan', icon: ListTodo, badge: legalCase.actionPlan?.length || 0 },
    { id: 'documents', label: 'Case Documents', icon: FileText, badge: legalCase.documents?.length || 0 },
    { id: 'consultations', label: 'Consultations & Invoices', icon: Scale },
  ];

  const handleMarkResolved = async () => {
    try {
      const updated = await updateCaseStatus(caseId, 'Resolved');
      setLegalCase(updated);
      showToast('Case successfully marked as Resolved!', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  return (
    <div className="case-details-page animate-fade-in">
      <Link to="/cases" className="back-nav-link">
        <ArrowLeft size={16} /> Back to All Cases
      </Link>

      {/* Case Main Header */}
      <div className="case-header-card">
        <div className="case-header-top">
          <div className="case-tags-group">
            <span className="case-id-badge">#{legalCase.id.slice(-6)}</span>
            <span className="case-category-tag">{legalCase.category}</span>
            <StatusBadge status={legalCase.status} />
          </div>

          <div className="case-top-actions">
            {legalCase.status !== 'Resolved' && (
              <Button variant="success" size="sm" onClick={handleMarkResolved} icon={CheckCircle2}>
                Mark as Resolved
              </Button>
            )}
            <Link to={`/cases/${legalCase.id}/guidance`}>
              <Button variant="outline" size="sm">
                View AI Guidance
              </Button>
            </Link>
          </div>
        </div>

        <h1 className="case-title-main">{legalCase.title}</h1>
        <p className="case-desc-main">{legalCase.shortDescription}</p>

        <div className="case-meta-bar">
          <div className="meta-box">
            <Calendar size={15} />
            <span>Filing Date: {formatDate(legalCase.createdAt)}</span>
          </div>
          <div className="meta-box">
            <Briefcase size={15} />
            <span>Forum: {legalCase.jurisdiction || 'District Consumer Forum'}</span>
          </div>
          <div className="meta-box">
            <Clock size={15} />
            <span>Current Stage: <strong>{legalCase.currentStage}</strong></span>
          </div>
        </div>
      </div>

      {/* Next Action Urgent Banner */}
      {legalCase.nextAction && legalCase.status !== 'Resolved' && (
        <Alert type="warning" className="case-urgent-alert">
          <div className="urgent-alert-content">
            <div>
              <strong>Action Required: </strong>
              <span>{legalCase.nextAction}</span>
            </div>
            {legalCase.nextActionDeadline && (
              <span className="urgent-deadline-tag">
                Target Deadline: {formatDate(legalCase.nextActionDeadline)}
              </span>
            )}
          </div>
        </Alert>
      )}

      {/* Tabs Switcher */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="case-tab-content grid-2-col">
          <div className="tab-col-main">
            <Card className="overview-subcard">
              <h3 className="card-title">Case Summary & Ground of Claim</h3>
              <p className="overview-summary-text">{legalCase.shortDescription}</p>

              <div className="claim-highlights">
                <span className="highlight-tag">Limitation Status: Well within 2-year statutory limit</span>
                <span className="highlight-tag">Mode: {legalCase.mode === 'self_help' ? 'Self-Help Mode' : 'Lawyer Consultation'}</span>
              </div>
            </Card>

            <Card className="overview-subcard">
              <div className="overview-actions-header">
                <h3 className="card-title">Recommended Legal Next Steps</h3>
                <Link to={`/cases/${legalCase.id}/action-plan`} className="view-link">
                  Full Checklist →
                </Link>
              </div>

              <div className="overview-actions-mini-list">
                {(legalCase.actionPlan || []).map((act, idx) => (
                  <div key={act.id} className="mini-action-row">
                    <span className="mini-action-step">{idx + 1}</span>
                    <div className="mini-action-text">
                      <strong>{act.title}</strong>
                      <p>{act.whyItMatters}</p>
                    </div>
                    <span className={`mini-status-pill status-${act.status.toLowerCase().replace(' ', '-')}`}>
                      {act.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="tab-col-side">
            <Card className="overview-subcard">
              <h3 className="card-title">Resolution Pathways</h3>
              <p className="path-desc">You can toggle between self-help conciliation and advocate assistance at any time.</p>

              <div className="pathway-buttons-stack">
                <Link to={`/cases/${legalCase.id}/self-help`} className="w-full">
                  <Button variant="outline" size="sm" fullWidth icon={UserCheck}>
                    Self-Help Notice Generator
                  </Button>
                </Link>
                <Link to={`/cases/${legalCase.id}/lawyers`} className="w-full">
                  <Button variant="primary" size="sm" fullWidth icon={Scale}>
                    Consult Practice Advocate
                  </Button>
                </Link>
                <Link to={`/cases/${legalCase.id}/second-opinion`} className="w-full">
                  <Button variant="ghost" size="sm" fullWidth>
                    Request Second Opinion
                  </Button>
                </Link>
                <Link to={`/cases/${legalCase.id}/complaint`} className="w-full">
                  <Button variant="ghost" size="sm" fullWidth className="complaint-nav-btn">
                    Report Advocate Issue
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Timeline */}
      {activeTab === 'timeline' && (
        <Card className="timeline-tab-card">
          <h3 className="card-title">Chronological Case Timeline</h3>
          <p className="card-subtitle">Every key action, proof submission, and response logged with verified timestamp.</p>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <CaseTimeline events={legalCase.timeline || []} />
          </div>
        </Card>
      )}

      {/* Tab 3: Actions */}
      {activeTab === 'actions' && (
        <Card className="actions-tab-card">
          <div className="tab-card-header">
            <div>
              <h3 className="card-title">Case Action Items</h3>
              <p className="card-subtitle">Track required legal tasks and required proofs</p>
            </div>
            <Link to={`/cases/${legalCase.id}/action-plan`}>
              <Button variant="primary" size="sm">
                Open Full Action Plan Page
              </Button>
            </Link>
          </div>
          <div className="actions-tab-list">
            {(legalCase.actionPlan || []).map((act) => (
              <div key={act.id} className="action-tab-row">
                <CheckCircle2
                  size={20}
                  className={act.status === 'Completed' ? 'action-check-done' : 'action-check-pending'}
                />
                <div className="action-tab-text">
                  <strong>{act.title}</strong>
                  <p>{act.whyItMatters}</p>
                </div>
                <span className="action-tab-deadline">
                  {act.deadline ? formatDate(act.deadline) : 'No deadline'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Documents */}
      {activeTab === 'documents' && (
        <Card className="docs-tab-card">
          <div className="tab-card-header">
            <div>
              <h3 className="card-title">Attached Evidence Documents ({legalCase.documents?.length || 0})</h3>
              <p className="card-subtitle">Invoices, bank return memos, agreements, and notices</p>
            </div>
            <Link to="/documents">
              <Button variant="outline" size="sm">
                Upload New Document
              </Button>
            </Link>
          </div>

          <div className="case-docs-grid">
            {(legalCase.documents || []).map((doc) => (
              <div key={doc.id} className="case-doc-card">
                <FileText size={28} className="case-doc-icon" />
                <div className="case-doc-info">
                  <strong className="case-doc-name">{doc.name}</strong>
                  <span className="case-doc-meta">{doc.type} • {doc.size}</span>
                  <span className="case-doc-date">Uploaded: {formatDate(doc.uploadedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 5: Consultations & Invoices */}
      {activeTab === 'consultations' && (
        <Card className="consultations-tab-card">
          <div className="tab-card-header">
            <div>
              <h3 className="card-title">Advocate Consultations & Billing</h3>
              <p className="card-subtitle">Verified video and phone consultations, payment escrow, and tax receipts</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/payments">
                <Button variant="outline" size="sm">
                  View Full Payments Ledger
                </Button>
              </Link>
              <Link to={`/cases/${caseId}/lawyers`}>
                <Button variant="primary" size="sm">
                  Book New Consultation
                </Button>
              </Link>
            </div>
          </div>

          <div style={{ padding: '20px 0' }}>
            {legalCase.assignedLawyer ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Assigned Practice Counsel
                  </span>
                  <h4 style={{ margin: '4px 0', fontSize: '1.0625rem', color: '#0f172a' }}>
                    {legalCase.assignedLawyer.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569' }}>
                    {legalCase.assignedLawyer.court} • Fee: ₹{legalCase.assignedLawyer.consultationFee}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link to={`/lawyers/${legalCase.assignedLawyer.id}/book?caseId=${caseId}`}>
                    <Button variant="primary" size="sm">
                      Schedule Appointment
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
                <p>No active advocate assigned to this case yet.</p>
                <Link to={`/cases/${caseId}/lawyers`}>
                  <Button variant="primary" size="sm" style={{ marginTop: '12px' }}>
                    Browse Verified Advocates
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
