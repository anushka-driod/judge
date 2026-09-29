import React from 'react';
import { FolderSearch } from 'lucide-react';
import { Button } from './Button';
import './EmptyState.css';

export function EmptyState({
  icon: Icon = FolderSearch,
  title = 'No items found',
  description = 'There are currently no items to display in this view.',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon-wrapper">
        <Icon className="empty-state-icon" size={32} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {(actionText || secondaryActionText) && (
        <div className="empty-state-actions">
          {actionText && (
            <Button variant="primary" onClick={onAction}>
              {actionText}
            </Button>
          )}
          {secondaryActionText && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
