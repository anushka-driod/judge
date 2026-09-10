import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Mail, CheckCircle2, ArrowRight, RotateCw, Edit3 } from 'lucide-react';
import './AuthPage.css';

export function EmailVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, resendOtp, currentUser } = useAuth();
  const { showToast } = useUI();

  // Extract email from navigation state or URL query
  const searchParams = new URLSearchParams(location.search);
  const initialEmail =
    location.state?.email ||
    searchParams.get('email') ||
    currentUser?.email ||
    '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [newEmailInput, setNewEmailInput] = useState(initialEmail);

  // 6-digit OTP code state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(
    location.state?.message || 'Please enter the 6-digit verification code sent to your email.'
  );

  // 60-second countdown for resend
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const split = pastedData.split('');
      setOtpDigits(split);
      if (inputRefs.current[5]) {
        inputRefs.current[5].focus();
      }
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    setError('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!email) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmail(email, fullOtp);
      showToast('Email verified successfully! Welcome to VidhiSetu.', 'success');

      // Check account type for appropriate routing
      const user = res.user;
      if (user?.accountType === 'advocate') {
        navigate('/advocate/status');
      } else {
        navigate('/chat');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setError('');
    setResending(true);

    try {
      const res = await resendOtp(email);
      setCountdown(60);
      setInfoMessage(res.message || 'A new verification code has been dispatched.');
      showToast('New verification code sent to your email.', 'info');
      setOtpDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSaveChangedEmail = (e) => {
    e.preventDefault();
    if (newEmailInput.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmailInput.trim())) {
      setEmail(newEmailInput.trim());
      setIsEditingEmail(false);
      setCountdown(0);
      setInfoMessage(`Email updated to ${newEmailInput.trim()}. Requesting new code...`);
      resendOtp(newEmailInput.trim()).catch(() => {});
      setCountdown(60);
    } else {
      setError('Please enter a valid email address.');
    }
  };

  return (
    <div className="auth-page animate-fade-in email-verify-page">
      <div className="auth-header text-center">
        <div className="verify-icon-bubble">
          <Mail size={32} className="verify-mail-icon" />
        </div>
        <h2 className="auth-title">Verify Your Email</h2>
        <p className="auth-desc">
          Email verification is mandatory to secure your legal documents and cases.
        </p>

        {email && !isEditingEmail && (
          <div className="current-email-badge">
            <span>Sent to <strong>{email}</strong></span>
            <button
              type="button"
              className="btn-change-email"
              onClick={() => {
                setNewEmailInput(email);
                setIsEditingEmail(true);
              }}
              title="Change email"
            >
              <Edit3 size={13} /> Change
            </button>
          </div>
        )}
      </div>

      {isEditingEmail ? (
        <form onSubmit={handleSaveChangedEmail} className="change-email-form">
          <label className="input-label">Update Email Address</label>
          <div className="change-email-row">
            <input
              type="email"
              className="input-field"
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              placeholder="Enter correct email"
              required
            />
            <Button type="submit" variant="primary" size="md">
              Send Code
            </Button>
          </div>
        </form>
      ) : (
        <>
          {error && <Alert type="danger" onClose={() => setError('')}>{error}</Alert>}
          {infoMessage && <Alert type="info">{infoMessage}</Alert>}

          <form onSubmit={handleVerify} className="otp-form">
            <div className="otp-input-group" onPaste={handlePaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`otp-digit-box ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  aria-label={`Digit ${idx + 1}`}
                  autoComplete="off"
                />
              ))}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={ArrowRight}
              iconPosition="right"
              className="btn-verify-submit"
            >
              Verify Email & Continue
            </Button>
          </form>

          <div className="resend-container">
            {countdown > 0 ? (
              <span className="resend-countdown">
                Resend code in <strong>0:{countdown < 10 ? `0${countdown}` : countdown}</strong>
              </span>
            ) : (
              <button
                type="button"
                className="resend-link-btn"
                onClick={handleResend}
                disabled={resending}
              >
                <RotateCw size={14} className={resending ? 'animate-spin' : ''} />
                <span>Resend verification code</span>
              </button>
            )}
          </div>
        </>
      )}

      <div className="auth-footer text-center">
        <p>
          Already verified?{' '}
          <Link to="/login" className="auth-switch-link">
            Sign in to your account
          </Link>
        </p>
      </div>
    </div>
  );
}
