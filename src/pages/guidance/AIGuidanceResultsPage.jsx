import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCases } from '../../hooks/useCases';
import { useUI } from '../../hooks/useUI';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Alert } from '../../components/common/Alert';
import { Loading } from '../../components/common/Loading';
import { RelevantJudgments } from '../../components/legal/RelevantJudgments';
import {
  Sparkles,
  BookOpen,
  Scale,
  CheckCircle2,
  FileText,
  UserCheck,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import './AIGuidanceResultsPage.css';

export function AIGuidanceResultsPage() {
  const { caseId } = useParams();
  const { getCaseById, setCaseResolutionMode } = useCases();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [legalCase, setLegalCase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCase() {
      const data = await getCaseById(caseId);
      setLegalCase(data);
      setLoading(false);
    }
    loadCase();
  }, [caseId, getCaseById]);

  if (loading) {
    return <Loading fullScreen text="Synthesizing statutory research and precedent analysis..." />;
  }

  if (!legalCase) {
    return (
      <div className="guidance-error-container">
        <h2>Case Not Found</h2>
        <p>The requested case analysis is unavailable.</p>
        <Link to="/dashboard">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const guidance = legalCase.aiGuidance || {};

  const handleSelectSelfHelp = async () => {
    await setCaseResolutionMode(legalCase.id, 'self_help');
    showToast('Self-Help Mode activated! View your tailored action plan.', 'success');
    navigate(`/cases/${legalCase.id}/self-help`);
  };

  const handleSelectLawyer = async () => {
    await setCaseResolutionMode(legalCase.id, 'lawyer');
    showToast('Lawyer Consultation path selected. Browsing verified advocates...', 'info');
    navigate(`/cases/${legalCase.id}/lawyers`);
  };

  return (
    <div className="guidance-page animate-fade-in">
      {/* Top Banner */}
      <div className="guidance-header-banner">
        <div className="guidance-header-meta">
          <div className="guidance-category-row">
            <span className="case-id-tag">Case #{legalCase.id.slice(-6)}</span>
            <span className="case-category-pill">{legalCase.category}</span>
            <StatusBadge status={legalCase.status} />
          </div>
          <h1 className="guidance-case-title">{legalCase.title}</h1>
          <p className="guidance-subtitle">
            AI-assisted evidentiary analysis based on Indian laws and comparable precedents
          </p>
        </div>

        <div className="guidance-actions-top" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/chat">
            <Button variant="primary" size="sm" icon={Sparkles}>
              Discuss in AI Chat
            </Button>
          </Link>
          <Link to={`/cases/${legalCase.id}`}>
            <Button variant="outline" size="sm">
              View Case Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* Language / Advice Safeguard Alert */}
      <Alert type="info">
        <span>
          <strong>Important Notice:</strong> Based on the information provided, the following assessment outlines statutory provisions and judicial precedents that may apply to your situation. This information is intended to empower you with clarity and does not constitute guaranteed legal advice.
        </span>
      </Alert>

      {/* Grid: Left Breakdown + Right Selection Cards */}
      <div className="guidance-content-grid">
        {/* Left Column: Evidence-based breakdown */}
        <div className="guidance-breakdown-col">
          {/* Section 1: What We Understood */}
          <Card className="guidance-section-card">
            <div className="section-title-bar">
              <div className="section-icon-circle">
                <HelpCircle size={18} />
              </div>
              <h3 className="section-heading">1. What We Understood</h3>
            </div>
            <p className="understood-text">
              {guidance.understoodSummary || legalCase.shortDescription}
            </p>
            {legalCase.jurisdiction && (
              <div className="jurisdiction-box">
                <strong>Likely Adjudicating Forum:</strong> {legalCase.jurisdiction}
              </div>
            )}
          </Card>

          {/* Section 2: Key Findings & What This May Mean */}
          <Card className="guidance-section-card">
            <div className="section-title-bar">
              <div className="section-icon-circle icon-findings">
                <Sparkles size={18} />
              </div>
              <h3 className="section-heading">2. Key Findings & What This May Mean</h3>
            </div>
            <ul className="guidance-findings-list">
              {(guidance.keyFindings || [
                'Statutory violation of warranty terms under Indian law.',
                'Dispute falls under the limitation period of 2 years.',
                'Pre-litigation conciliation or formal notice recommended as initial step.'
              ]).map((finding, idx) => (
                <li key={idx}>
                  <CheckCircle2 size={16} className="finding-bullet-icon" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Section 3: Relevant Indian Laws */}
          <Card className="guidance-section-card">
            <div className="section-title-bar">
              <div className="section-icon-circle icon-laws">
                <BookOpen size={18} />
              </div>
              <div className="section-title-group">
                <h3 className="section-heading">3. Relevant Indian Laws</h3>
                <span className="section-sub">Statutes that may protect your rights</span>
              </div>
            </div>

            <div className="laws-list">
              {(guidance.relevantLaws || []).map((law) => (
                <div key={law.id} className="law-item-card">
                  <div className="law-item-top">
                    <h4 className="law-name">{law.act}</h4>
                    <span className="section-badge">{law.section}</span>
                  </div>
                  <p className="law-title-desc">{law.title}</p>
                  <p className="law-plain-meaning">
                    💡 <strong>What this means:</strong> {law.plainMeaning}
                  </p>
                  {law.penaltyOrRemedy && (
                    <div className="law-remedy-box">
                      <strong>Possible Remedy:</strong> {law.penaltyOrRemedy}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="section-bottom-link">
              <Link to={`/cases/${legalCase.id}/laws`} className="text-link-btn">
                Read full statutory section breakdowns →
              </Link>
            </div>
          </Card>

          {/* Section 4: Similar Court Precedents (Indian Kanoon API) */}
          <Card className="guidance-section-card">
            <div className="section-title-bar">
              <div className="section-icon-circle icon-precedents">
                <Scale size={18} />
              </div>
              <div className="section-title-group">
                <h3 className="section-heading">4. Similar Previous Court Judgments</h3>
                <span className="section-sub">Authentic Indian Kanoon judicial precedents matching your legal facts</span>
              </div>
            </div>

            <RelevantJudgments
              initialQuery={legalCase.title || legalCase.shortDescription || guidance.understoodSummary || ''}
              caseTitle={legalCase.title}
              showHeader={false}
              allowSearch={true}
              limit={5}
            />
          </Card>

          {/* Section 5: Documents / Evidence That May Be Useful */}
          <Card className="guidance-section-card">
            <div className="section-title-bar">
              <div className="section-icon-circle icon-docs">
                <FileText size={18} />
              </div>
              <h3 className="section-heading">5. Useful Documents & Evidence</h3>
            </div>
            <div className="useful-docs-grid">
              {(guidance.usefulDocuments || [
                'Tax Invoice / Cash Receipt',
                'Written Communications (Email/Chat)',
                'Proof of Delivery or Defect Photo/Video'
              ]).map((doc, idx) => (
                <div key={idx} className="useful-doc-chip">
                  <FileText size={16} className="useful-doc-icon" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Path Decision Box (Self-Help vs Lawyer) */}
        <div className="guidance-decision-col">
          <div className="decision-sticky-box">
            <h3 className="decision-box-title">Choose Your Next Step</h3>
            <p className="decision-box-subtitle">
              VidhiSetu supports two distinct paths depending on the severity of your dispute:
            </p>

            {/* Path A: Self-Help Mode */}
            <div className="decision-card self-help-card">
              <div className="decision-badge">FREE & EMPOWERING</div>
              <div className="decision-header">
                <div className="decision-icon-box icon-selfhelp">
                  <UserCheck size={22} />
                </div>
                <div>
                  <h4 className="decision-name">Option A: Self-Help Mode</h4>
                  <span className="decision-cost">Cost: ₹0 (Free)</span>
                </div>
              </div>
              <p className="decision-desc">
                Resolve the matter yourself using step-by-step statutory notice generators, grievance helpline portals (NCH/e-Daakhil), and automated timelines.
              </p>
              <ul className="decision-features">
                <li>✓ Step-by-step action plan</li>
                <li>✓ Pre-litigation notice guidance</li>
                <li>✓ Case deadline tracking</li>
              </ul>
              <Button
                variant="success"
                size="md"
                fullWidth
                icon={ArrowRight}
                iconPosition="right"
                onClick={handleSelectSelfHelp}
              >
                Proceed in Self-Help Mode
              </Button>
            </div>

            {/* Path B: Lawyer Consultation */}
            <div className="decision-card lawyer-card">
              <div className="decision-badge badge-premium">VERIFIED COUNSEL</div>
              <div className="decision-header">
                <div className="decision-icon-box icon-lawyer">
                  <Briefcase size={22} />
                </div>
                <div>
                  <h4 className="decision-name">Option B: Consult a Lawyer</h4>
                  <span className="decision-cost">Starts from ₹600 / session</span>
                </div>
              </div>
              <p className="decision-desc">
                Book a 1-on-1 audio/video consultation with a verified Indian advocate specializing in this specific practice area.
              </p>
              <ul className="decision-features">
                <li>✓ Bar Council verified advocates</li>
                <li>✓ Notice drafting & court representation</li>
                <li>✓ Case action plan & second opinions</li>
              </ul>
              <Button
                variant="primary"
                size="md"
                fullWidth
                icon={ArrowRight}
                iconPosition="right"
                onClick={handleSelectLawyer}
              >
                Find & Consult a Lawyer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
