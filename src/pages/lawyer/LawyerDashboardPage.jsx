import React, { useState, useEffect } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  Users,
  Briefcase,
  Inbox,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  IndianRupee,
  AlertCircle,
  FileText,
  Video,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerDashboardPage() {
  const { lawyer } = useOutletContext();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await lawyerPortalClient.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.warn('Failed to load real dashboard metrics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAcceptRequest = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      await lawyerPortalClient.acceptRequest(requestId, 'Accepted for video consultation.');
      await fetchDashboard();
    } catch (err) {
      alert('Failed to accept request: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = window.prompt('Please provide a reason for declining this request:');
    if (reason === null) return;
    setActionLoadingId(requestId);
    try {
      await lawyerPortalClient.rejectRequest(requestId, reason || 'Scheduling conflict');
      await fetchDashboard();
    } catch (err) {
      alert('Failed to decline request: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const metrics = dashboard?.metrics || {
    totalClients: 0,
    activeCases: 0,
    pendingRequestsCount: 0,
    upcomingConsultationsCount: 0,
    unreadMessagesCount: 0,
    todaysAppointmentsCount: 0,
    followUpsCount: 0,
    totalEarnings: 0,
  };

  const recentRequests = dashboard?.recentRequests || [];
  const upcomingAppointments = dashboard?.upcomingAppointments || [];

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div
        className="lp-card"
        style={{
          background: 'linear-gradient(135deg, #101626 0%, #17223b 100%)',
          border: '1px solid #22304d',
          padding: '28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="lp-badge lp-badge-verified">
              <ShieldCheck size={14} /> ✓ VERIFIED COUNSEL
            </span>
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              Enrollment: {lawyer?.bar_registration_number || 'KAR/2012/5894'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px', color: '#fff' }}>
            WELCOME, {lawyer?.name ? lawyer.name.toUpperCase() : 'COUNSEL'}
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9375rem', maxWidth: '700px' }}>
            Authorized chambers workspace connected to Vidhi Setu AI, Indian Kanoon RAG Engine, and client consultation pipeline.
          </p>
        </div>
      </div>

      {/* Real Metrics Grid (No hardcoded values) */}
      <div className="lp-metrics-grid">
        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-gold">
            <Inbox size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>{metrics.pendingRequestsCount}</h3>
            <p>Pending Requests</p>
          </div>
        </div>

        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-blue">
            <Briefcase size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>{metrics.activeCases}</h3>
            <p>Active Cases</p>
          </div>
        </div>

        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-purple">
            <Calendar size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>{metrics.upcomingConsultationsCount}</h3>
            <p>Upcoming Consultations</p>
          </div>
        </div>

        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-blue">
            <MessageSquare size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>{metrics.unreadMessagesCount}</h3>
            <p>Unread Messages</p>
          </div>
        </div>

        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-green">
            <Clock size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>{metrics.todaysAppointmentsCount}</h3>
            <p>Today's Appointments</p>
          </div>
        </div>

        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-gold">
            <IndianRupee size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>₹{metrics.totalEarnings.toLocaleString('en-IN')}</h3>
            <p>Total Consultation Earnings</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Recent Consultation Requests */}
        <div className="lp-card">
          <div className="lp-card-header">
            <h3 className="lp-card-title">
              <Inbox size={20} color="#f59e0b" />
              <span>Recent Consultation Requests</span>
            </h3>
            <Link to="/lawyer/requests" style={{ fontSize: '0.8125rem', color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
              View All ({recentRequests.length})
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No pending consultation requests.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {recentRequests.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: '#101626',
                    border: '1px solid #22304d',
                    borderRadius: '10px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '0.9375rem', color: '#fff' }}>{req.clientName}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                        {req.caseTitle} • <span style={{ color: '#d4af37' }}>{req.category}</span>
                      </p>
                    </div>
                    <span className={`lp-badge lp-badge-${req.status === 'accepted' ? 'verified' : req.status === 'rejected' ? 'rejected' : 'pending'}`}>
                      {req.status.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ margin: '8px 0', fontSize: '0.8125rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                    {req.shortSummary}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '12px' }}>
                      <span>📅 {req.requestedDate}</span>
                      <span>⏰ {req.requestedTime}</span>
                      <strong style={{ color: '#34d399' }}>₹{req.feeAmount}</strong>
                    </div>

                    {req.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(req.id)}
                          disabled={actionLoadingId === req.id}
                          className="lp-btn-action"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#059669', color: '#fff', border: 'none' }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req.id)}
                          disabled={actionLoadingId === req.id}
                          className="lp-btn-action"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#f87171' }}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <Link
                        to={`/lawyer/cases/${req.caseId}`}
                        style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}
                      >
                        Open Case Workspace →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Appointments & Actions */}
        <div className="lp-card">
          <div className="lp-card-header">
            <h3 className="lp-card-title">
              <Calendar size={20} color="#3b82f6" />
              <span>Upcoming Consultations</span>
            </h3>
            <Link to="/lawyer/calendar" style={{ fontSize: '0.8125rem', color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
              Full Schedule
            </Link>
          </div>

          {upcomingAppointments.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No upcoming sessions scheduled.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingAppointments.slice(0, 3).map((app) => (
                <div
                  key={app.id}
                  style={{
                    background: '#101626',
                    border: '1px solid #22304d',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: '#fff' }}>{app.clientName}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                      {app.requestedDate} at {app.requestedTime} ({app.consultationType})
                    </div>
                  </div>

                  <Link
                    to={`/lawyer/cases/${app.caseId}`}
                    className="lp-btn-action lp-btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    <Video size={13} />
                    <span>Workspace</span>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Quick Access to Cases */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #22304d' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.875rem', color: '#fff', fontWeight: 700 }}>
              Chambers Quick Jump
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Link
                to="/lawyer/cases"
                className="lp-btn-action"
                style={{ justifyContent: 'center', padding: '10px', fontSize: '0.8125rem' }}
              >
                <Briefcase size={16} /> All Active Cases
              </Link>
              <Link
                to="/lawyer/earnings"
                className="lp-btn-action"
                style={{ justifyContent: 'center', padding: '10px', fontSize: '0.8125rem' }}
              >
                <IndianRupee size={16} /> Consultation Earnings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LawyerDashboardPage;
