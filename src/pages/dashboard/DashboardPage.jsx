import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCases } from '../../hooks/useCases';
import { useNotifications } from '../../hooks/useNotifications';
import { CaseCard } from '../../components/case/CaseCard';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatDate';
import {
  Sparkles,
  PlusCircle,
  Clock,
  CheckCircle2,
  Bell,
  Calendar,
  Files,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Briefcase,
} from 'lucide-react';
import './DashboardPage.css';

export function DashboardPage() {
  const { currentUser } = useAuth();
  const { cases, loading } = useCases();
  const { notifications } = useNotifications();

  const activeCases = cases.filter((c) => c.status !== 'Resolved');
  const resolvedCases = cases.filter((c) => c.status === 'Resolved');
  const unreadNotifications = notifications.filter((n) => !n.isRead);

  // Find upcoming consultations
  const activeConsultationCase = cases.find((c) => c.consultationBooking);

  return (
    <div className="dashboard-page animate-fade-in">
      {/* Welcome Hero Banner */}
      <section className="dashboard-hero">
        <div className="dashboard-hero-text">
          <span className="hero-greeting">
            Hello, {currentUser?.name || 'Citizen'} 👋
          </span>
          <h1 className="hero-title">What legal matter can we assist with today?</h1>
          <p className="hero-subtitle">
            VidhiSetu helps you understand your legal standing, discover Indian precedents, and prepare dispute action plans without complicated terminology.
          </p>
          <div className="dashboard-hero-actions">
            <Link to="/chat">
              <Button variant="primary" size="lg" icon={Sparkles}>
                Ask AI Legal Assistant
              </Button>
            </Link>
            <Link to="/cases/new">
              <Button variant="secondary" size="lg" icon={PlusCircle}>
                Register New Dispute
              </Button>
            </Link>
          </div>
        </div>

        <div className="dashboard-quick-stats">
          <div className="stat-pill">
            <div className="stat-number">{activeCases.length}</div>
            <div className="stat-label">Active Cases</div>
          </div>
          <div className="stat-pill">
            <div className="stat-number">{resolvedCases.length}</div>
            <div className="stat-label">Resolved</div>
          </div>
          <div className="stat-pill">
            <div className="stat-number">{unreadNotifications.length}</div>
            <div className="stat-label">Action Reminders</div>
          </div>
        </div>
      </section>

      {/* Grid: Main Cases Stream + Sidebar Widgets */}
      <div className="dashboard-layout-grid">
        {/* Left / Main Column */}
        <div className="dashboard-main-col">
          {/* Active Cases Section */}
          <div className="section-header-bar">
            <div>
              <h2 className="section-heading">Your Active Legal Cases</h2>
              <p className="section-subheading">Track ongoing guidance, self-help notices, and legal stages</p>
            </div>
            <Link to="/cases" className="view-all-link">
              View All ({cases.length}) <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="cases-grid">
              <div className="skeleton-loader" style={{ height: '220px', borderRadius: 'var(--radius-lg)' }} />
              <div className="skeleton-loader" style={{ height: '220px', borderRadius: 'var(--radius-lg)' }} />
            </div>
          ) : activeCases.length > 0 ? (
            <div className="cases-grid">
              {activeCases.map((c) => (
                <CaseCard key={c.id} legalCase={c} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No Active Legal Cases"
              description="You have no ongoing legal cases right now. Start by asking our AI Assistant or registering a new dispute."
              actionText="Start AI Assessment"
              onAction={() => window.location.href = '/chat'}
            />
          )}

          {/* Quick Problem Assessment Prompts */}
          <Card className="assessment-shortcuts-card">
            <div className="shortcuts-header">
              <div className="shortcuts-icon-box">
                <HelpCircle size={20} />
              </div>
              <div>
                <h3 className="card-title">Need help with a common Indian dispute?</h3>
                <p className="card-subtitle">Click below to start a tailored AI guidance conversation</p>
              </div>
            </div>
            <div className="shortcuts-chip-list">
              <Link to="/chat" className="shortcut-chip">
                <span>🛒 Product refund refused by e-commerce site</span>
              </Link>
              <Link to="/chat" className="shortcut-chip">
                <span>📑 Bounced cheque recovery (Sec 138 NI Act)</span>
              </Link>
              <Link to="/chat" className="shortcut-chip">
                <span>🏢 Builder delayed flat possession (RERA)</span>
              </Link>
              <Link to="/chat" className="shortcut-chip">
                <span>🏠 Landlord refusing security deposit refund</span>
              </Link>
              <Link to="/chat" className="shortcut-chip">
                <span>💼 Employer withheld salary or gratuity</span>
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Column: Widgets */}
        <div className="dashboard-aside-col">
          {/* Upcoming Consultation Widget */}
          {activeConsultationCase?.consultationBooking && (
            <Card className="widget-card consultation-widget">
              <div className="widget-header">
                <div className="widget-icon-box widget-icon-consult">
                  <Calendar size={18} />
                </div>
                <span className="widget-title">Upcoming Consultation</span>
              </div>
              <div className="consultation-widget-body">
                <h4 className="lawyer-booked-name">
                  {activeConsultationCase.consultationBooking.lawyerName}
                </h4>
                <p className="consultation-datetime">
                  📅 {formatDate(activeConsultationCase.consultationBooking.date)} at{' '}
                  {activeConsultationCase.consultationBooking.timeSlot}
                </p>
                <span className="consultation-mode-badge">
                  🎥 {activeConsultationCase.consultationBooking.mode}
                </span>
                <Link
                  to={`/consultation/confirmed/${activeConsultationCase.consultationBooking.bookingId}`}
                  className="w-full"
                >
                  <Button variant="outline" size="sm" fullWidth className="consult-details-btn">
                    View Meeting Pass & Instructions
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Urgent Reminders Widget */}
          <Card className="widget-card">
            <div className="widget-header">
              <div className="widget-icon-box widget-icon-bell">
                <Bell size={18} />
              </div>
              <span className="widget-title">Deadlines & Reminders</span>
            </div>
            <div className="widget-list">
              {notifications.slice(0, 3).map((notif) => (
                <div key={notif.id} className="widget-list-item">
                  <div className={`widget-dot dot-${notif.priority}`} />
                  <div className="widget-item-content">
                    <span className="widget-item-title">{notif.title}</span>
                    <p className="widget-item-sub">{notif.message}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="widget-footer">
              <Link to="/notifications" className="widget-footer-link">
                View All Reminders ({notifications.length}) →
              </Link>
            </div>
          </Card>

          {/* Document Management Shortcut */}
          <Card className="widget-card document-shortcut-widget">
            <div className="widget-header">
              <div className="widget-icon-box widget-icon-doc">
                <Files size={18} />
              </div>
              <span className="widget-title">Document Vault</span>
            </div>
            <p className="doc-widget-desc">
              Organize invoices, notices, and agreements for instant case evaluation.
            </p>
            <Link to="/documents">
              <Button variant="secondary" size="sm" fullWidth icon={Files}>
                Open Document Vault
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
