import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { legalService } from '../../services/legalService';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { Loading } from '../common/Loading';
import {
  Scale,
  Search,
  ExternalLink,
  BookOpen,
  Calendar,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import './RelevantJudgments.css';

/**
 * RelevantJudgments Component
 * Displays authentic judicial precedents and court judgments retrieved via Indian Kanoon API.
 * Handles Loading, Success, Empty, and User-Friendly Error states.
 */
export function RelevantJudgments({
  initialQuery = '',
  caseTitle = '',
  showHeader = true,
  allowSearch = true,
  limit = 10,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeSearchTerm, setActiveSearchTerm] = useState(initialQuery);
  const [judgments, setJudgments] = useState([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  // Formulate a clean legal search query from natural language or user query
  const formatSearchQuery = useCallback((raw) => {
    if (!raw) return '';
    // Strip common filler punctuation
    const clean = raw
      .replace(/[?!.,;:"'()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Keep first 8 meaningful words if too verbose
    const words = clean.split(' ').filter((w) => w.length > 2);
    return words.slice(0, 8).join(' ');
  }, []);

  const executeSearch = useCallback(async (searchTerm) => {
    const termToSearch = searchTerm ? searchTerm.trim() : '';
    if (!termToSearch) return;

    setLoading(true);
    setError('');
    setActiveSearchTerm(termToSearch);

    try {
      const response = await legalService.searchJudgments(termToSearch);
      const results = response?.results || [];
      setJudgments(results.slice(0, limit));
      setTotalFound(response?.totalFound || results.length);
      setSearched(true);
    } catch (err) {
      console.error('[RelevantJudgments] Search failure:', err);
      // User-friendly message without leaking credentials or stack traces
      if (err.data?.code === 'TOKEN_MISSING') {
        setError(
          'Indian Kanoon API access is pending token configuration in backend/.env. Please configure your INDIANKANOON_API_TOKEN to view live court precedents.'
        );
      } else {
        setError('Unable to retrieve legal sources right now. Please try again.');
      }
      setJudgments([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Trigger search on mount or when initialQuery changes
  useEffect(() => {
    const term = formatSearchQuery(initialQuery || caseTitle);
    if (term) {
      setQuery(term);
      executeSearch(term);
    }
  }, [initialQuery, caseTitle, formatSearchQuery, executeSearch]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      executeSearch(query);
    }
  };

  return (
    <div className="relevant-judgments-component">
      {showHeader && (
        <div className="rj-header">
          <div className="rj-header-title-group">
            <div className="rj-icon-badge">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="rj-title">Authentic Indian Court Judgments</h3>
              <p className="rj-subtitle">
                Live case precedents retrieved directly from the official Indian Kanoon database
              </p>
            </div>
          </div>
          <div className="rj-transparency-badge">
            <ShieldCheck size={14} />
            <span>Official Legal Source (Non-Fabricated)</span>
          </div>
        </div>
      )}

      {/* Optional Search / Refinement Bar */}
      {allowSearch && (
        <form onSubmit={handleManualSearch} className="rj-search-form">
          <div className="rj-search-input-wrapper">
            <Search size={16} className="rj-search-icon" />
            <input
              type="text"
              className="rj-search-input"
              placeholder="Search Indian court rulings, e.g. 'cheque bounce notice period', 'flat possession delay'..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="rj-clear-btn"
                onClick={() => setQuery('')}
                aria-label="Clear query"
              >
                ✕
              </button>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching…' : 'Search Precedents'}
          </Button>
        </form>
      )}

      {/* Active Search Context */}
      {activeSearchTerm && searched && !loading && (
        <div className="rj-search-context">
          <span>
            Showing results matching: <strong>"{activeSearchTerm}"</strong>
          </span>
          {totalFound > 0 && (
            <span className="rj-found-pill">{totalFound} Judgments Found</span>
          )}
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="rj-loading-state">
          <Loading text="Searching Indian Kanoon repository for binding precedents..." />
          <p className="rj-loading-hint">
            Querying Supreme Court, High Courts, and National Tribunals…
          </p>
        </div>
      )}

      {/* ERROR STATE */}
      {!loading && error && (
        <div className="rj-error-container">
          <Alert type="warning">
            <div className="rj-alert-content">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={() => executeSearch(query)}
              >
                Retry Search
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && searched && judgments.length === 0 && (
        <div className="rj-empty-state">
          <div className="rj-empty-icon">
            <BookOpen size={36} />
          </div>
          <h4 className="rj-empty-title">No relevant judgments found for this search.</h4>
          <p className="rj-empty-desc">
            Try adjusting your search terms or using broader legal keywords such as act names, dispute categories, or specific legal provisions.
          </p>
          {caseTitle && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const retryQuery = formatSearchQuery(caseTitle);
                setQuery(retryQuery);
                executeSearch(retryQuery);
              }}
            >
              Search Using Case Title
            </Button>
          )}
        </div>
      )}

      {/* SUCCESS STATE */}
      {!loading && !error && judgments.length > 0 && (
        <div className="rj-cards-grid">
          {judgments.map((item) => (
            <Card key={item.id} className="judgment-result-card animate-fade-in">
              <div className="judgment-card-header">
                <div className="judgment-court-row">
                  <span className="judgment-court-pill">🏛️ {item.court}</span>
                  {item.date && (
                    <span className="judgment-date-pill">
                      <Calendar size={12} /> {item.date}
                    </span>
                  )}
                </div>
                <span className="judgment-docid-tag">Kanoon #{item.id}</span>
              </div>

              <h4 className="judgment-card-title">{item.title}</h4>

              {item.citation && (
                <div className="judgment-citation-box">
                  <strong>Citation:</strong> {item.citation}
                </div>
              )}

              {item.snippet && (
                <div className="judgment-snippet-box">
                  <p className="judgment-snippet-text">
                    "{item.snippet.slice(0, 240)}
                    {item.snippet.length > 240 ? '…' : ''}"
                  </p>
                </div>
              )}

              <div className="judgment-card-footer">
                <Link
                  to={`/judgments/${item.id}`}
                  className="judgment-view-btn"
                >
                  <span>View Judgment Details</span>
                  <ChevronRight size={15} />
                </Link>

                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="judgment-external-link"
                  title="View official record on Indian Kanoon"
                >
                  <span>Indian Kanoon</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default RelevantJudgments;
