import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import { Scale, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerLoginPage() {
  const [email, setEmail] = useState('rajeshwar.rao@earnlaw.in');
  const [password, setPassword] = useState('LawyerSecure@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your registered advocate email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await lawyerPortalClient.login(email, password);
      if (res && res.lawyer) {
        if (res.lawyer.verification_status === 'VERIFIED') {
          navigate('/lawyer/dashboard');
        } else {
          navigate('/lawyer/verification-status');
        }
      } else {
        navigate('/lawyer/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#f8fafc',
      }}
    >
      <div
        className="lp-card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '36px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 16px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #d4af37 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
            }}
          >
            <Scale size={30} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
            Advocate Chambers Login
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
            Vidhi Setu Professional Lawyer Portal
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.875rem',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '8px',
              }}
            >
              Advocate Registered Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="advocate@barcouncil.in"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  background: '#101626',
                  border: '1px solid #22304d',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
              <Mail
                size={18}
                style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '8px',
              }}
            >
              Chambers Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  background: '#101626',
                  border: '1px solid #22304d',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
              <Lock
                size={18}
                style={{ position: 'absolute', left: '12px', top: '14px', color: '#64748b' }}
              />
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              color: '#fef08a',
            }}
          >
            <strong>Quick Demo Credentials:</strong>
            <div style={{ marginTop: '4px' }}>
              • Verified: <code>rajeshwar.rao@earnlaw.in</code> / <code>LawyerSecure@2026</code>
            </div>
            <div>
              • Pending: <code>vikram.malhotra@example.com</code> / <code>Advocate@2026</code>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="lp-btn-action lp-btn-primary"
            style={{
              justifyContent: 'center',
              padding: '14px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Authenticating Chambers...' : 'Sign In to Chambers'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#94a3b8',
            borderTop: '1px solid #22304d',
            paddingTop: '20px',
          }}
        >
          <span>Practicing advocate not yet enrolled? </span>
          <Link
            to="/lawyer/register"
            style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}
          >
            Apply for Bar Verification
          </Link>
          <div style={{ marginTop: '12px' }}>
            <Link to="/login" style={{ color: '#64748b', fontSize: '0.8125rem' }}>
              ← Return to Citizen Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LawyerLoginPage;
