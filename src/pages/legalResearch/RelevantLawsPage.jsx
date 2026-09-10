import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { aiLegalService } from '../../services/aiLegalService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Loading } from '../../components/common/Loading';
import { BookOpen, Scale, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import './LegalResearch.css';

export function RelevantLawsPage() {
  const { caseId } = useParams();
  const [laws, setLaws] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLaws() {
      const data = await aiLegalService.getRelevantLaws(caseId);
      setLaws(data);
      setLoading(false);
    }
    loadLaws();
  }, [caseId]);

  if (loading) return <Loading text="Loading relevant Indian statutes..." />;

  return (
    <div className="legal-research-page animate-fade-in">
      <div className="research-page-header">
        <Link to={`/cases/${caseId}/guidance`} className="back-nav-link">
          <ArrowLeft size={16} /> Back to Case Guidance
        </Link>
        <h1 className="research-title">Applicable Indian Statutes & Sections</h1>
        <p className="research-subtitle">
          Simplified statutory explanations to help citizens understand their legal rights and penalties.
        </p>
      </div>

      <Alert type="info">
        <span>
          <strong>Citizen Clarification:</strong> Statutory law in India outlines rights, liabilities, and required procedures. The provisions below have been identified as relevant to your dispute.
        </span>
      </Alert>

      <div className="research-cards-grid">
        {laws.map((law) => (
          <Card key={law.id} className="statute-full-card">
            <div className="statute-header">
              <div className="statute-badge-box">
                <BookOpen size={20} className="statute-icon" />
                <span className="statute-section-tag">{law.section}</span>
              </div>
              <span className="statute-forum-pill">🏛️ {law.forum}</span>
            </div>

            <h3 className="statute-act-name">{law.act}</h3>
            <h4 className="statute-title">{law.title}</h4>

            <div className="statute-content-block">
              <span className="statute-block-label">Statutory Summary:</span>
              <p>{law.summary}</p>
            </div>

            <div className="statute-content-block plain-meaning-block">
              <span className="statute-block-label">💡 Plain English Meaning for You:</span>
              <p>{law.plainMeaning}</p>
            </div>

            {law.penaltyOrRemedy && (
              <div className="statute-content-block remedy-block">
                <span className="statute-block-label">⚖️ Statutory Relief / Remedy:</span>
                <p>{law.penaltyOrRemedy}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="research-footer-cta">
        <Link to={`/cases/${caseId}/self-help`}>
          <Button variant="success" size="lg" icon={ArrowRight} iconPosition="right">
            Proceed with Self-Help Action Plan
          </Button>
        </Link>
        <Link to={`/cases/${caseId}/lawyers`}>
          <Button variant="primary" size="lg" icon={Scale}>
            Consult an Advocate on These Statutes
          </Button>
        </Link>
      </div>
    </div>
  );
}
