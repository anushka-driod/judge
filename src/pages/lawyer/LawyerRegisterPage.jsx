import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  Scale,
  ShieldCheck,
  FileText,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    photoUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=400',
    barRegistrationNumber: '',
    stateBarCouncil: 'Bar Council of Karnataka',
    yearOfEnrollment: '2016',
    yearsOfExperience: '8',
    specializations: ['tenancy_disputes', 'consumer_protection'],
    jurisdiction: 'Karnataka High Court & City Civil Court',
    primaryCourt: 'City Civil Court Bengaluru',
    city: 'Bengaluru',
    languages: ['English', 'Kannada', 'Hindi'],
    consultationModes: ['video', 'voice', 'chat'],
    consultationFee: '1000',
    bio: '',
    documents: [
      { name: 'Bar_Enrollment_Certificate.pdf', type: 'Bar Enrollment Certificate', url: '#' },
      { name: 'Bar_Council_ID_Card.pdf', type: 'Bar ID / Registration Proof', url: '#' },
    ],
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSpecializationToggle = (spec) => {
    setFormData((prev) => {
      const exists = prev.specializations.includes(spec);
      return {
        ...prev,
        specializations: exists
          ? prev.specializations.filter((s) => s !== spec)
          : [...prev.specializations, spec],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await lawyerPortalClient.register(formData);
      navigate('/lawyer/verification-status');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const specializationOptions = [
    { id: 'tenancy_disputes', label: 'Tenancy & Property Disputes' },
    { id: 'consumer_protection', label: 'Consumer Protection & Refunds' },
    { id: 'labour_law', label: 'Employment & Labour Law' },
    { id: 'cheque_bounce', label: 'Banking & Cheque Bounce (Sec 138)' },
    { id: 'rera_property', label: 'RERA & Builder Disputes' },
    { id: 'cyber_crime', label: 'Cyber Fraud & Digital IT Act' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        className="lp-card"
        style={{
          maxWidth: '740px',
          width: '100%',
          padding: '36px',
          borderRadius: '16px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #d4af37 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Scale size={28} />
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
            Advocate Bar Enrollment Application
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
            Join Vidhi Setu Verified Counsel Chambers • Strict Admin Verification Required
          </p>
        </div>

        {/* Stepper */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '32px',
            borderBottom: '1px solid #22304d',
            paddingBottom: '16px',
          }}
        >
          {[
            { num: 1, label: 'Chambers Profile' },
            { num: 2, label: 'Bar Council Credentials' },
            { num: 3, label: 'Practice & Fees' },
            { num: 4, label: 'Verification Docs' },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: step === s.num ? '#60a5fa' : step > s.num ? '#34d399' : '#64748b',
                fontWeight: step === s.num ? 700 : 500,
                fontSize: '0.875rem',
              }}
            >
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: step === s.num ? '#2563eb' : step > s.num ? '#10b981' : '#1e293b',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
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
              marginBottom: '24px',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Personal & Chambers */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Full Legal Name (as per Bar Council Certificate) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Adv. Rajeshwar Rao"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="counsel@barassociation.org"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Registered Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98450 11223"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Chambers Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    City / Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Bengaluru"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Profile Photo URL
                  </label>
                  <input
                    type="url"
                    value={formData.photoUrl}
                    onChange={(e) => handleInputChange('photoUrl', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Short Professional Bio
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief overview of litigation background, court appearances, and advisory expertise..."
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.name || !formData.email || !formData.password) {
                      setError('Please fill in required fields.');
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}
                  className="lp-btn-action lp-btn-primary"
                >
                  Continue to Bar Credentials <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Bar Council & Credentials */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Bar Council Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KAR/2012/5894 or D/4120/2009"
                  value={formData.barRegistrationNumber}
                  onChange={(e) => handleInputChange('barRegistrationNumber', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff', fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.05em' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  This will be verified against the state bar roll before activation.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    State Bar Council *
                  </label>
                  <select
                    value={formData.stateBarCouncil}
                    onChange={(e) => handleInputChange('stateBarCouncil', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="Bar Council of Karnataka">Bar Council of Karnataka</option>
                    <option value="Bar Council of Delhi">Bar Council of Delhi</option>
                    <option value="Bar Council of Maharashtra & Goa">Bar Council of Maharashtra & Goa</option>
                    <option value="Bar Council of Tamil Nadu">Bar Council of Tamil Nadu</option>
                    <option value="Telangana State Bar Council">Telangana State Bar Council</option>
                    <option value="Bar Council of Uttar Pradesh">Bar Council of Uttar Pradesh</option>
                    <option value="Bar Council of West Bengal">Bar Council of West Bengal</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Year of Enrollment *
                  </label>
                  <input
                    type="number"
                    min="1970"
                    max="2026"
                    value={formData.yearOfEnrollment}
                    onChange={(e) => handleInputChange('yearOfEnrollment', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Years of Active Practice *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.yearsOfExperience}
                    onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Primary Court of Practice *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="High Court / District Court"
                    value={formData.primaryCourt}
                    onChange={(e) => handleInputChange('primaryCourt', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button type="button" onClick={() => setStep(1)} className="lp-btn-action">
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.barRegistrationNumber) {
                      setError('Bar Council Registration Number is required.');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                  className="lp-btn-action lp-btn-primary"
                >
                  Continue to Practice & Fees <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Practice Areas & Fees */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px' }}>
                  Core Legal Specializations *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {specializationOptions.map((opt) => {
                    const isSelected = formData.specializations.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSpecializationToggle(opt.id)}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? '#3b82f6' : '#22304d'}`,
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : '#101626',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <input type="checkbox" checked={isSelected} readOnly />
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Base 30-Minute Video Consultation Fee (INR ₹) *
                </label>
                <input
                  type="number"
                  required
                  min="200"
                  max="50000"
                  value={formData.consultationFee}
                  onChange={(e) => handleInputChange('consultationFee', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff', fontSize: '1.125rem', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Displayed transparently to citizens prior to consultation booking.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button type="button" onClick={() => setStep(2)} className="lp-btn-action">
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" onClick={() => setStep(4)} className="lp-btn-action lp-btn-primary">
                  Continue to Documents <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Verification Documents */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  color: '#fef08a',
                }}
              >
                <ShieldCheck size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                <strong>Mandatory Verification Policy:</strong> In accordance with Bar Council regulations, all applications enter <strong>PENDING</strong> review. Only verified counsel with approved documentation can accept consultations or access client case information.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formData.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '14px',
                      background: '#101626',
                      border: '1px solid #22304d',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={20} color="#60a5fa" />
                      <div>
                        <strong style={{ fontSize: '0.875rem' }}>{doc.name}</strong>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{doc.type}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>Attached</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button type="button" onClick={() => setStep(3)} className="lp-btn-action">
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="lp-btn-action lp-btn-primary"
                  style={{ padding: '12px 24px', fontSize: '1rem' }}
                >
                  {loading ? 'Submitting Application...' : 'Submit Bar Council Application'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8125rem', color: '#64748b' }}>
          Already enrolled? <Link to="/lawyer/login" style={{ color: '#60a5fa' }}>Sign In here</Link>
        </div>
      </div>
    </div>
  );
}

export default LawyerRegisterPage;
