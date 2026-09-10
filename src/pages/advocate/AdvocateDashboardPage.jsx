import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  Scale,
  ShieldCheck,
  Users,
  Calendar,
  FileCheck,
  MessageSquare,
  Star,
  CheckCircle,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import './AdvocatePages.css';

export function AdvocateDashboardPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const advocate = currentUser?.advocateDetails || {};

  return (
    <div className="advocate-dashboard-container animate-fade-in">
      <header className="advocate-header-strip">
        <div className="advocate-brand-logo">
          <Scale size={24} className="scale-icon" />
          <span className="brand-name">VidhiSetu Advocate Chambers</span>
          <span className="verified-badge-pill">
            <ShieldCheck size={14} /> Verified Counsel
          </span>
        </div>
        <div className="advocate-header-actions">
          <Link to="/chat" className="btn-open-chat">
            <MessageSquare size={16} />
            <span>Open AI Legal Research</span>
          </Link>
          <button type="button" className="btn-status-logout" onClick={logout}>
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="advocate-dashboard-main">
        {/* Welcome Hero */}
        <section className="advocate-chambers-hero">
          <div className="chambers-welcome-text">
            <span className="chambers-tag">Bar Council Verified Advocate</span>
            <h1 className="chambers-title">Welcome, {currentUser?.name || 'Advocate'}</h1>
            <p className="chambers-subtitle">
              Enrollment: <strong>{advocate.enrollmentNumber || 'KAR/1842/2014'}</strong> •{' '}
              {advocate.barCouncil || 'Bar Council of Karnataka'} • {currentUser?.city || 'Bengaluru'}
            </p>
          </div>
          <div className="chambers-rating-box">
            <div className="rating-star-row">
              <Star size={20} className="star-filled" />
              <span className="rating-number">4.9 / 5.0</span>
            </div>
            <span className="rating-count">Verified Client Trust Score</span>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <div className="advocate-stats-grid">
          <Card className="stat-card">
            <div className="stat-icon icon-clients">
              <Users size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-number">14</span>
              <span className="stat-label">Assigned Citizen Matters</span>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon icon-calendar">
              <Calendar size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-number">3</span>
              <span className="stat-label">Consultations Today</span>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon icon-notices">
              <FileCheck size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-number">6</span>
              <span className="stat-label">Statutory Demand Notices</span>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="stat-icon icon-verified">
              <ShieldCheck size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-number">Active</span>
              <span className="stat-label">Marketplace Directory Status</span>
            </div>
          </Card>
        </div>

        {/* Active Client Consultations */}
        <div className="advocate-content-split">
          <Card className="chambers-schedule-card">
            <div className="card-header-flex">
              <h3 className="card-title">Upcoming Client Video Consultations</h3>
              <span className="badge-count">3 Scheduled</span>
            </div>
            <div className="consultations-schedule-list">
              <div className="schedule-item">
                <div className="sched-time-box">
                  <span className="time-val">02:00 PM</span>
                  <span className="time-date">Today</span>
                </div>
                <div className="sched-client-details">
                  <strong>Ramesh Kumar</strong>
                  <span>Case: Cheque Dishonour under NI Act Sec 138 (₹14,50,000)</span>
                </div>
                <Link to="/consultation/confirmed/book-901" className="btn-join-chambers">
                  Join Room <ExternalLink size={13} />
                </Link>
              </div>

              <div className="schedule-item">
                <div className="sched-time-box">
                  <span className="time-val">04:30 PM</span>
                  <span className="time-date">Today</span>
                </div>
                <div className="sched-client-details">
                  <strong>Aarav Mehta</strong>
                  <span>Case: Builder RERA Delay & Refund Petition</span>
                </div>
                <button type="button" className="btn-join-chambers btn-disabled" disabled>
                  Starts 04:25 PM
                </button>
              </div>
            </div>
          </Card>

          <Card className="chambers-notices-card">
            <h3 className="card-title">Pre-Litigation Action Plans to Approve</h3>
            <div className="draft-reviews-list">
              <div className="draft-review-item">
                <div className="draft-info">
                  <strong>15-Day Demand Notice Draft</strong>
                  <span>Client: Priya Rao • Security Deposit retention</span>
                </div>
                <Button variant="primary" size="sm">
                  Review & Sign
                </Button>
              </div>

              <div className="draft-review-item">
                <div className="draft-info">
                  <strong>Consumer Dispute Affidavit</strong>
                  <span>Client: Sneha Patil • E-Commerce Deficiency</span>
                </div>
                <Button variant="secondary" size="sm">
                  Review
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
