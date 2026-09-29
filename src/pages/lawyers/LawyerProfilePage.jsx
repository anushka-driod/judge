import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { lawyerService } from '../../services/lawyerService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import {
  Star,
  MapPin,
  Briefcase,
  Languages,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Award,
} from 'lucide-react';
import './Lawyers.css';

export function LawyerProfilePage() {
  const { lawyerId } = useParams();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId');

  const [lawyer, setLawyer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await lawyerService.getLawyerById(lawyerId);
      setLawyer(data);
      setLoading(false);
    }
    load();
  }, [lawyerId]);

  if (loading) return <Loading text="Loading advocate profile..." />;
  if (!lawyer) return <div>Lawyer not found</div>;

  return (
    <div className="lawyers-page animate-fade-in">
      <Link to={caseId ? `/cases/${caseId}/lawyers` : '/cases/case-101/lawyers'} className="back-nav-link">
        <ArrowLeft size={16} /> Back to Advocate Recommendations
      </Link>

      <div className="profile-hero-card">
        <div className="profile-hero-left">
          <img src={lawyer.photoUrl} alt={lawyer.name} className="profile-avatar-large" />
          <div className="profile-titles">
            <div className="profile-name-badge">
              <h1 className="profile-name">{lawyer.name}</h1>
              <span className="verified-pill">
                <ShieldCheck size={16} /> Bar Council Verified
              </span>
            </div>
            <p className="profile-court">
              <MapPin size={16} /> {lawyer.location} • {lawyer.court}
            </p>
            <div className="profile-meta-tags">
              <span className="profile-meta-chip">
                <Briefcase size={14} /> {lawyer.experienceYears} Years Experience
              </span>
              <span className="profile-meta-chip">
                <Star size={14} fill="#f59e0b" color="#f59e0b" /> {lawyer.rating} ({lawyer.reviewCount} Reviews)
              </span>
              <span className="profile-meta-chip">
                <Award size={14} /> Bar Enrollment: {lawyer.barCouncilId}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-hero-right">
          <div className="profile-pricing-box">
            <span className="pricing-title">Standard Consultation</span>
            <span className="pricing-amount">₹{lawyer.consultationFee}</span>
            <span className="pricing-terms">30-Min Audio/Video Consultation</span>
            <Link
              to={`/lawyers/${lawyer.id}/book${caseId ? `?caseId=${caseId}` : ''}`}
              className="w-full"
            >
              <Button variant="primary" size="lg" fullWidth icon={ArrowRight} iconPosition="right">
                Book Consultation Slot
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="profile-body-grid">
        <div className="profile-main-col">
          {/* About Counsel */}
          <Card className="profile-section-card">
            <h3 className="section-heading">Professional Biography & Court Standing</h3>
            <p className="profile-bio-full">{lawyer.bio}</p>
            <p className="profile-bio-full" style={{ marginTop: 'var(--space-3)' }}>
              Practicing primarily before High Courts and District Appellate Commissions. Known for pragmatic pre-litigation conciliation, rigorous statutory demand drafting, and client-first communication.
            </p>
          </Card>

          {/* Areas of Practice */}
          <Card className="profile-section-card">
            <h3 className="section-heading">Specialized Practice Areas</h3>
            <div className="practice-areas-list">
              {lawyer.practiceAreas.map((area, idx) => (
                <div key={idx} className="practice-area-box">
                  <CheckCircle2 size={18} className="practice-check-icon" />
                  <div>
                    <strong>{area}</strong>
                    <p>Advisory, notice drafting, dispute conciliation, and representation.</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Languages */}
          <Card className="profile-section-card">
            <h3 className="section-heading">Language Fluency</h3>
            <p className="profile-bio-full">
              Can consult and examine evidence in: <strong>{lawyer.languages.join(', ')}</strong>.
            </p>
          </Card>
        </div>

        {/* Aside: Availability & Schedule */}
        <div className="profile-aside-col">
          <Card className="profile-section-card">
            <h3 className="section-heading">Weekly Availability</h3>
            <div className="availability-days-list">
              {lawyer.availableDays.map((day, idx) => (
                <div key={idx} className="avail-day-row">
                  <span className="avail-day-name">📅 {day}</span>
                  <span className="avail-slots-count">Slots Available</span>
                </div>
              ))}
            </div>

            <div className="consult-prepare-tips">
              <span className="tips-title">💡 How to Prepare:</span>
              <ul className="tips-list">
                <li>Upload dispute receipts or contracts</li>
                <li>Write down a chronological timeline</li>
                <li>Prepare specific questions beforehand</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
