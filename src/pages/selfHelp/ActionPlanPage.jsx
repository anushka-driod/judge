import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCases } from '../../hooks/useCases';
import { useUI } from '../../hooks/useUI';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Loading } from '../../components/common/Loading';
import { formatDate } from '../../utils/formatDate';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ArrowLeft,
  ArrowRight,
  ListTodo,
  Calendar,
  Sparkles,
} from 'lucide-react';
import './ActionPlan.css';

export function ActionPlanPage() {
  const { caseId } = useParams();
  const { getCaseById, updateActionStatus } = useCases();
  const { showToast } = useUI();

  const [legalCase, setLegalCase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getCaseById(caseId);
      setLegalCase(data);
      setLoading(false);
    }
    load();
  }, [caseId, getCaseById]);

  const handleToggleStatus = async (actionId, currentStatus) => {
    let nextStatus = 'In Progress';
    if (currentStatus === 'In Progress') nextStatus = 'Completed';
    else if (currentStatus === 'Completed') nextStatus = 'Not Started';

    try {
      const updated = await updateActionStatus(caseId, actionId, nextStatus);
      setLegalCase(updated);
      showToast(`Action updated to "${nextStatus}"`, 'success');
    } catch (err) {
      showToast('Failed to update action: ' + err.message, 'danger');
    }
  };

  if (loading) return <Loading text="Loading customized dispute action plan..." />;
  if (!legalCase) return <div>Case action plan not found</div>;

  const actions = legalCase.actionPlan || [];
  const completedCount = actions.filter((a) => a.status === 'Completed').length;
  const progressPercent = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;

  return (
    <div className="action-plan-page animate-fade-in">
      <Link to={`/cases/${caseId}`} className="back-nav-link">
        <ArrowLeft size={16} /> Back to Case Hub
      </Link>

      <div className="action-plan-header">
        <div className="plan-header-title-box">
          <div className="plan-icon-badge">
            <ListTodo size={24} />
          </div>
          <div>
            <h1 className="plan-title">Legal Action Plan: {legalCase.title}</h1>
            <p className="plan-subtitle">
              Prioritized step-by-step checklist to assert your rights under Indian dispute resolution mechanisms.
            </p>
          </div>
        </div>

        <div className="plan-progress-pill">
          <div className="progress-text-row">
            <span>Overall Plan Progress:</span>
            <strong>{progressPercent}% ({completedCount}/{actions.length} Completed)</strong>
          </div>
          <div className="plan-progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="action-items-stream">
        {actions.map((act, index) => {
          const isDone = act.status === 'Completed';
          const isInProg = act.status === 'In Progress';

          let statusBadgeVariant = 'neutral';
          if (isDone) statusBadgeVariant = 'success';
          else if (isInProg) statusBadgeVariant = 'warning';

          return (
            <Card
              key={act.id}
              className={`action-item-card ${isDone ? 'action-done' : ''}`}
            >
              <div className="action-card-header-row">
                <div className="action-number-title">
                  <span className="action-step-badge">Step {index + 1}</span>
                  <h3 className={`action-item-title ${isDone ? 'title-done' : ''}`}>
                    {act.title}
                  </h3>
                </div>
                <div className="action-status-wrapper">
                  <Badge variant={statusBadgeVariant}>{act.status}</Badge>
                </div>
              </div>

              <div className="action-body-details">
                {/* Why It Matters */}
                <div className="action-sub-block why-block">
                  <span className="sub-block-label">
                    <Sparkles size={14} /> Why this step matters:
                  </span>
                  <p>{act.whyItMatters}</p>
                </div>

                {/* Required Documents / Evidence */}
                {act.requiredDocument && (
                  <div className="action-sub-block doc-needed-block">
                    <span className="sub-block-label">
                      <FileText size={14} /> Required Document / Proof:
                    </span>
                    <span className="doc-needed-badge">{act.requiredDocument}</span>
                  </div>
                )}

                {/* Deadline */}
                {act.deadline && (
                  <div className="action-sub-block deadline-block">
                    <span className="sub-block-label">
                      <Calendar size={14} /> Statutory / Recommended Target Date:
                    </span>
                    <strong className="deadline-date">{formatDate(act.deadline)}</strong>
                  </div>
                )}
              </div>

              <div className="action-item-footer">
                <Button
                  variant={isDone ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => handleToggleStatus(act.id, act.status)}
                  icon={CheckCircle2}
                >
                  {isDone ? 'Mark as In Progress' : 'Mark as Completed'}
                </Button>
                <Link to="/documents">
                  <Button variant="ghost" size="sm" icon={FileText}>
                    Attach Proof from Document Vault
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
