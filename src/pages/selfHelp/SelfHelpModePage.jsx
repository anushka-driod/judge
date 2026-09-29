import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCases } from '../../hooks/useCases';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Loading } from '../../components/common/Loading';
import {
  UserCheck,
  FileCheck,
  Send,
  Clock,
  ArrowRight,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import './ActionPlan.css';

export function SelfHelpModePage() {
  const { caseId } = useParams();
  const { getCaseById } = useCases();
  const [legalCase, setLegalCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedNotice, setCopiedNotice] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getCaseById(caseId);
      setLegalCase(data);
      setLoading(false);
    }
    load();
  }, [caseId, getCaseById]);

  if (loading) return <Loading text="Loading self-help resolution modules..." />;
  if (!legalCase) return <div>Case not found</div>;

  const mockNoticeTemplate = `LEGAL DEMAND NOTICE UNDER CONSUMER PROTECTION ACT, 2019

To,
The Grievance Officer / Managing Director,
[Opposing Party / Company Name]
[Address / Registered Office]

Subject: Statutory notice demanding refund of INR [Amount] regarding Order Ref: [Order ID] / Dispute Ref: #${legalCase.id.slice(-6)}

Sir/Madam,

Under instructions from my legal rights as a consumer under Section 2(47) and Section 35 of the Consumer Protection Act, 2019, I hereby state as follows:

1. That on [Date of Purchase], I purchased [Product/Service Description] for valuable consideration of [Amount] via [Payment Mode].
2. That upon receipt, the goods were found to be defective/counterfeit, which was immediately notified to your customer support team.
3. That contrary to statutory warranties, your team arbitrarily rejected the refund/replacement request, amounting to gross Deficiency in Service and Unfair Trade Practice.

I hereby call upon you to refund the full principal amount of INR [Amount] along with interest within FIFTEEN (15) DAYS of receipt of this notice, failing which I shall be constrained to institute formal proceedings before the District Consumer Disputes Redressal Commission (e-Daakhil) at your sole risk, cost, and consequences.

Yours faithfully,
[Your Legal Name]
[Your Mobile Number & Email]
Date: ${new Date().toLocaleDateString('en-IN')}`;

  const copyNotice = () => {
    navigator.clipboard.writeText(mockNoticeTemplate);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  return (
    <div className="self-help-page animate-fade-in">
      <Link to={`/cases/${caseId}`} className="back-nav-link">
        <ArrowLeft size={16} /> Back to Case Hub
      </Link>

      <div className="self-help-header">
        <div className="self-help-title-box">
          <div className="self-help-badge-icon">
            <UserCheck size={26} />
          </div>
          <div>
            <h1 className="self-help-title">Self-Help Dispute Resolution Portal</h1>
            <p className="self-help-subtitle">
              Case #{legalCase.id.slice(-6)}: {legalCase.title}
            </p>
          </div>
        </div>

        <Link to={`/cases/${caseId}/action-plan`}>
          <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right">
            Open Interactive Action Checklist
          </Button>
        </Link>
      </div>

      <Alert type="success">
        <span>
          <strong>Self-Help Path Active:</strong> In India, more than 70% of consumer and tenancy disputes settle when a structured statutory notice is formally sent. You can complete this entirely without upfront advocate fees!
        </span>
      </Alert>

      {/* 3 Step Guidance Cards */}
      <div className="self-help-steps-grid">
        <Card className="self-help-step-card">
          <span className="step-badge-num">STAGE 1</span>
          <h3 className="card-title">Pre-Litigation Statutory Notice</h3>
          <p className="step-desc">
            Indian law gives the opposing party a statutory 15-day window to rectify service deficiencies or clear bounced payments.
          </p>
          <div className="step-action-box">
            <span className="action-tag">Mandatory First Step</span>
          </div>
        </Card>

        <Card className="self-help-step-card">
          <span className="step-badge-num">STAGE 2</span>
          <h3 className="card-title">National Helpline Grievance (NCH)</h3>
          <p className="step-desc">
            File an instant free ticket on National Consumer Helpline (NCH / 1915) or state rental authority.
          </p>
          <div className="step-action-box">
            <span className="action-tag">Free Mediation</span>
          </div>
        </Card>

        <Card className="self-help-step-card">
          <span className="step-badge-num">STAGE 3</span>
          <h3 className="card-title">Online e-Daakhil Filing</h3>
          <p className="step-desc">
            If unaddressed after 15 days, file a formal complaint online before the District Consumer Commission via e-Daakhil.
          </p>
          <div className="step-action-box">
            <span className="action-tag">Legal Adjudication</span>
          </div>
        </Card>
      </div>

      {/* Automated Legal Notice Draft Generator */}
      <Card className="notice-generator-card">
        <div className="notice-generator-header">
          <div>
            <h3 className="card-title">Generated Statutory Legal Demand Notice Draft</h3>
            <p className="card-subtitle">
              Tailored for your case facts. Copy and dispatch via Registered Post with Acknowledgment Due (RPAD) or Speed Post.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copyNotice} icon={Copy}>
            {copiedNotice ? 'Copied to Clipboard!' : 'Copy Notice Text'}
          </Button>
        </div>

        <div className="notice-code-preview">
          <pre>{mockNoticeTemplate}</pre>
        </div>
      </Card>
    </div>
  );
}
