import React from 'react';
import { Badge } from './Badge';
import { CASE_STATUSES } from '../../utils/constants';
import { 
  Sparkles, 
  UserCheck, 
  Briefcase, 
  Clock, 
  Hourglass, 
  AlertCircle, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';

export function StatusBadge({ status, size = 'md', className = '' }) {
  let variant = 'neutral';
  let Icon = FileText;

  switch (status) {
    case CASE_STATUSES.NEW:
      variant = 'info';
      Icon = FileText;
      break;
    case CASE_STATUSES.AI_ANALYSIS:
      variant = 'primary';
      Icon = Sparkles;
      break;
    case CASE_STATUSES.GUIDANCE_PROVIDED:
      variant = 'info';
      Icon = Sparkles;
      break;
    case CASE_STATUSES.SELF_HELP:
      variant = 'success';
      Icon = UserCheck;
      break;
    case CASE_STATUSES.LAWYER_CONSULTATION:
      variant = 'primary';
      Icon = Briefcase;
      break;
    case CASE_STATUSES.ACTION_IN_PROGRESS:
      variant = 'warning';
      Icon = Clock;
      break;
    case CASE_STATUSES.WAITING_FOR_RESPONSE:
      variant = 'warning';
      Icon = Hourglass;
      break;
    case CASE_STATUSES.FOLLOW_UP_REQUIRED:
      variant = 'danger';
      Icon = AlertCircle;
      break;
    case CASE_STATUSES.RESOLVED:
      variant = 'success';
      Icon = CheckCircle2;
      break;
    default:
      variant = 'neutral';
      Icon = FileText;
  }

  return (
    <Badge variant={variant} size={size} icon={Icon} className={className}>
      {status || 'Unknown'}
    </Badge>
  );
}
