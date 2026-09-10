import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCases } from '../../hooks/useCases';
import { CaseCard } from '../../components/case/CaseCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';
import { CASE_STATUSES } from '../../utils/constants';
import { PlusCircle, Search, Filter, Briefcase } from 'lucide-react';
import './Cases.css';

export function CasesListPage() {
  const { cases, loading } = useCases();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const statusFilters = ['ALL', ...Object.values(CASE_STATUSES)];

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="cases-list-page animate-fade-in">
      <div className="cases-list-header">
        <div>
          <h1 className="cases-list-title">My Legal Cases ({cases.length})</h1>
          <p className="cases-list-subtitle">
            Manage your ongoing statutory disputes, track deadlines, and review action milestones.
          </p>
        </div>

        <Link to="/cases/new">
          <Button variant="primary" size="md" icon={PlusCircle}>
            Start New Dispute
          </Button>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="cases-filters-container">
        <div className="cases-search-box">
          <Input
            placeholder="Search cases by title, category, or keyword..."
            icon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="status-pills-row">
          <span className="filter-label"><Filter size={14} /> Filter:</span>
          {statusFilters.map((st) => (
            <button
              key={st}
              type="button"
              className={`status-filter-pill ${selectedStatus === st ? 'pill-active' : ''}`}
              onClick={() => setSelectedStatus(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Grid */}
      {loading ? (
        <div className="cases-cards-grid">
          <div className="skeleton-loader" style={{ height: '240px' }} />
          <div className="skeleton-loader" style={{ height: '240px' }} />
        </div>
      ) : filteredCases.length > 0 ? (
        <div className="cases-cards-grid">
          {filteredCases.map((c) => (
            <CaseCard key={c.id} legalCase={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title="No cases match your filters"
          description="Try clearing your search query or selecting another status filter."
          actionText="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedStatus('ALL');
          }}
        />
      )}
    </div>
  );
}
