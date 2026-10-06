import React from 'react';
<<<<<<< HEAD
<<<<<<< HEAD
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Scale, ShieldCheck, BookOpen, UserCheck, ArrowLeft, Briefcase } from 'lucide-react';
=======
import { Outlet, Link } from 'react-router-dom';
import { Scale, ShieldCheck, BookOpen, UserCheck } from 'lucide-react';
>>>>>>> origin/main
=======
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Scale, ShieldCheck, BookOpen, UserCheck, ArrowLeft, Briefcase } from 'lucide-react';
>>>>>>> 3aab4be (dhanush commits)
import { ToastContainer } from '../common/ToastContainer';
import './AuthLayout.css';

export function AuthLayout() {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3aab4be (dhanush commits)
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const isRegister = location.pathname === '/register';

<<<<<<< HEAD
=======
>>>>>>> origin/main
=======
>>>>>>> 3aab4be (dhanush commits)
  return (
    <div className="auth-layout">
      <div className="auth-hero-pane">
        <div className="auth-hero-content">
<<<<<<< HEAD
<<<<<<< HEAD
          <Link to="/" className="auth-brand">
=======
          <Link to="/login" className="auth-brand">
>>>>>>> origin/main
=======
          <Link to="/" className="auth-brand">
>>>>>>> 3aab4be (dhanush commits)
            <div className="auth-brand-icon">
              <Scale size={28} />
            </div>
            <span className="auth-brand-name">VidhiSetu</span>
          </Link>

          <h1 className="auth-hero-heading">
            Simplifying Indian Law for Everyday Citizens
          </h1>
          <p className="auth-hero-subheading">
            Explain your legal problem in plain words. Get evidence-based statutory guidance, similar court precedents, and verified lawyer consultations.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="auth-feature-text">
                <strong>Plain Language Guidance</strong>
                <span>No confusing legal jargon. Understand your rights instantly.</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <BookOpen size={20} />
              </div>
              <div className="auth-feature-text">
                <strong>Indian Precedent Search</strong>
                <span>Match your situation against Supreme Court & Consumer rulings.</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <UserCheck size={20} />
              </div>
              <div className="auth-feature-text">
                <strong>Self-Help or Verified Lawyers</strong>
                <span>Handle minor disputes for free or consult vetted Bar Council advocates.</span>
              </div>
            </div>
          </div>

          <div className="auth-trust-badge">
            <span>🛡️ Designed for Consumer Disputes, RERA, Tenancy & NI Act Sec 138</span>
          </div>
        </div>
      </div>

      <div className="auth-form-pane">
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 3aab4be (dhanush commits)
        <header className="auth-top-nav">
          <Link to="/" className="auth-top-home-link" title="Return to VidhiSetu Homepage">
            <ArrowLeft size={16} />
            <span>Home</span>
          </Link>
          <div className="auth-top-tabs">
            <Link
              to="/login"
              className={`auth-top-tab ${isLogin ? 'auth-top-tab-active' : ''}`}
              id="auth-nav-signin-tab"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className={`auth-top-tab ${isRegister ? 'auth-top-tab-active' : ''}`}
              id="auth-nav-register-tab"
            >
              Register
            </Link>
            <Link to="/lawyer/login" className="auth-top-lawyer-link" title="Advocate Chambers & Portal">
              <Briefcase size={14} />
              <span>Advocate Portal</span>
            </Link>
          </div>
        </header>

<<<<<<< HEAD
=======
>>>>>>> origin/main
=======
>>>>>>> 3aab4be (dhanush commits)
        <div className="auth-form-container">
          <Outlet />
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
