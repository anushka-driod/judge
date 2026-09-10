import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCases } from '../../hooks/useCases';
import { complaintService } from '../../services/complaintService';
import { useUI } from '../../hooks/useUI';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { TextArea } from '../../components/common/TextArea';
import { FileUpload } from '../../components/common/FileUpload';
import { Alert } from '../../components/common/Alert';
import {
  Scale,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';
import './SecondOpinion.css';

export function SecondOpinionPage() {
  const { caseId } = useParams();
  const { cases } = useCases();
  const { showToast } = useUI();

  const [selectedCaseId, setSelectedCaseId] = useState(caseId || cases[0]?.id || '');
  const [concernText, setConcernText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [submittedOpinion, setSubmittedOpinion] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const caseOptions = cases.map((c) => ({
    value: c.id,
    label: `Case #${c.id.slice(-6)}: ${c.title}`,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!concernText) {
      alert('Please describe your specific doubt or legal question.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await complaintService.requestSecondOpinion({
        caseId: selectedCaseId,
        concern: concernText,
        documentNames: attachedFiles.map((f) => f.name),
      });

      setSubmittedOpinion(result);
      showToast('Second opinion review initiated with Senior Counsel Panel', 'success');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="second-opinion-page animate-fade-in">
      <Link to="/dashboard" className="back-nav-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="opinion-page-header">
        <div className="opinion-title-box">
          <div className="opinion-badge-icon">
            <Scale size={26} />
          </div>
          <div>
            <h1 className="opinion-title">Request a Second Legal Opinion</h1>
            <p className="opinion-subtitle">
              Have an independent senior advocate panel double-check prior advice, limitation periods, and proposed settlement offers.
            </p>
          </div>
        </div>
      </div>

      <Alert type="info">
        <span>
          <strong>Why get a second opinion?</strong> In complex disputes (such as delayed property possession or cheque dishonour settlements), getting an objective review ensures you do not inadvertently waive statutory rights.
        </span>
      </Alert>

      {submittedOpinion ? (
        <Card className="opinion-status-card">
          <div className="status-top-icon">
            <CheckCircle2 size={42} className="check-icon" />
          </div>
          <h2 className="status-title">Second Opinion Review In Progress</h2>
          <p className="status-subtitle">
            Reference ID: <strong>#{submittedOpinion.id}</strong>
          </p>

          <div className="status-details-box">
            <div className="detail-row">
              <span>Status:</span>
              <strong className="status-badge-pending">Under Senior Panel Review</strong>
            </div>
            <div className="detail-row">
              <span>Estimated Turnaround:</span>
              <strong>Within 48 Hours</strong>
            </div>
            <div className="detail-row">
              <span>Scope of Review:</span>
              <p>{submittedOpinion.concern}</p>
            </div>
          </div>

          <div className="status-notice">
            <span>You will receive an SMS and email notification once the panel notes are compiled.</span>
          </div>

          <div className="status-actions">
            <Link to="/dashboard">
              <Button variant="primary">Return to Dashboard</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="opinion-layout-grid">
          <div className="opinion-form-col">
            <Card className="opinion-form-card">
              <form onSubmit={handleSubmit}>
                <Select
                  label="Select the Case to Review"
                  options={caseOptions}
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  required
                />

                <TextArea
                  label="What is your concern or doubt?"
                  placeholder="Explain why you are seeking another perspective (e.g. Advised to settle for low compensation, conflicting advice on Section 138 notice deadlines, etc.)..."
                  rows={4}
                  value={concernText}
                  onChange={(e) => setConcernText(e.target.value)}
                  required
                />

                <FileUpload
                  multiple
                  label="Attach Prior Advice, Legal Notice Draft, or Reply Received"
                  onFilesSelected={(files) => setAttachedFiles(files)}
                />

                <div className="opinion-submit-row">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={submitting}
                    icon={ArrowRight}
                    iconPosition="right"
                  >
                    Submit for Independent Review
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          <div className="opinion-aside-col">
            <Card className="opinion-guarantee-card">
              <h3 className="card-title">Second Opinion Guarantees</h3>
              <ul className="opinion-guarantee-list">
                <li>
                  <ShieldCheck size={18} className="guar-icon" />
                  <div>
                    <strong>Independent Senior Counsel</strong>
                    <p>Evaluated by an advocate completely unconnected with your previous consultant.</p>
                  </div>
                </li>
                <li>
                  <Clock size={18} className="guar-icon" />
                  <div>
                    <strong>48-Hour Turnaround</strong>
                    <p>Concise bullet-point summary of statutory strengths and risks.</p>
                  </div>
                </li>
                <li>
                  <HelpCircle size={18} className="guar-icon" />
                  <div>
                    <strong>Confidential Review</strong>
                    <p>Your previous lawyer is never notified of this review request.</p>
                  </div>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
