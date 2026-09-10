import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import {
  Mail,
  Lock,
  ArrowRight,
  UserCheck,
  Eye,
  EyeOff,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import './AuthPage.css';

export function LoginPage() {
  const { login, googleAuth, completeGoogleProfile } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    emailOrPhone: 'aarav.mehta@example.com',
    password: 'password123',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Google Onboarding Modal State for first-time Google sign-ins
  const [googleOnboarding, setGoogleOnboarding] = useState(null);
  const [googleRole, setGoogleRole] = useState('candidate');
  const [googleLocation, setGoogleLocation] = useState({
    state: 'Karnataka',
    city: 'Bengaluru',
  });
  const [googlePhone, setGooglePhone] = useState('');
  const [googleBarId, setGoogleBarId] = useState('');

  const routeByAccountType = (user) => {
    if (!user) {
      navigate('/chat');
      return;
    }

    if (user.role === 'admin' || user.accountType === 'admin') {
      navigate('/admin/verifications');
      return;
    }

    if (user.accountType === 'advocate') {
      if (user.verificationStatus === 'verified') {
        navigate('/advocate/dashboard');
      } else {
        navigate('/advocate/status');
      }
      return;
    }

    // Default Candidate
    navigate('/chat');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(formData.emailOrPhone, formData.password);
      showToast('Welcome back to VidhiSetu!', 'success');
      routeByAccountType(res.user);
    } catch (err) {
      // 1. Mandatory Email Verification Enforcement
      if (err.status === 403 || err.data?.requiresVerification) {
        showToast('Please verify your email before continuing.', 'warning');
        navigate(
          `/verify-email?email=${encodeURIComponent(
            err.data?.email || formData.emailOrPhone
          )}`,
          {
            state: {
              email: err.data?.email || formData.emailOrPhone,
              message: 'Please verify your email before continuing.',
            },
          }
        );
        return;
      }
      setError(err.message || 'Invalid login credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Social Login (Continue with Google)
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      // Simulate Google Identity Provider response
      const mockGoogleProfile = {
        email: formData.emailOrPhone.includes('@')
          ? formData.emailOrPhone
          : 'google.citizen@example.com',
        name: 'Siddharth Rao',
        picture: null,
      };

      const res = await googleAuth(mockGoogleProfile);

      if (res.isNewUser) {
        // First-time sign-in: require role and location selection per spec
        setGoogleOnboarding(res);
      } else {
        showToast('Signed in with Google!', 'success');
        routeByAccountType(res.user);
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await completeGoogleProfile({
        email: googleOnboarding.email,
        name: googleOnboarding.name,
        accountType: googleRole,
        phone: googlePhone || '+91 98000 22111',
        city: googleLocation.city,
        state: googleLocation.state,
        location: { country: 'India', state: googleLocation.state, city: googleLocation.city },
        advocateDetails:
          googleRole === 'advocate'
            ? {
                enrollmentNumber: googleBarId || 'KAR/9912/2020',
                barCouncil: 'Bar Council of Karnataka',
                practiceAreas: ['Consumer Disputes', 'Civil Law'],
                experienceYears: 4,
              }
            : undefined,
      });

      showToast('Profile setup complete!', 'success');
      setGoogleOnboarding(null);
      routeByAccountType(res.user);
    } catch (err) {
      setError(err.message || 'Failed to complete profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (email, password, roleLabel) => {
    setFormData({ emailOrPhone: email, password });
    setLoading(true);
    setError('');

    try {
      const res = await login(email, password);
      showToast(`Logged in as ${roleLabel}`, 'success');
      routeByAccountType(res.user);
    } catch (err) {
      if (err.status === 403 || err.data?.requiresVerification) {
        showToast('Please verify your email before continuing.', 'warning');
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
          state: { email, message: 'Please verify your email before continuing.' },
        });
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page animate-fade-in">
      <div className="auth-header">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-desc">Sign in to your verified VidhiSetu account.</p>
      </div>

      {error && <Alert type="danger" onClose={() => setError('')}>{error}</Alert>}

      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          label="Email or Mobile Number"
          type="text"
          placeholder="e.g. 9876543210 or yourname@gmail.com"
          icon={Mail}
          value={formData.emailOrPhone}
          onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
          required
        />

        <div className="password-field-wrapper" style={{ position: 'relative' }}>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            icon={Lock}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '36px',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="auth-form-options">
          <label className="remember-me-checkbox">
            <input type="checkbox" defaultChecked />
            <span>Remember this device</span>
          </label>
          <Link to="/forgot-password" className="forgot-password-link">
            Forgot Password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          icon={ArrowRight}
          iconPosition="right"
        >
          Sign In
        </Button>
      </form>

      <div className="auth-divider">
        <span>OR</span>
      </div>

      {/* Social Authentication: Continue with Google */}
      <button
        type="button"
        className="google-signin-btn"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <svg className="google-icon-svg" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Quick Demo Role Switcher for instant evaluator testing */}
      <div className="auth-divider" style={{ marginTop: '1.25rem' }}>
        <span>1-CLICK DEMO ACCOUNTS</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button
          type="button"
          className="demo-login-btn"
          style={{ padding: '8px', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer' }}
          onClick={() => handleDemoLogin('aarav.mehta@example.com', 'password123', 'Citizen (Aarav Mehta)')}
        >
          👤 Demo Citizen
        </button>

        <button
          type="button"
          className="demo-login-btn"
          style={{ padding: '8px', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer' }}
          onClick={() => handleDemoLogin('priya.deshmukh@example.com', 'advocate123', 'Verified Advocate (Adv. Priya)')}
        >
          ⚖️ Verified Advocate
        </button>

        <button
          type="button"
          className="demo-login-btn"
          style={{ padding: '8px', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer' }}
          onClick={() => handleDemoLogin('vikram.malhotra@example.com', 'advocate123', 'Pending Advocate (Adv. Vikram)')}
        >
          ⏳ Pending Advocate
        </button>

        <button
          type="button"
          className="demo-login-btn"
          style={{ padding: '8px', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer' }}
          onClick={() => handleDemoLogin('admin@vidhisetu.in', 'admin123', 'Platform Admin')}
        >
          🛡️ Admin Reviewer
        </button>
      </div>

      <button
        type="button"
        className="demo-login-btn"
        style={{ marginTop: '8px', padding: '6px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', width: '100%', borderColor: '#fca5a5', color: '#b91c1c' }}
        onClick={() => handleDemoLogin('unverified@example.com', 'password123', 'Unverified Account')}
      >
        🚫 Test Unverified Account (Triggers Mandatory Verification Screen)
      </button>

      <div className="auth-footer">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="auth-switch-link">
            Create Account
          </Link>
        </p>
      </div>

      {/* Google New User Profile Completion Modal */}
      {googleOnboarding && (
        <div className="admin-modal-backdrop" onClick={() => setGoogleOnboarding(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Complete Your VidhiSetu Profile</h3>
            <p className="modal-desc">
              Authenticated via Google as <strong>{googleOnboarding.email}</strong>. Please select your role and location to complete setup.
            </p>

            <form onSubmit={handleCompleteGoogleProfile}>
              <div className="role-picker-container mb-3">
                <label className="input-label">How will you use VidhiSetu?</label>
                <div className="role-cards-grid">
                  <div
                    className={`role-card ${googleRole === 'candidate' ? 'role-card-selected' : ''}`}
                    onClick={() => setGoogleRole('candidate')}
                  >
                    <span className="role-card-title">👤 Candidate</span>
                    <span className="role-card-desc">Get legal guidance</span>
                  </div>

                  <div
                    className={`role-card ${googleRole === 'advocate' ? 'role-card-selected' : ''}`}
                    onClick={() => setGoogleRole('advocate')}
                  >
                    <span className="role-card-title">⚖️ Advocate</span>
                    <span className="role-card-desc">Provide legal services</span>
                  </div>
                </div>
              </div>

              <div className="form-row-2">
                <Input
                  label="City"
                  value={googleLocation.city}
                  onChange={(e) => setGoogleLocation({ ...googleLocation, city: e.target.value })}
                  required
                />
                <Input
                  label="State"
                  value={googleLocation.state}
                  onChange={(e) => setGoogleLocation({ ...googleLocation, state: e.target.value })}
                  required
                />
              </div>

              {googleRole === 'advocate' && (
                <Input
                  label="Bar Council Enrollment Number"
                  placeholder="e.g. KAR/1234/2018"
                  value={googleBarId}
                  onChange={(e) => setGoogleBarId(e.target.value)}
                  required
                />
              )}

              <div className="modal-footer">
                <Button variant="secondary" size="md" onClick={() => setGoogleOnboarding(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" loading={loading}>
                  Complete Registration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
