import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lawyerService } from '../../services/lawyerService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Loading } from '../../components/common/Loading';
import {
  Star,
  MapPin,
  Briefcase,
  Languages,
  CheckCircle,
  Search,
  ArrowRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import './Lawyers.css';

export function LawyerRecommendationsPage() {
  const { caseId } = useParams();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPracticeArea, setSelectedPracticeArea] = useState('');

  useEffect(() => {
    async function loadLawyers() {
      const data = await lawyerService.getAllLawyers();
      setLawyers(data);
      setLoading(false);
    }
    loadLawyers();
  }, []);

  const practiceAreaOptions = [
    { value: '', label: 'All Practice Areas' },
    { value: 'Consumer', label: 'Consumer Protection & E-Commerce' },
    { value: 'Cheque', label: 'Banking & Cheque Bounce (Sec 138)' },
    { value: 'RERA', label: 'RERA & Builder Property Disputes' },
    { value: 'Tenancy', label: 'Tenancy & Rental Recovery' },
    { value: 'Employment', label: 'Employment & Labor Claims' },
  ];

  const filteredLawyers = lawyers.filter((lawyer) => {
    const matchesSearch =
      lawyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lawyer.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lawyer.court.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesArea =
      !selectedPracticeArea ||
      lawyer.practiceAreas.some((p) => p.toLowerCase().includes(selectedPracticeArea.toLowerCase()));

    return matchesSearch && matchesArea;
  });

  if (loading) return <Loading text="Matching verified advocates for your dispute..." />;

  return (
    <div className="lawyers-page animate-fade-in">
      <div className="lawyers-page-header">
        <div>
          <h1 className="lawyers-title">Verified Advocate Consultation</h1>
          <p className="lawyers-subtitle">
            Consult experienced, Bar Council verified advocates who specialize in your case domain. Transparent fixed consultation fees.
          </p>
        </div>
        {caseId && (
          <Link to={`/cases/${caseId}`}>
            <Button variant="outline" size="sm">
              Back to Case Hub
            </Button>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="lawyers-filter-bar">
        <div className="search-input-box">
          <Input
            placeholder="Search by advocate name, city, or court..."
            icon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="practice-select-box">
          <Select
            options={practiceAreaOptions}
            value={selectedPracticeArea}
            onChange={(e) => setSelectedPracticeArea(e.target.value)}
          />
        </div>
      </div>

      {/* Verified Guarantees Badge Strip */}
      <div className="lawyer-guarantee-strip">
        <div className="guarantee-item">
          <ShieldCheck size={18} className="guarantee-icon" />
          <span>Bar Council ID Verified</span>
        </div>
        <div className="guarantee-item">
          <Award size={18} className="guarantee-icon" />
          <span>Minimum 8+ Years Trial Experience</span>
        </div>
        <div className="guarantee-item">
          <CheckCircle size={18} className="guarantee-icon" />
          <span>No Hidden Charges / Fixed Fee</span>
        </div>
      </div>

      {/* Lawyer Cards Grid */}
      {filteredLawyers.length === 0 ? (
        <div
          className="empty-lawyers-state"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'var(--bg-surface-elevated, #181920)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
            borderRadius: '12px',
            margin: '24px 0',
          }}
        >
          <ShieldCheck size={48} color="var(--accent-400, #e5c07b)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary, #f8fafc)', marginBottom: '8px' }}>
            No Verified Advocates Found Matching Your Query
          </h3>
          <p style={{ color: 'var(--text-secondary, #cbd5e1)', maxWidth: '480px', margin: '0 auto 20px', fontSize: '0.925rem' }}>
            We only display real advocates whose Bar Council credentials have been verified by the administrator. Try adjusting your practice area or search query.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedPracticeArea('');
            }}
          >
            Clear Search Filters
          </Button>
        </div>
      ) : (
        <div className="lawyers-grid">
          {filteredLawyers.map((lawyer) => (
            <Card key={lawyer.id} hoverable className="lawyer-card-full">
              <div className="lawyer-card-top-row">
                <img
                  src={lawyer.photoUrl}
                  alt={lawyer.name}
                  className="lawyer-avatar-img"
                />
                <div className="lawyer-basic-info">
                  <div className="lawyer-name-verified">
                    <h3 className="lawyer-name">{lawyer.name}</h3>
                    <span className="bar-verified-badge" title="Bar Council Enrollment Verified">
                      <ShieldCheck size={14} /> {lawyer.barCouncilId}
                    </span>
                  </div>
                  <div className="lawyer-court-info">
                    <MapPin size={14} />
                    <span>{lawyer.location} • {lawyer.court}</span>
                  </div>
                  <div className="lawyer-rating-line">
                    {lawyer.rating && lawyer.reviewCount > 0 ? (
                      <div className="stars-pill">
                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                        <strong>{lawyer.rating}</strong>
                        <span>({lawyer.reviewCount} verified reviews)</span>
                      </div>
                    ) : (
                      <div className="stars-pill" style={{ background: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                        <ShieldCheck size={14} color="#e5c07b" />
                        <span style={{ color: '#e5c07b', fontWeight: 600 }}>Verified VidhiSetu Advocate</span>
                      </div>
                    )}
                    <span className="exp-pill">
                      <Briefcase size={14} /> {lawyer.experienceYears} Years Exp
                    </span>
                  </div>
                </div>
              </div>

              <p className="lawyer-bio-snippet">{lawyer.bio}</p>

              <div className="lawyer-practice-tags">
                {(lawyer.practiceAreas || []).map((area, idx) => (
                  <span key={idx} className="practice-tag">{area}</span>
                ))}
              </div>

              <div className="lawyer-languages-row">
                <Languages size={14} className="lang-icon" />
                <span>Languages: {(lawyer.languages || ['English']).join(', ')}</span>
              </div>

              <div className="lawyer-card-action-bar">
                <div className="fee-box">
                  <span className="fee-label">Consultation Fee</span>
                  <span className="fee-amount">₹{lawyer.consultationFee} <small>/ session</small></span>
                </div>

                <div className="action-buttons-group">
                  <Link to={`/lawyers/${lawyer.id}${caseId ? `?caseId=${caseId}` : ''}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                  <Link to={`/lawyers/${lawyer.id}/book${caseId ? `?caseId=${caseId}` : ''}`}>
                    <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right">
                      Book Slot
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
