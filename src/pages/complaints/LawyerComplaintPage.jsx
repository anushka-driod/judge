import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { complaintService } from '../../services/complaintService';
import { lawyerService } from '../../services/lawyerService';
import { useUI } from '../../hooks/useUI';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { TextArea } from '../../components/common/TextArea';
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

  const [selectedLawyerId, setSelectedLawyerId] = useState('');
  const [lawyers, setLawyers] = useState([]);
  const [lawyerLoadError, setLawyerLoadError] = useState('');
  const [lawyersLoading, setLawyersLoading] = useState(true);
  const [issueCategory, setIssueCategory] = useState('Unreasonable Delay & Non-Communication');
  const [narrative, setNarrative] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    lawyerService.getAllLawyers()
      .then((results) => {
        if (isCurrent) setLawyers(Array.isArray(results) ? results : []);
      })
      .catch((err) => {
        if (isCurrent) setLawyerLoadError(err.message || 'Unable to load verified advocates.');
      })
      .finally(() => {
        if (isCurrent) setLawyersLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const lawyerOptions = lawyers.map((l) => ({
    value: l.id,
    label: `${l.name}${l.court ? ` (${l.court})` : ''}`,
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
    if (!narrative || !selectedLawyerId) {
      alert('Select a verified advocate and describe what happened objectively.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedLawyer = lawyers.find((l) => l.id === selectedLawyerId);
      const newComplaint = await complaintService.submitComplaint({
        lawyerId: selectedLawyerId,
        lawyerName: selectedLawyer.name,
        caseId: caseId || null,
        issueCategory,
        description: narrative,
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
                disabled={lawyersLoading || Boolean(lawyerLoadError) || lawyers.length === 0}
              />
              {lawyersLoading && <p role="status">Loading verified advocates…</p>}
              {lawyerLoadError && <Alert type="danger">{lawyerLoadError}</Alert>}
              {!lawyersLoading && !lawyerLoadError && lawyers.length === 0 && (
                <Alert type="info">No verified advocates are available to report right now.</Alert>
              )}

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

              <Alert type="info">
                Evidence-file uploads are not enabled for this report. Do not attach or share sensitive documents here.
              </Alert>

              <div className="complaint-submit-row">
                <Button
                  type="submit"
                  variant="danger"
                  size="lg"
                  loading={submitting}
                  disabled={submitting || lawyersLoading || Boolean(lawyerLoadError) || lawyers.length === 0}
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
