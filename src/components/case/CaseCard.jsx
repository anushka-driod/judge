import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../common/StatusBadge';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { formatDate } from '../../utils/formatDate';
import { ArrowRight, Clock, AlertCircle } from 'lucide-react';
import './CaseCard.css';

export function CaseCard({ legalCase }) {
  if (!legalCase) return null;

  const targetLink =
    legalCase.status === 'Guidance Provided' || legalCase.status === 'New'
      ? `/cases/${legalCase.id}/guidance`
      : `/cases/${legalCase.id}`;

  return (
    <Card hoverable className="case-card">
      <div className="case-card-header">
        <span className="case-category-tag">{legalCase.category}</span>
        <StatusBadge status={legalCase.status} />
      </div>

      <h4 className="case-card-title">{legalCase.title}</h4>
      <p className="case-card-desc">{legalCase.shortDescription}</p>

      {legalCase.nextAction && (
        <div className="case-next-action-box">
          <div className="next-action-header">
            <AlertCircle size={14} className="next-action-icon" />
            <span className="next-action-label">Next Action:</span>
          </div>
          <p className="next-action-text">{legalCase.nextAction}</p>
        </div>
      )}

      <div className="case-card-meta">
        <div className="case-meta-item">
          <Clock size={14} />
          <span>Opened: {formatDate(legalCase.createdAt)}</span>
        </div>
        {legalCase.nextActionDeadline && (
          <span className="case-deadline-badge">
            Due: {formatDate(legalCase.nextActionDeadline)}
          </span>
        )}
      </div>

      <div className="case-card-footer">
        <Link to={targetLink} className="w-full">
          <Button variant="outline" size="sm" fullWidth icon={ArrowRight} iconPosition="right">
            View Case Details
          </Button>
        </Link>
      </div>
    </Card>
  );
}
