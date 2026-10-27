import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import { BASE_URL } from '../../services/api';
import {
  LifeBuoy,
  Scale,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Mail,
  User,
  Phone,
  ArrowLeft,
  Send,
  ShieldCheck,
  Bell,
  AlertCircle,
} from 'lucide-react';
import './AdminPages.css';

export function AdminSupportPage() {
  const { currentUser, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useUI();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');
      const url = statusFilter === 'all'
        ? `${BASE_URL}/admin/support`
        : `${BASE_URL}/admin/support?status=${statusFilter}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (data.tickets?.length > 0 && !selectedTicket) {
          setSelectedTicket(data.tickets[0]);
          setAdminNotes(data.tickets[0].admin_notes || data.tickets[0].adminNotes || '');
        }
      } else {
        showToast('Failed to load support requests. Admin authorization required.', 'error');
      }
    } catch (err) {
      console.warn('Error fetching support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const handleSelectTicket = (t) => {
    setSelectedTicket(t);
    setAdminNotes(t.admin_notes || t.adminNotes || '');
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('vidhisetu_auth_token') || localStorage.getItem('earnlaw_auth_token');
      const res = await fetch(`${BASE_URL}/admin/support/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Request ${selectedTicket.id} marked as ${newStatus}.`, 'success');
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus, admin_notes: adminNotes } : t))
        );
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus, admin_notes: adminNotes } : null));
      } else {
        showToast(data.error || 'Failed to update ticket.', 'error');
      }
    } catch (err) {
      showToast('Server error updating ticket status.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.id?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.user_email?.toLowerCase().includes(q) ||
      t.user_name?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    );
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div className="admin-verif-container">
      {/* Top Header Bar */}
      <header className="admin-header-bar">
        <div className="admin-header-left">
          <Link to="/admin/verification" className="admin-back-btn">
            <ArrowLeft size={14} /> Admin Hub
          </Link>
          <div className="admin-brand-title">
            <Scale size={20} className="admin-scale-icon" />
            <span>VIDHISETU</span>
            <span className="admin-badge">ADMIN</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Admin Session: <strong style={{ color: 'var(--accent-400)' }}>adminvidhisetu@gmail.com</strong>
          </span>
          <button className="btn-refresh-admin" onClick={fetchTickets} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="admin-main-grid">
        {/* Left Column: Tickets Queue */}
        <section className="admin-sidebar-col">
          <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <LifeBuoy size={18} color="var(--accent-400)" />
              Support Queue ({filteredTickets.length})
            </h2>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', gap: '6px', margin: '12px 0' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                background: statusFilter === 'all' ? 'var(--accent-500)' : 'var(--bg-surface-elevated)',
                color: statusFilter === 'all' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              All ({tickets.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                background: statusFilter === 'open' ? 'var(--accent-500)' : 'var(--bg-surface-elevated)',
                color: statusFilter === 'open' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                background: statusFilter === 'in_progress' ? 'var(--accent-500)' : 'var(--bg-surface-elevated)',
                color: statusFilter === 'in_progress' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Active ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                background: statusFilter === 'resolved' ? 'var(--accent-500)' : 'var(--bg-surface-elevated)',
                color: statusFilter === 'resolved' ? '#000' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by ID, name, email, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px 8px 30px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
              }}
            />
          </div>

          {/* Ticket List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading support tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No support requests in this queue.</div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    style={{
                      padding: '12px',
                      background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                      border: `1px solid ${isSelected ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-400)' }}>{t.id}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background:
                            t.status === 'open'
                              ? 'rgba(234, 179, 8, 0.15)'
                              : t.status === 'in_progress'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(34, 197, 94, 0.15)',
                          color:
                            t.status === 'open'
                              ? '#facc15'
                              : t.status === 'in_progress'
                              ? '#60a5fa'
                              : '#4ade80',
                        }}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t.subject}
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>{t.user_name || t.userName}</span>
                      <span>{new Date(t.created_at || t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Ticket Inspection & Admin Resolution */}
        <section className="admin-detail-col">
          {selectedTicket ? (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-400)', letterSpacing: '0.5px' }}>
                      {selectedTicket.id}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background:
                          selectedTicket.status === 'open'
                            ? 'rgba(234, 179, 8, 0.15)'
                            : selectedTicket.status === 'in_progress'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(34, 197, 94, 0.15)',
                        color:
                          selectedTicket.status === 'open'
                            ? '#facc15'
                            : selectedTicket.status === 'in_progress'
                            ? '#60a5fa'
                            : '#4ade80',
                      }}
                    >
                      {selectedTicket.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Category: <strong style={{ color: 'var(--text-primary)' }}>{selectedTicket.category}</strong>
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    {selectedTicket.subject}
                  </h2>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Filed: {new Date(selectedTicket.created_at || selectedTicket.createdAt).toLocaleString()}
                  </div>
                  {/* Notification Status Indicator */}
                  {selectedTicket.notification_sent ? (
                    <div style={{ fontSize: '0.75rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      <CheckCircle2 size={13} /> Admin Notified via Email
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#facc15', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }} title={selectedTicket.notification_error}>
                      <AlertCircle size={13} /> Notification Logged (Offline SMTP)
                    </div>
                  )}
                </div>
              </div>

              {/* User Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} color="var(--accent-400)" />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>User Name</div>
                    <strong style={{ fontSize: '0.85rem' }}>{selectedTicket.user_name || selectedTicket.userName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={16} color="var(--accent-400)" />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered Email</div>
                    <strong style={{ fontSize: '0.85rem' }}>{selectedTicket.user_email || selectedTicket.userEmail}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={16} color="var(--accent-400)" />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Phone</div>
                    <strong style={{ fontSize: '0.85rem' }}>{selectedTicket.user_phone || selectedTicket.userPhone || 'Not provided'}</strong>
                  </div>
                </div>
              </div>

              {/* Issue Description */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  User Inquiry & Issue Statement:
                </h4>
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedTicket.description}
                </div>
              </div>

              {/* Admin Resolution & Notes */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: 'var(--accent-400)' }}>
                  Administrative Action & Resolution Notes
                </h4>
                <textarea
                  rows={4}
                  placeholder="Record resolution findings, customer outreach notes, or internal tracking details..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    marginBottom: '16px',
                    outline: 'none',
                  }}
                />

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleUpdateStatus('in_progress')}
                    disabled={updating}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Mark In-Progress
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('resolved')}
                    disabled={updating}
                    style={{
                      padding: '8px 18px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    Resolve Request
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('closed')}
                    disabled={updating}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '6px',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Close Ticket
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a support ticket from the queue to view details and execute admin resolution.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminSupportPage;
