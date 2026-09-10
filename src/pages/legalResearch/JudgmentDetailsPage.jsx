import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockJudgmentsDatabase } from '../../data/mockData';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Loading } from '../../components/common/Loading';
import { Scale, ArrowLeft, CheckCircle2, BookOpen } from 'lucide-react';
import './LegalResearch.css';

export function JudgmentDetailsPage() {
  const { judgmentId } = useParams();
  const [judgment, setJudgment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Look up judgment
    const found = mockJudgmentsDatabase.find((j) => j.id === judgmentId) || mockJudgmentsDatabase[0];
    setJudgment(found);
    setLoading(false);
  }, [judgmentId]);

  if (loading) return <Loading text="Loading landmark judgment record..." />;

  return (
    <div className="legal-research-page animate-fade-in">
      <div className="research-page-header">
        <Link to="/dashboard" className="back-nav-link">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="judgment-title-row">
          <h1 className="research-title">{judgment.title}</h1>
          <Badge variant="success" size="md">
            {judgment.similarity} Precedent Similarity
          </Badge>
        </div>
        <p className="research-subtitle">
          {judgment.court} • Citation: {judgment.citation} ({judgment.year})
        </p>
      </div>

      <div className="judgment-details-card-container">
        <Card className="judgment-breakdown-card">
          <div className="judgment-section">
            <h3 className="judgment-section-title">
              <Scale size={20} className="sec-icon" /> Core Precedent Ratio Decidendi
            </h3>
            <p className="judgment-ratio-text">"{judgment.ratioDecidendi}"</p>
          </div>

          <div className="judgment-section">
            <h3 className="judgment-section-title">
              <CheckCircle2 size={20} className="sec-icon" /> What the Court Ruled (Verdict)
            </h3>
            <p className="judgment-verdict-text">{judgment.verdict}</p>
          </div>

          <div className="judgment-section highlight-takeaway-section">
            <h3 className="judgment-section-title">
              💡 Why This Matters For Your Case
            </h3>
            <p className="judgment-takeaway-text">{judgment.keyTakeaway}</p>
          </div>

          <div className="judgment-footer-notice">
            <p>
              In Indian jurisprudence, judgments of the Supreme Court and superior appellate tribunals form binding or persuasive precedents under Article 141 of the Constitution. You can cite this precedent during legal notice drafting or court representation.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
