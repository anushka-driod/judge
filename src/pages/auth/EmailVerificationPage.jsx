import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { ShieldCheck, Smartphone, Mail, ArrowRight, RotateCw, Lock, Clock } from 'lucide-react';
import './AuthPage.css';

/**
 * Utility to mask email (e.g. dhanush.demo@gmail.com -> d******@gmail.com)
 */
function maskEmail(email) {
  if (!email || !email.includes('@')) return '******';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  return `${localPart[0]}******@${domain}`;
}

/**
 * Utility to mask mobile phone (e.g. +91 98765 43210 -> +91 ******3210)
 */
function maskPhone(phone) {
  if (!phone) return 'Registered Mobile';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length >= 4) {
    return `+91 ******${digits.slice(-4)}`;
  }
  return '******';
}

export function EmailVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, resendOtp, currentUser } = useAuth();
  const { showToast } = useUI();

  // Extract contact info from state or query params
  const searchParams = new URLSearchParams(location.search);
  const initialEmail =
    location.state?.email ||
    searchParams.get('email') ||
    currentUser?.email ||
    '';

  const initialPhone = location.state?.phone || currentUser?.phone || '';

  const [email] = useState(initialEmail);
  const [phone] = useState(initialPhone);
  const [activeChannel, setActiveChannel] = useState('both'); // 'sms' | 'email' | 'both'

  const displayMaskedEmail = location.state?.maskedEmail || maskEmail(email);
  const displayMaskedPhone = location.state?.maskedPhone || (phone ? maskPhone(phone) : null);

  // 6-digit OTP code state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [infoMessage, setInfoMessage] = useState(
    location.state?.message || 'A 6-digit verification code has been dispatched to your registered contact details.'
  );

  // 60-second cooldown for resend button
  const [countdown, setCountdown] = useState(60);

  // 5-minute (300s) strict code expiration countdown
  const [expirySeconds, setExpirySeconds] = useState(300);

  const inputRefs = useRef([]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Code expiration timer (5 minutes)
  useEffect(() => {
    let timer;
    if (expirySeconds > 0) {
      timer = setInterval(() => setExpirySeconds((prev) => prev - 1), 1000);
    } else if (expirySeconds === 0) {
      setError('Verification code has expired. Please request a new code.');
    }
    return () => clearInterval(timer);
  }, [expirySeconds]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // WebOTP API: Automatic SMS verification code reading on supported mobile devices
  useEffect(() => {
    if (!('OTPCredential' in window)) return;
    const ac = new AbortController();

    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: ac.signal,
      })
      .then((otp) => {
        if (otp && otp.code) {
          const digits = otp.code.replace(/[^\d]/g, '').slice(0, 6).split('');
          if (digits.length === 6) {
            setOtpDigits(digits);
            showToast('OTP auto-detected from SMS.', 'info');
            if (inputRefs.current[5]) {
              inputRefs.current[5].focus();
            }
          }
        }
      })
      .catch(() => {
        // WebOTP timed out or cancelled by user, ignore
      });

    return () => {
      ac.abort();
    };
  }, [showToast]);

  const handleDigitChange = (index, value) => {
    // Only accept numeric inputs
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
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^\d]/g, '');
    if (pastedData.length >= 6) {
      const split = pastedData.slice(0, 6).split('');
      setOtpDigits(split);
      if (inputRefs.current[5]) {
        inputRefs.current[5].focus();
      }
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    setError('');

    if (expirySeconds <= 0) {
      setError('Verification code has expired. Please click Resend OTP to receive a new code.');
      return;
    }

    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!email) {
      setError('Missing registered email address. Please sign in or register again.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmail(email, fullOtp);
      showToast('Identity verified successfully! Welcome to VidhiSetu.', 'success');

      // Routing according to user role
      const user = res.user;
      if (user?.accountType === 'advocate') {
        navigate('/advocate/status');
      } else {
        navigate('/chat');
      }
    } catch (err) {
      const errorMsg = err.message || 'Invalid verification code. Please check and try again.';
      setError(errorMsg);

      if (err.data?.remainingAttempts !== undefined) {
        setRemainingAttempts(err.data.remainingAttempts);
      } else if (err.status === 429) {
        setRemainingAttempts(0);
      }

      // Clear input boxes on failure so user can re-enter cleanly
      setOtpDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (channel = 'both') => {
    if (countdown > 0 || resending) return;
    setError('');
    setRemainingAttempts(null);
    setResending(true);

    try {
      const res = await resendOtp(email, channel);
      setCountdown(60);
      setExpirySeconds(300); // Reset 5-minute expiry timer
      setInfoMessage(res?.message || 'A fresh 6-digit verification code has been dispatched. Valid for 5 minutes.');
      showToast('A fresh verification code has been sent.', 'info');
      setOtpDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please wait a moment and try again.');
    } finally {
      setResending(false);
    }
  };

  // Format expiry seconds into mm:ss
  const formatExpiryTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  };

  return (
    <div className="auth-page animate-fade-in email-verify-page">
      <div className="auth-header text-center">
        <div className="verify-icon-bubble">
          <ShieldCheck size={36} className="verify-mail-icon" />
        </div>
        <h2 className="auth-title">Two-Step Verification</h2>
        <p className="auth-desc">
          For your security and legal confidentiality, please verify your identity using the 6-digit code.
        </p>

        {/* Masked Contact Details Card */}
        <div
          className="verified-contacts-card"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px',
            margin: '18px 0 6px 0',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 'bold', marginBottom: '8px' }}>
            Code dispatched to:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {displayMaskedPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                <Smartphone size={15} color="#2563eb" />
                <span>Mobile SMS: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{displayMaskedPhone}</strong></span>
              </div>
            )}
            {displayMaskedEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                <Mail size={15} color="#2563eb" />
                <span>Email Inbox: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{displayMaskedEmail}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <Alert type="danger" onClose={() => setError('')}>{error}</Alert>}
      {infoMessage && !error && <Alert type="info">{infoMessage}</Alert>}

      {/* Security Expiry & Attempt Counter Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: expirySeconds < 60 ? '#dc2626' : '#64748b',
          margin: '10px 0 16px 0',
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={13} />
          <span>Code expires in: <strong>{formatExpiryTime(expirySeconds)}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
          <Lock size={13} />
          <span>Strict 5-minute security window</span>
        </div>
      </div>

      {/* 6-Digit OTP Form */}
      <form onSubmit={handleVerify} className="otp-form">
        <div className="otp-input-group" onPaste={handlePaste}>
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              className={`otp-digit-box ${digit ? 'filled' : ''}`}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              aria-label={`Digit ${idx + 1}`}
              autoComplete="one-time-code"
              disabled={loading || expirySeconds <= 0}
            />
          ))}
        </div>

        {remainingAttempts !== null && remainingAttempts < 5 && (
          <div style={{ textAlign: 'center', margin: '4px 0 12px 0', fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>
            ⚠️ {remainingAttempts} verification attempt{remainingAttempts === 1 ? '' : 's'} remaining before code revocation.
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={expirySeconds <= 0 || otpDigits.join('').length < 6}
          icon={ArrowRight}
          iconPosition="right"
          className="btn-verify-submit"
        >
          Verify & Continue
        </Button>
      </form>

      {/* Resend OTP Section with Cooldown */}
      <div className="resend-container" style={{ marginTop: '20px' }}>
        {countdown > 0 ? (
          <span className="resend-countdown" style={{ fontSize: '13px', color: '#64748b' }}>
            Didn't receive the code? Resend available in <strong>0:{countdown < 10 ? `0${countdown}` : countdown}</strong>
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="resend-link-btn"
              onClick={() => handleResend('both')}
              disabled={resending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <RotateCw size={14} className={resending ? 'animate-spin' : ''} />
              <span>Resend verification code</span>
            </button>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
              <button
                type="button"
                onClick={() => handleResend('sms')}
                disabled={resending}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Send via SMS
              </button>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <button
                type="button"
                onClick={() => handleResend('email')}
                disabled={resending}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Send via Email
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="auth-footer text-center" style={{ marginTop: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Entered the wrong contact details?{' '}
          <Link to="/register" className="auth-switch-link" style={{ fontWeight: '600', color: '#2563eb' }}>
            Register with another number
          </Link>
        </p>
      </div>
    </div>
  );
}

export default EmailVerificationPage;
