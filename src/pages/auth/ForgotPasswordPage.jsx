import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Mail, Lock, KeyRound, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import './AuthPage.css';

export function ForgotPasswordPage() {
  const { forgotPassword, resetPassword } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setSuccessInfo(res.message || 'Password reset code has been sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to request reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the 6-digit reset code.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      showToast('Password updated successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page animate-fade-in forgot-password-page">
      <div className="auth-header">
        <Link to="/login" className="back-link">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>
        <h2 className="auth-title">Reset Password</h2>
        <p className="auth-desc">
          {step === 1
            ? 'Enter your registered email address and we will dispatch a secure 6-digit reset code.'
            : `Enter the 6-digit code sent to ${email} along with your new password.`}
        </p>
      </div>

      {error && <Alert type="danger" onClose={() => setError('')}>{error}</Alert>}
      {successInfo && <Alert type="info">{successInfo}</Alert>}

      {step === 1 ? (
        <form onSubmit={handleRequestCode} className="auth-form">
          <Input
            label="Registered Email Address"
            type="email"
            placeholder="e.g. yourname@example.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            icon={ArrowRight}
            iconPosition="right"
          >
            Send Reset Code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="auth-form">
          <Input
            label="6-Digit Reset Code"
            type="text"
            placeholder="e.g. 123456"
            icon={KeyRound}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />

          <Input
            label="New Password"
            type="password"
            placeholder="Minimum 8 characters"
            icon={Lock}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Include letters, numbers, and symbols for better security"
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            icon={CheckCircle2}
            iconPosition="right"
          >
            Update Password & Sign In
          </Button>

          <button
            type="button"
            className="link-btn-text"
            onClick={() => setStep(1)}
          >
            Didn't receive code? Change email or retry
          </button>
        </form>
      )}
    </div>
  );
}
