import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { complaintService } from '../../services/complaintService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Loading } from '../../components/common/Loading';
import { formatDate } from '../../utils/formatDate';
import {
  AlertOctagon,
  Scale,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  FileText,
} from 'lucide-react';
import './Complaints.css';

export function EscalationTrackingPage() {
  const { complaintId } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await complaintService.getComplaintById(complaintId);
        setComplaint(data);
      } catch {
        // Fallback default
        const list = await complaintService.getComplaints();
        setComplaint(list[0]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [complaintId]);

  if (loading) return <Loading text="Loading grievance escalation tracker..." />;
  if (!complaint) return <div>Complaint record not found</div>;

  const steps = [
    { label: 'Grievance Submitted', status: 'completed' },
    { label: 'Documentary Review', status: 'completed' },
    { label: 'Advocate Clarification', status: 'current' },
    { label: 'Resolution / Escalation', status: 'upcoming' },
  ];

  return (
    <div className="escalation-page animate-fade-in">
      <Link to="/dashboard" className="back-nav-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="escalation-header">
        <div className="escalation-header-top">
          <span className="complaint-id-tag">Grievance Ref: #{complaint.id}</span>
          <Badge variant="warning">{complaint.status}</Badge>
        </div>
        <h1 className="escalation-title">Issue with {complaint.lawyerName}</h1>
        <p className="escalation-subtitle">
          Category: <strong>{complaint.issueCategory}</strong> • Filed on {formatDate(complaint.submittedDate)}
        </p>
      </div>

      {/* Visual Escalation Step Bar */}
      <Card className="escalation-steps-card">
        <div className="escalation-steps-row">
          {steps.map((st, i) => (
            <React.Fragment key={st.label}>
              <div className={`step-cell ${st.status}`}>
                <div className="step-badge-indicator">
                  {st.status === 'completed' && <CheckCircle2 size={16} />}
                  {st.status === 'current' && <Clock size={16} />}
                  {st.status === 'upcoming' && <span>{i + 1}</span>}
                </div>
                <span className="step-cell-label">{st.label}</span>
              </div>
              {i < steps.length - 1 && <div className="step-connector" />}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Two Column Grid: Assessment + Escalation Options */}
      <div className="escalation-grid">
        <div className="escalation-main-col">
          {/* Neutral Assessment */}
          <Card className="escalation-subcard">
            <h3 className="card-title">Neutral Preliminary Evaluation</h3>
            <p className="eval-text">{complaint.neutralAssessment}</p>

            <div className="user-narrative-quote">
              <span className="quote-label">Reported Facts:</span>
              <p>"{complaint.description}"</p>
              {complaint.evidenceDocument && (
                <span className="evidence-attached-tag">
                  <FileText size={14} /> Attached Evidence: {complaint.evidenceDocument}
                </span>
              )}
            </div>
          </Card>

          {/* Current Authority Response Status */}
          <Card className="escalation-subcard">
            <h3 className="card-title">Advocate Response Window</h3>
            <div className="authority-status-box">
              <Clock size={20} className="clock-icon" />
              <div>
                <strong>Notice Sent to Advocate</strong>
                <p>A formal notification has been dispatched to {complaint.lawyerName}. The advocate has 48 hours to furnish an explanation or complete the agreed service.</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Aside: Available Next Legal Escalation Paths */}
        <div className="escalation-side-col">
          <Card className="escalation-subcard">
            <h3 className="card-title">Available Escalation Remedies</h3>
            <p className="aside-subtext">If this issue is not resolved amicably within 48 hours, choose from:</p>

            <div className="escalation-options-stack">
              <div className="esc-option-box">
                <ShieldCheck size={18} className="esc-icon" />
                <div>
                  <strong>Mediation & Fee Refund</strong>
                  <p>Request automatic refund of unfulfilled drafting or consultation fees.</p>
                  <Button variant="outline" size="sm" style={{ marginTop: '6px' }}>
                    Request Fee Refund
                  </Button>
                </div>
              </div>

              <div className="esc-option-box">
                <Scale size={18} className="esc-icon" />
                <div>
                  <strong>Complimentary Reassignment</strong>
                  <p>Transfer your case documents to another verified advocate at no extra cost.</p>
                  <Button variant="outline" size="sm" style={{ marginTop: '6px' }}>
                    Reassign to New Advocate
                  </Button>
                </div>
              </div>

              <div className="esc-option-box">
                <ExternalLink size={18} className="esc-icon" />
                <div>
                  <strong>State Bar Council Disciplinary Petition</strong>
                  <p>In cases of severe breach of Advocates Act, 1961, file a formal complaint under Section 35.</p>
                  <Button variant="danger" size="sm" style={{ marginTop: '6px' }}>
                    Bar Council Filing Guide
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
