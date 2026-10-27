import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { legalService } from '../../services/legalService';
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
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';
import './LegalResearch.css';

export function JudgmentDetailsPage() {
  const { judgmentId } = useParams();
  const navigate = useNavigate();
  const [judgment, setJudgment] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadJudgment() {
      setLoading(true);
      setError('');

      try {
        const doc = await legalService.getJudgmentDocument(judgmentId);
        if (doc) {
          setJudgment(doc);

          // Asynchronously load case-specific ratio breakdown
          try {
            setAnalysisLoading(true);
            const caseAnalysis = await legalService.analyzeJudgment(judgmentId);
            setAnalysis(caseAnalysis);
          } catch (aErr) {
            console.warn('[JudgmentDetailsPage] Case analysis fetch skipped:', aErr.message);
          } finally {
            setAnalysisLoading(false);
          }
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

  const handleDownloadPdf = () => {
    const url = legalService.getJudgmentPdfUrl(judgmentId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    window.print();
  };

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

            {/* AI Case Analysis & Ratio Breakdown Section */}
            {analysis && (
              <div className="judgment-analysis-section" style={{
                marginTop: '20px',
                padding: '20px',
                background: 'rgba(217, 119, 6, 0.04)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <h3 className="judgment-section-title" style={{ margin: 0, color: 'var(--text-primary)' }}>
                    <Sparkles size={20} className="sec-icon" style={{ color: '#d97706' }} /> Case Analysis & Ratio Decidendi
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Download}
                      onClick={handleDownloadPdf}
                    >
                      Download Case Analysis PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Printer}
                      onClick={handlePrint}
                    >
                      Print Dossier
                    </Button>
                  </div>
                </div>

                {analysis.teluguSummary && (
                  <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', marginBottom: '16px', borderLeft: '4px solid #10b981' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9375rem', color: '#065f46' }}>తెలుగు సారాంశం (Telugu Breakdown)</h4>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem' }}>{analysis.teluguSummary.holding}</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{analysis.teluguSummary.outcome}</p>
                  </div>
                )}

                {/* Ratio Decidendi */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                    ⚖️ Core Precedent Ratio Decidendi:
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    "{analysis.holding}"
                  </p>
                </div>

                {/* Final Verdict */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                    🏛️ Final Outcome / Judicial Order:
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                    {analysis.finalOutcome}
                  </p>
                </div>

                {/* Facts of Case */}
                {analysis.facts && analysis.facts.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                      📋 Adjudicated Facts & Procedural History:
                    </h4>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {analysis.facts.map((fact, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Legal Issues */}
                {analysis.legalIssues && analysis.legalIssues.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                      🔍 Substantial Questions of Law / Issues:
                    </h4>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {analysis.legalIssues.map((issue, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Judicial Reasoning */}
                {analysis.reasoning && analysis.reasoning.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                      🧠 Court's Legal Reasoning:
                    </h4>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {analysis.reasoning.map((r, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

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
