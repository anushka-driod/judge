import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { legalService } from '../../services/legalService';
import { mockJudgmentsDatabase } from '../../data/mockData';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Loading } from '../../components/common/Loading';
import {
  Scale,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  BookOpen,
  FileText,
  User,
} from 'lucide-react';
import './LegalResearch.css';

export function JudgmentDetailsPage() {
  const { judgmentId } = useParams();
  const navigate = useNavigate();
  const [judgment, setJudgment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadJudgment() {
      setLoading(true);
      setError('');

      // Check if it's a seed mock ID first
      const mockFound = mockJudgmentsDatabase.find((j) => j.id === judgmentId);
      if (mockFound) {
        setJudgment({
          id: mockFound.id,
          title: mockFound.title,
          court: mockFound.court,
          publishDate: mockFound.year,
          citation: mockFound.citation,
          ratioDecidendi: mockFound.ratioDecidendi,
          verdict: mockFound.verdict,
          keyTakeaway: mockFound.keyTakeaway,
          similarity: mockFound.similarity,
          isMock: true,
        });
        setLoading(false);
        return;
      }

      // Otherwise, fetch authentic judgment from Indian Kanoon API
      try {
        const doc = await legalService.getJudgmentDocument(judgmentId);
        if (doc) {
          setJudgment(doc);
        } else {
          setError('Unable to locate the specified judgment on Indian Kanoon.');
        }
      } catch (err) {
        console.error(`[JudgmentDetailsPage] Fetch failed for ${judgmentId}:`, err);
        if (err.data?.code === 'TOKEN_MISSING') {
          setError(
            'Indian Kanoon API token is not yet configured on the backend. Please add INDIANKANOON_API_TOKEN to backend/.env to view live judgments.'
          );
        } else {
          setError(
            err.message || 'Unable to retrieve the judgment record from Indian Kanoon at this time.'
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadJudgment();
  }, [judgmentId]);

  if (loading) return <Loading text="Retrieving authentic court judgment from Indian Kanoon..." />;

  if (error || !judgment) {
    return (
      <div className="legal-research-page animate-fade-in">
        <div className="research-page-header">
          <Button
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
        <Alert type="danger">
          <span>{error || 'The requested judgment record could not be loaded.'}</span>
        </Alert>
        <div style={{ marginTop: '16px' }}>
          <Link to="/chat">
            <Button variant="primary">Return to AI Legal Assistant</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="legal-research-page animate-fade-in">
      <div className="research-page-header">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="back-nav-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Precedent Search
        </button>

        <div className="judgment-title-row">
          <h1 className="research-title">{judgment.title}</h1>
          {judgment.similarity ? (
            <Badge variant="success" size="md">
              {judgment.similarity} Precedent Similarity
            </Badge>
          ) : (
            <Badge variant="primary" size="md">
              Official Indian Kanoon Record
            </Badge>
          )}
        </div>

        <p className="research-subtitle">
          🏛️ {judgment.court}
          {judgment.publishDate && ` • Published: ${judgment.publishDate}`}
          {judgment.citation && ` • Citation: ${judgment.citation}`}
        </p>
      </div>

      {/* Source Transparency Alert */}
      <Alert type="info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} style={{ color: '#0284c7', flexShrink: 0 }} />
          <span>
            <strong>Official Judicial Source:</strong> This document represents a direct court record retrieved via the Indian Kanoon legal repository. It is a binding or persuasive precedent under Indian law, distinct from automated AI interpretations.
          </span>
        </div>
      </Alert>

      {/* If it's a seed mock case */}
      {judgment.isMock ? (
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
          </Card>
        </div>
      ) : (
        /* Real Indian Kanoon Document */
        <div className="judgment-details-card-container">
          <Card className="judgment-breakdown-card">
            {/* Metadata Bar */}
            <div className="judgment-meta-grid" style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '0.875rem'
            }}>
              {judgment.author && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} style={{ color: '#6366f1' }} />
                  <span><strong>Author/Judge:</strong> {judgment.author}</span>
                </div>
              )}
              {judgment.bench && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scale size={15} style={{ color: '#6366f1' }} />
                  <span><strong>Bench:</strong> {judgment.bench}</span>
                </div>
              )}
              {judgment.sourceUrl && (
                <a
                  href={judgment.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="judgment-external-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', fontWeight: 600, color: '#4f46e5' }}
                >
                  <span>Open on IndianKanoon.org</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            {/* Document Content */}
            <div className="judgment-section" style={{ marginTop: '20px' }}>
              <h3 className="judgment-section-title">
                <FileText size={20} className="sec-icon" /> Full Judgment Record
              </h3>
              <div
                className="judgment-fulltext-container"
                style={{
                  lineHeight: '1.7',
                  fontSize: '0.9375rem',
                  color: 'var(--text-primary, #1e293b)',
                  maxHeight: '650px',
                  overflowY: 'auto',
                  padding: '16px',
                  background: 'var(--card-bg-subtle, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                }}
                dangerouslySetInnerHTML={{ __html: judgment.fullText || '<p>Full judgment text available on Indian Kanoon.</p>' }}
              />
            </div>

            {/* Citations / References if available */}
            {judgment.citeList && judgment.citeList.length > 0 && (
              <div className="judgment-section" style={{ marginTop: '20px' }}>
                <h3 className="judgment-section-title">
                  <BookOpen size={18} className="sec-icon" /> Cited Statutes and Judgments ({judgment.citeList.length})
                </h3>
                <ul style={{ paddingLeft: '20px', margin: '8px 0', fontSize: '0.875rem' }}>
                  {judgment.citeList.slice(0, 10).map((c, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>
                      {typeof c === 'object' ? (
                        <Link to={`/judgments/${c.tid || c.id}`}>{c.title || c.citation || JSON.stringify(c)}</Link>
                      ) : (
                        <span>{String(c)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="judgment-footer-notice" style={{ marginTop: '24px' }}>
              <p>
                In Indian jurisprudence, judgments of the Supreme Court and superior High Courts form binding or persuasive precedents under Article 141 of the Constitution. You can cite this precedent during legal notice drafting or court representation.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default JudgmentDetailsPage;
