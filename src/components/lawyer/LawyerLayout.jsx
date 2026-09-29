import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { LawyerSidebar } from './LawyerSidebar';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import { ShieldCheck, MessageSquare, ExternalLink, RefreshCw } from 'lucide-react';
import './LawyerPortal.css';

export function LawyerLayout() {
  const [lawyer, setLawyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function loadLawyerSession() {
      try {
        const token =
          localStorage.getItem('vidhisetu_auth_token') ||
          localStorage.getItem('earnlaw_auth_token');

        if (!token) {
          navigate('/lawyer/login');
          return;
        }

        const res = await lawyerPortalClient.getMe();
        if (res && res.lawyer) {
          setLawyer(res.lawyer);
          localStorage.setItem('vidhisetu_lawyer_profile', JSON.stringify(res.lawyer));

          // If not verified, redirect to verification status page (unless already there)
          if (
            res.lawyer.verification_status !== 'VERIFIED' &&
            location.pathname !== '/lawyer/verification-status'
          ) {
            navigate('/lawyer/verification-status');
          }
        } else {
          // Fallback to cached profile if available
          const cached = localStorage.getItem('vidhisetu_lawyer_profile');
          if (cached) {
            setLawyer(JSON.parse(cached));
          } else {
            navigate('/lawyer/login');
          }
        }
      } catch (err) {
        console.warn('Session verification notice:', err.message);
        const cached = localStorage.getItem('vidhisetu_lawyer_profile');
        if (cached) {
          setLawyer(JSON.parse(cached));
        } else {
          navigate('/lawyer/login');
        }
      } finally {
        setLoading(false);
      }
    }

    loadLawyerSession();
  }, [location.pathname, navigate]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090d16',
          color: '#f8fafc',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <RefreshCw size={32} className="animate-spin" style={{ color: '#d4af37' }} />
        <p style={{ fontWeight: 600 }}>Securing Lawyer Chambers Session...</p>
      </div>
    );
  }

  return (
    <div className="lawyer-portal-shell">
      <LawyerSidebar lawyer={lawyer} />

      <div className="lp-main-wrapper">
        <header className="lp-topbar">
          <div className="lp-topbar-title">
            <h1>Chambers of {lawyer?.name || 'Advocate'}</h1>
            {lawyer?.verification_status === 'VERIFIED' && (
              <span className="lp-badge lp-badge-verified">
                <ShieldCheck size={13} /> ✓ VERIFIED LAWYER
              </span>
            )}
          </div>

          <div className="lp-topbar-actions">
            <Link to="/chat" className="lp-btn-action" title="Citizen AI Legal Guidance">
              <MessageSquare size={16} />
              <span>Citizen AI Assistant</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </header>

        <main className="lp-content-container">
          <Outlet context={{ lawyer, setLawyer }} />
        </main>
      </div>
    </div>
  );
}

export default LawyerLayout;
