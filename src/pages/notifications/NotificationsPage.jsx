import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate, formatRelativeTime } from '../../utils/formatDate';
import {
  Bell,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCheck,
} from 'lucide-react';
import './Notifications.css';

export function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [filterType, setFilterType] = useState('ALL');

  const filteredNotifs = notifications.filter((n) => {
    if (filterType === 'UNREAD') return !n.isRead;
    if (filterType === 'DEADLINES') return n.type === 'deadline';
    if (filterType === 'CONSULTATIONS') return n.type === 'consultation';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'deadline': return AlertTriangle;
      case 'consultation': return Calendar;
      case 'guidance': return Sparkles;
      default: return Bell;
    }
  };

  return (
    <div className="notifications-page animate-fade-in">
      <div className="notifications-header">
        <div>
          <h1 className="notifications-title">Reminders & Case Alerts</h1>
          <p className="notifications-subtitle">
            Critical statutory deadlines, consultation time slots, and legal updates.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={markAllAsRead} icon={CheckCheck}>
          Mark All as Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filters-bar">
        <button
          type="button"
          className={`notif-filter-pill ${filterType === 'ALL' ? 'pill-active' : ''}`}
          onClick={() => setFilterType('ALL')}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          className={`notif-filter-pill ${filterType === 'UNREAD' ? 'pill-active' : ''}`}
          onClick={() => setFilterType('UNREAD')}
        >
          Unread ({notifications.filter((n) => !n.isRead).length})
        </button>
        <button
          type="button"
          className={`notif-filter-pill ${filterType === 'DEADLINES' ? 'pill-active' : ''}`}
          onClick={() => setFilterType('DEADLINES')}
        >
          Deadlines & Limitation
        </button>
        <button
          type="button"
          className={`notif-filter-pill ${filterType === 'CONSULTATIONS' ? 'pill-active' : ''}`}
          onClick={() => setFilterType('CONSULTATIONS')}
        >
          Consultations
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifs.length > 0 ? (
        <div className="notifs-stream">
          {filteredNotifs.map((item) => {
            const Icon = getIcon(item.type);
            return (
              <Card
                key={item.id}
                className={`notif-item-card ${!item.isRead ? 'notif-unread' : ''}`}
                onClick={() => markAsRead(item.id)}
              >
                <div className={`notif-icon-box icon-type-${item.type}`}>
                  <Icon size={20} />
                </div>

                <div className="notif-content-info">
                  <div className="notif-top-line">
                    <h3 className="notif-item-title">{item.title}</h3>
                    <span className="notif-relative-time">
                      {formatRelativeTime(item.date)}
                    </span>
                  </div>

                  <p className="notif-message-text">{item.message}</p>

                  <div className="notif-bottom-row">
                    {item.caseId && (
                      <Link
                        to={`/cases/${item.caseId}`}
                        className="notif-case-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open Case Dossier <ArrowRight size={14} />
                      </Link>
                    )}
                    {!item.isRead && <span className="new-badge-dot">● New</span>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="All Caught Up!"
          description="You have no pending deadlines or unread notifications at the moment."
        />
      )}
    </div>
  );
}
