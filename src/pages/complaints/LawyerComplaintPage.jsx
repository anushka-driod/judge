import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { mockLawyers } from '../../data/mockData';
import { complaintService } from '../../services/complaintService';
import { useUI } from '../../hooks/useUI';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { TextArea } from '../../components/common/TextArea';
import { FileUpload } from '../../components/common/FileUpload';
import { Alert } from '../../components/common/Alert';
import {
  AlertOctagon,
  ShieldCheck,
  Scale,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import './Complaints.css';

export function LawyerComplaintPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useUI();

  const [selectedLawyerId, setSelectedLawyerId] = useState(mockLawyers[1].id);
  const [issueCategory, setIssueCategory] = useState('Unreasonable Delay & Non-Communication');
  const [narrative, setNarrative] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const lawyerOptions = mockLawyers.map((l) => ({
    value: l.id,
    label: `${l.name} (${l.court})`,
  }));

  const issueCategories = [
    'Unreasonable Delay & Non-Communication',
    'Failure to Share Draft Notice Before Dispatch',
    'Fee Discrepancy or Unagreed Extra Charges',
    'Missed Scheduled Consultation Without Notice',
    'Conflict of Interest or Ethical Concern',
    'Other Service Quality Concern',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!narrative) {
      alert('Please describe what happened objectively.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedLawyer = mockLawyers.find((l) => l.id === selectedLawyerId);
      const newComplaint = await complaintService.submitComplaint({
        lawyerId: selectedLawyerId,
        lawyerName: selectedLawyer?.name || 'Advocate',
        caseId: caseId || 'case-102',
        issueCategory,
        description: narrative,
        evidenceDocument: evidenceFiles[0]?.name || 'Evidence_Log.pdf',
      });

      showToast('Issue reported. Escalation tracking initialized.', 'info');
      navigate(`/complaints/${newComplaint.id}`);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="complaint-page animate-fade-in">
      <Link to="/dashboard" className="back-nav-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="complaint-page-header">
        <div className="complaint-title-box">
          <div className="complaint-icon-circle">
            <AlertOctagon size={26} />
          </div>
          <div>
            <h1 className="complaint-title">Report an Issue with an Advocate</h1>
            <p className="complaint-subtitle">
              Objective reporting, mutual conciliation, and Bar Council escalation guidance.
            </p>
          </div>
        </div>
      </div>

      {/* Strict Neutrality Notice per Core Spec */}
      <Alert type="warning">
        <span>
          <strong>Neutral Grievance Protocol:</strong> VidhiSetu maintains an objective conciliation framework. The platform does not pass judgment or declare fault unilaterally. We record both parties' documentary evidence and provide appropriate statutory escalation pathways.
        </span>
      </Alert>

      <div className="complaint-layout-grid">
        <div className="complaint-form-col">
          <Card className="complaint-form-card">
            <form onSubmit={handleSubmit}>
              <Select
                label="Advocate Involved"
                options={lawyerOptions}
                value={selectedLawyerId}
                onChange={(e) => setSelectedLawyerId(e.target.value)}
                required
              />

              <Select
                label="Nature of Reported Issue"
                options={issueCategories}
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value)}
                required
              />

              <TextArea
                label="Factual Explanation of What Happened"
                placeholder="State the dates, agreed deliverables (e.g. legal notice drafting, consultation attendance), fees paid, and what communication transpired..."
                rows={5}
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                helperText="Please be factual and avoid abusive language."
                required
              />

              <FileUpload
                multiple
                label="Attach Supporting Evidence (WhatsApp Chats, Receipts, Emails)"
                helperText="Concrete written logs help resolve disputes 3x faster"
                onFilesSelected={(files) => setEvidenceFiles(files)}
              />

              <div className="complaint-submit-row">
                <Button
                  type="submit"
                  variant="danger"
                  size="lg"
                  loading={submitting}
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Submit Grievance & Open Escalation Tracker
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="complaint-aside-col">
          <Card className="complaint-rules-card">
            <h3 className="card-title">What Happens Next?</h3>
            <ul className="complaint-steps-list">
              <li>
                <strong>1. Neutral Log Entry:</strong> Your statement and proofs are indexed into the confidential grievance log.
              </li>
              <li>
                <strong>2. Opportunity to Clarify:</strong> The advocate receives a formal notification to provide a written explanation or deliver the pending notice within 48 hours.
              </li>
              <li>
                <strong>3. Conciliation or Refund:</strong> VidhiSetu Grievance Cell assesses if fees should be refunded or another senior counsel assigned at zero extra cost.
              </li>
              <li>
                <strong>4. Bar Council Escalation:</strong> If gross professional misconduct is established, you receive guided drafting to petition the State Bar Council Disciplinary Committee.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
