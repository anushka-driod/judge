import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  Scale,
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  FileCheck,
  RefreshCw,
  LogOut,
  Mail,
  ArrowRight,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerVerificationStatusPage() {
  const navigate = useNavigate();
  const [lawyer, setLawyer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await lawyerPortalClient.getMe();
      if (res && res.lawyer) {
        setLawyer(res.lawyer);
        if (res.lawyer.verification_status === 'VERIFIED') {
          navigate('/lawyer/dashboard');
        }
      } else {
        const cached = localStorage.getItem('vidhisetu_lawyer_profile');
        if (cached) setLawyer(JSON.parse(cached));
      }
    } catch (err) {
      console.warn('Failed to refresh verification status:', err.message);
      const cached = localStorage.getItem('vidhisetu_lawyer_profile');
      if (cached) setLawyer(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vidhisetu_auth_token');
    localStorage.removeItem('earnlaw_auth_token');
    localStorage.removeItem('vidhisetu_user_role');
    localStorage.removeItem('vidhisetu_lawyer_profile');
    navigate('/lawyer/login');
  };

  const status = lawyer?.verification_status || 'PENDING';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
      }}
    >
      <div
        className="lp-card"
        style={{
          maxWidth: '680px',
          width: '100%',
          padding: '40px',
          borderRadius: '16px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {status === 'VERIFIED' && (
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={36} />
            </div>
          )}

          {(status === 'PENDING' || status === 'UNDER_REVIEW') && (
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={36} />
            </div>
          )}

          {status === 'REJECTED' && (
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XCircle size={36} />
            </div>
          )}

          {status === 'SUSPENDED' && (
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={36} />
            </div>
          )}

          <h2 style={{ fontSize: '1.625rem', fontWeight: 800, margin: '0 0 8px' }}>
            {status === 'VERIFIED' && 'Advocate Verification Approved'}
            {status === 'PENDING' && 'Application Under Review'}
            {status === 'UNDER_REVIEW' && 'Bar Credentials In Document Review'}
            {status === 'REJECTED' && 'Verification Not Approved'}
            {status === 'SUSPENDED' && 'Chambers Access Suspended'}
          </h2>

          <p style={{ color: '#94a3b8', fontSize: '0.9375rem', margin: 0 }}>
            {status === 'VERIFIED' &&
              'Your credentials have been validated by Bar Council records. You may now access the Lawyer Portal.'}
            {status === 'PENDING' &&
              'Your application has been received and queued for administrative audit. Normal review duration is 24-48 business hours.'}
            {status === 'UNDER_REVIEW' &&
              'An administrator is currently cross-referencing your State Bar Council roll and uploaded certificates.'}
            {status === 'REJECTED' &&
              'Your advocate enrollment could not be verified with the provided documentation. Additional information may be requested.'}
            {status === 'SUSPENDED' &&
              'Your lawyer portal chambers access is currently suspended. Please contact legal administrative oversight.'}
          </p>
        </div>

        {/* Application Details Summary */}
        <div
          style={{
            background: '#101626',
            border: '1px solid #22304d',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h4
            style={{
              margin: '0 0 14px',
              fontSize: '0.875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#d4af37',
              letterSpacing: '0.05em',
            }}
          >
            Application Audit Record
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '0.875rem',
            }}
          >
            <div>
              <span style={{ color: '#64748b' }}>Advocate Name:</span>
              <div style={{ fontWeight: 600, color: '#fff' }}>{lawyer?.name || 'Advocate'}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Bar Registration No:</span>
              <div style={{ fontWeight: 600, color: '#d4af37' }}>
                {lawyer?.bar_registration_number || 'Pending'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>State Bar Council:</span>
              <div style={{ fontWeight: 600, color: '#fff' }}>
                {lawyer?.state_bar_council || 'State Council'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Current Status:</span>
              <div style={{ fontWeight: 700 }}>
                <span className={`lp-badge lp-badge-${status.toLowerCase()}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          {lawyer?.admin_remarks && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid #22304d',
                fontSize: '0.8125rem',
                color: '#cbd5e1',
              }}
            >
              <strong>Administrative Remarks:</strong>
              <p style={{ margin: '4px 0 0', color: '#94a3b8' }}>{lawyer.admin_remarks}</p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="lp-btn-action"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Check Latest Status</span>
          </button>

          {status === 'VERIFIED' && (
            <Link to="/lawyer/dashboard" className="lp-btn-action lp-btn-primary">
              <span>Enter Chambers Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="lp-btn-action"
            style={{ color: '#f87171' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        <div
          style={{
            marginTop: '28px',
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: '#64748b',
          }}
        >
          For urgent administrative escalation, contact{' '}
          <a
            href="mailto:admin@vidhisetu.in"
            style={{ color: '#60a5fa', textDecoration: 'none' }}
          >
            admin@vidhisetu.in
          </a>
        </div>
      </div>
    </div>
  );
}

export default LawyerVerificationStatusPage;
