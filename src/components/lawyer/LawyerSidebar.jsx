import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Scale,
  LayoutDashboard,
  Inbox,
  Briefcase,
  Calendar,
  MessageSquare,
  IndianRupee,
  UserCheck,
  ShieldCheck,
  LogOut,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import './LawyerPortal.css';

export function LawyerSidebar({ lawyer, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('vidhisetu_auth_token');
    localStorage.removeItem('earnlaw_auth_token');
    localStorage.removeItem('vidhisetu_user_role');
    localStorage.removeItem('vidhisetu_lawyer_profile');
    if (onLogout) onLogout();
    navigate('/lawyer/login');
  };

  const isVerified = lawyer?.verification_status === 'VERIFIED';

  return (
    <aside className="lp-sidebar">
      <div className="lp-sidebar-header">
        <NavLink to="/lawyer/dashboard" className="lp-brand">
          <div className="lp-brand-icon">
            <Scale size={24} />
          </div>
          <div className="lp-brand-text">
            <h2>VIDHI SETU</h2>
            <span className="lp-brand-badge">LAWYER PORTAL</span>
          </div>
        </NavLink>

        {isVerified ? (
          <div className="lp-verified-indicator">
            <ShieldCheck size={14} />
            <span>✓ VERIFIED LAWYER</span>
          </div>
        ) : (
          <div
            className="lp-verified-indicator"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              borderColor: 'rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
            }}
          >
            <span>STATUS: {lawyer?.verification_status || 'PENDING'}</span>
          </div>
        )}
      </div>

      <nav className="lp-sidebar-nav">
        <NavLink
          to="/lawyer/dashboard"
          className={({ isActive }) => `lp-nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/lawyer/requests"
          className={({ isActive }) => `lp-nav-item ${isActive ? 'active' : ''}`}
        >
          <Inbox size={18} />
          <span>Consultation Requests</span>
        </NavLink>

        <NavLink
          to="/lawyer/cases"
          className={({ isActive }) => `lp-nav-item ${isActive ? 'active' : ''}`}
        >
          <Briefcase size={18} />
          <span>Authorized Cases</span>
        </NavLink>

        <NavLink
          to="/lawyer/calendar"
          className={({ isActive }) => `lp-nav-item ${isActive ? 'active' : ''}`}
        >
          <Calendar size={18} />
          <span>Calendar & Slots</span>
        </NavLink>

        <NavLink
          to="/lawyer/messages"
          className={({ isActive }) => `lp-nav-item ${isActive ? 'active' : ''}`}
        >
          <MessageSquare size={18} />
          <span>Messages & Chat</span>
        </NavLink>

        <NavLink
          to="/lawyer/earnings"
          className={({ isActive }) => `lp-nav-item ${isActive ? 'active' : ''}`}
        >
          <IndianRupee size={18} />
          <span>Earnings & Payouts</span>
        </NavLink>

        <NavLink
          to="/lawyer/profile"
          className={({ isActive }) => `lp-nav-item ${isActive ? 'active' : ''}`}
        >
          <UserCheck size={18} />
          <span>Chambers & Fees</span>
        </NavLink>
      </nav>

      <div className="lp-sidebar-footer">
        <div className="lp-lawyer-mini-card">
          <img
            src={
              lawyer?.photoUrl ||
              'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=400'
            }
            alt={lawyer?.name || 'Advocate'}
            className="lp-lawyer-avatar"
          />
          <div className="lp-lawyer-info">
            <h4 className="lp-lawyer-name">{lawyer?.name || 'Advocate'}</h4>
            <p className="lp-lawyer-bar-no">
              {lawyer?.bar_registration_number || 'Bar Council Enrolled'}
            </p>
          </div>
        </div>

        <button type="button" className="lp-btn-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default LawyerSidebar;
