import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { GoogleAuthService } from '../../services/googleAuthService';
import './AuthPage.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
const GOOGLE_SIGN_IN_CONFIGURED = Boolean(
  GOOGLE_CLIENT_ID &&
  !GOOGLE_CLIENT_ID.includes('your_google_client_id') &&
  !GOOGLE_CLIENT_ID.includes('replace-with-')
);

export function LoginPage() {
  const { login, googleAuth, logout, isAuthenticated, currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ emailOrPhone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const routeByAccountType = (user) => {
    if (user?.role === 'admin') {
      navigate('/admin/verifications');
    } else if (user?.accountType === 'advocate') {
      navigate(user.verificationStatus === 'verified' ? '/advocate/dashboard' : '/advocate/status');
    } else {
      navigate('/chat');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.emailOrPhone, formData.password);
      showToast('Welcome back to VidhiSetu!', 'success');
      routeByAccountType(result.user);
    } catch (err) {
      if (err.status === 403 || err.data?.requiresVerification) {
        showToast('Please verify your account to continue.', 'warning');
        const email = err.data?.email || formData.emailOrPhone;
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
          state: {
            email,
            maskedEmail: err.data?.maskedEmail,
            maskedPhone: err.data?.maskedPhone,
            message: 'Please enter the verification code sent to your registered contact details.',
          },
        });
        return;
      }
      setError(err.message || 'Invalid login credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const profile = await GoogleAuthService.promptGoogleSignIn();
      const result = await googleAuth(profile);
      showToast(result.isNewUser ? 'Google account created and signed in.' : 'Signed in with Google!', 'success');
      routeByAccountType(result.user);
    } catch (err) {
      if (!err.message?.toLowerCase().includes('cancelled')) {
        setError(err.message || 'Google authentication failed. Please try again.');
      }
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

      {isAuthenticated && currentUser && (
        <div className="auth-session-banner">
          <span>Signed in as <strong>{currentUser.name || currentUser.email}</strong></span>
          <div>
            <button type="button" onClick={() => routeByAccountType(currentUser)}>Go to Workspace</button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await logout();
                  showToast('Signed out of current session.', 'info');
                } catch (err) {
                  setError(err.message || 'Unable to sign out.');
                }
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {error && <Alert type="danger" onClose={() => setError('')}>{error}</Alert>}

      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          label="Email or Mobile Number"
          type="text"
          placeholder="e.g. 9876543210 or yourname@gmail.com"
          icon={Mail}
          value={formData.emailOrPhone}
          onChange={(event) => setFormData({ ...formData, emailOrPhone: event.target.value })}
          required
        />

        <div className="password-field-wrapper" style={{ position: 'relative' }}>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            icon={Lock}
            value={formData.password}
            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
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
          <Link to="/forgot-password" className="forgot-password-link">Forgot Password?</Link>
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

      <div className="auth-divider"><span>OR</span></div>

      <button
        type="button"
        className="google-signin-btn"
        onClick={handleGoogleSignIn}
        disabled={loading || !GOOGLE_SIGN_IN_CONFIGURED}
        aria-describedby={!GOOGLE_SIGN_IN_CONFIGURED ? 'google-signin-availability' : undefined}
      >
        <svg className="google-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Continue with Google</span>
      </button>
      {!GOOGLE_SIGN_IN_CONFIGURED && (
        <p id="google-signin-availability" className="google-signin-unavailable">
          Google sign-in is currently unavailable. You can still sign in with your account password.
        </p>
      )}

      <div className="auth-footer">
        <p>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="auth-switch-link">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
