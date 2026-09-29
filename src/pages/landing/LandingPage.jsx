import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Scale,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Users,
  FileText,
  ArrowRight,
  CheckCircle2,
  Lock,
  Gavel,
  Briefcase,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import './LandingPage.css';

export function LandingPage() {
  const { isAuthenticated, currentUser, logout } = useAuth();

  const sampleTopics = [
    {
      title: 'Tenant Security Deposit',
      desc: 'Landlord withholding deposit post-lease without damages',
      tag: 'Tenancy Law',
      query: 'Landlord refusing to refund security deposit after 30 days notice',
    },
    {
      title: 'Cheque Dishonour Notice',
      desc: '15-day statutory demand under Section 138 Negotiable Instruments Act',
      tag: 'NI Act 138',
      query: 'Cheque returned unpaid with insufficient funds memo, how to send statutory notice',
    },
    {
      title: 'Delayed Flat Possession',
      desc: 'Builder delay past RERA agreement completion deadline',
      tag: 'RERA & Consumer',
      query: 'Builder delayed delivery of flat by 18 months, claim interest compensation',
    },
    {
      title: 'Defective Product / Refund',
      desc: 'E-commerce platform refusing replacement or refund',
      tag: 'Consumer Protection',
      query: 'E-commerce company delivered damaged laptop and rejected return request',
    },
  ];

  return (
    <div className="landing-page animate-fade-in">
      {/* 1. Header Navigation */}
      <header className="landing-header">
        <div className="landing-header-container">
          <Link to="/" className="landing-brand">
            <div className="landing-brand-icon">
              <Scale size={26} />
            </div>
            <div className="landing-brand-text">
              <span className="landing-brand-name">VidhiSetu</span>
              <span className="landing-brand-badge">Legal AI</span>
            </div>
          </Link>

          <nav className="landing-nav-links">
            <Link to="/chat" className="landing-nav-link" style={{ fontWeight: 600, color: 'var(--color-primary-light, #2563eb)' }}>
              <Scale size={15} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              <span>Public Legal Agent</span>
            </Link>
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#topics" className="landing-nav-link">Dispute Guides</a>
            <Link to="/lawyer/login" className="landing-nav-link lawyer-portal-link">
              <Briefcase size={15} />
              <span>Advocate Portal</span>
            </Link>
          </nav>

          <div className="landing-header-actions">
            {isAuthenticated ? (
              <div className="landing-auth-user" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link to="/chat" className="landing-btn-primary" id="landing-open-chat-btn">
                  <MessageSquare size={16} />
                  <span>Open Legal Chat ({currentUser?.name?.split(' ')[0] || 'Citizen'})</span>
                </Link>
                <Link to="/login" className="landing-btn-ghost" id="landing-switch-account-btn" title="Sign In or Switch Account">
                  Sign In / Switch
                </Link>
              </div>
            ) : (
              <>
                <Link to="/login" className="landing-btn-ghost" id="landing-signin-btn">
                  Sign In
                </Link>
                <Link to="/register" className="landing-btn-primary" id="landing-register-btn">
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="landing-hero-section">
        <div className="landing-hero-container">
          <div className="landing-hero-badge">
            <Sparkles size={14} />
            <span>AI Legal Justice & Indian Kanoon Precedents</span>
          </div>

          <h1 className="landing-hero-title">
            Democratizing Legal Justice in India with AI
          </h1>

          <p className="landing-hero-subtitle">
            Explain your legal problem in plain language. VidhiSetu synthesizes statutory rights under Indian law, retrieves authentic court judgments from Indian Kanoon, and prepares step-by-step resolution plans.
          </p>

          <div className="landing-hero-cta-group">
            <Link to="/chat" className="landing-cta-primary" id="landing-hero-chat-btn">
              <Sparkles size={18} />
              <span>Ask Public AI Legal Agent</span>
              <ArrowRight size={18} />
            </Link>
            {!isAuthenticated && (
              <Link to="/chat" state={{ prefillQuery: "I need legal guidance on a dispute" }} className="landing-cta-secondary" id="landing-hero-free-btn">
                <span>Start Free Consultation</span>
              </Link>
            )}
          </div>

          <div className="landing-hero-guarantees">
            <div className="hero-guarantee-item">
              <CheckCircle2 size={16} className="text-success" />
              <span>Evidence-Grounded (Indian Kanoon)</span>
            </div>
            <div className="hero-guarantee-item">
              <CheckCircle2 size={16} className="text-success" />
              <span>Zero Fabrication Safeguard</span>
            </div>
            <div className="hero-guarantee-item">
              <CheckCircle2 size={16} className="text-success" />
              <span>Verified Bar Council Advocates</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Common Dispute Categories */}
      <section id="topics" className="landing-topics-section">
        <div className="landing-section-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Common Citizen Legal Matters</h2>
            <p className="landing-section-subtitle">
              VidhiSetu covers civil, consumer, tenancy, real estate, and financial dispute mechanisms across all 28 Indian states.
            </p>
          </div>

          <div className="landing-topics-grid">
            {sampleTopics.map((topic, idx) => (
              <div key={idx} className="landing-topic-card">
                <div className="topic-card-tag">{topic.tag}</div>
                <h3 className="topic-card-title">{topic.title}</h3>
                <p className="topic-card-desc">{topic.desc}</p>
                <Link
                  to="/chat"
                  state={{ prefillQuery: topic.query }}
                  className="topic-card-link"
                >
                  <span>Explore Legal Remedies</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Core Platform Architecture */}
      <section id="features" className="landing-features-section">
        <div className="landing-section-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Engineered for Indian Jurisprudence</h2>
            <p className="landing-section-subtitle">
              A comprehensive four-pillar platform connecting citizens, artificial intelligence, statutory evidence, and vetted advocates.
            </p>
          </div>

          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="feature-icon-wrapper">
                <Scale size={24} />
              </div>
              <h3 className="feature-title">AI Legal Guidance</h3>
              <p className="feature-desc">
                High-speed conversational guidance identifying Indian statutes (BNS, CPC, Consumer Protection Act, RERA, NI Act) in plain language.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="feature-icon-wrapper">
                <BookOpen size={24} />
              </div>
              <h3 className="feature-title">Authentic Judgments</h3>
              <p className="feature-desc">
                Ground-truth integration with Indian Kanoon database. Read actual Supreme Court, High Court, and Consumer Commission rulings.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="feature-icon-wrapper">
                <FileText size={24} />
              </div>
              <h3 className="feature-title">Self-Help & Action Plans</h3>
              <p className="feature-desc">
                Draft legal demand notices, organize evidence timelines, and track escalation stages before hiring an advocate.
              </p>
            </div>

            <div className="landing-feature-card">
              <div className="feature-icon-wrapper">
                <Users size={24} />
              </div>
              <h3 className="feature-title">Verified Advocates</h3>
              <p className="feature-desc">
                Connect with Bar Council verified advocates for legal representation, second opinions, and formal court appearances.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-brand">
            <div className="footer-brand-title">
              <Scale size={20} />
              <span>VidhiSetu</span>
            </div>
            <p className="footer-disclaimer">
              VidhiSetu is an AI legal information platform. Guidance provided is for informational purposes and should not be construed as official court judgments or personalized advocate counsel.
            </p>
          </div>

          <div className="landing-footer-links">
            <div className="footer-links-col">
              <h4>Public Access</h4>
              <Link to="/login">Citizen Login</Link>
              <Link to="/register">Create Account</Link>
              <Link to="/forgot-password">Reset Password</Link>
              <Link to="/verify-email">Verify Email</Link>
            </div>
            <div className="footer-links-col">
              <h4>Advocate Chambers</h4>
              <Link to="/lawyer/login">Advocate Login</Link>
              <Link to="/lawyer/register">Enroll as Advocate</Link>
              <Link to="/lawyer/verification-status">Check Bar Status</Link>
            </div>
          </div>
        </div>
        <div className="landing-copyright">
          © {new Date().getFullYear()} VidhiSetu AI Legal Platform. Built for Indian Legal Excellence.
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
