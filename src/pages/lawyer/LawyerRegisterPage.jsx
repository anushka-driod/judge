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
    photoUrl: '',
    barRegistrationNumber: '',
    stateBarCouncil: '',
    yearOfEnrollment: '',
    yearsOfExperience: '',
    specializations: [],
    jurisdiction: '',
    primaryCourt: '',
    city: '',
    state: '',
    languages: [],
    consultationModes: [],
    consultationFee: '',
    bio: '',
    documents: [],
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('File size exceeds the 20MB limit.');
      return;
    }

    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Invalid file type "${ext}". Allowed formats: PDF, PNG, JPG, JPEG.`);
      return;
    }

    setError('');
    setUploadingDoc(true);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
        reader.readAsDataURL(file);
      });
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      const derivedType = file.type || (ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg');
      const document = {
        id: `vdoc_${Date.now()}`,
        filename: file.name,
        filetype: derivedType,
        base64Data,
        documentType: docType,
        name: file.name,
        type: docType,
        sizeFormatted: `${Math.round(file.size / 1024)} KB`,
      };
      setFormData((prev) => ({
        ...prev,
        documents: [
          ...prev.documents.filter((item) => {
            if (docType === 'Bar Enrollment Certificate') {
              return item.type !== 'Bar Enrollment Certificate' && item.documentType !== 'Bar Enrollment Certificate';
            }
            return (
              item.type !== 'Advocate Identity Card' &&
              item.type !== 'Bar ID / Registration Proof' &&
              item.documentType !== 'Advocate Identity Card' &&
              item.documentType !== 'Bar ID / Registration Proof'
            );
          }),
          document,
        ],
      }));
    } catch (readErr) {
      setError(readErr.message || 'Could not process selected document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeDocument = (docType) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => {
        if (docType === 'Bar Enrollment Certificate') {
          return d.type !== 'Bar Enrollment Certificate' && d.documentType !== 'Bar Enrollment Certificate';
        }
        return (
          d.type !== 'Advocate Identity Card' &&
          d.type !== 'Bar ID / Registration Proof' &&
          d.documentType !== 'Advocate Identity Card' &&
          d.documentType !== 'Bar ID / Registration Proof'
        );
      }),
    }));
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

    // Step 1 validation
    if (!formData.name?.trim()) { setError('Full legal name is required.'); setStep(1); return; }
    if (!formData.email?.trim()) { setError('Email address is required.'); setStep(1); return; }
    if (!formData.phone?.trim() || formData.phone.replace(/[^\d]/g, '').length < 10) {
      setError('A valid 10-digit mobile number is required.'); setStep(1); return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long.'); setStep(1); return;
    }
    if (!formData.city?.trim()) { setError('City is required.'); setStep(1); return; }
    if (!formData.state?.trim()) { setError('State is required.'); setStep(1); return; }

    // Step 2 validation
    if (!formData.barRegistrationNumber?.trim()) { setError('Bar Council Registration Number is required.'); setStep(2); return; }
    if (!formData.stateBarCouncil) { setError('Please select your State Bar Council.'); setStep(2); return; }
    if (!formData.yearOfEnrollment) { setError('Year of enrollment is required.'); setStep(2); return; }
    if (formData.yearsOfExperience === '' || Number(formData.yearsOfExperience) < 0) {
      setError('Years of practice experience is required.'); setStep(2); return;
    }
    if (!formData.languages || !formData.languages.length) {
      setError('Please specify at least one language for consultations.'); setStep(2); return;
    }
    if (!formData.primaryCourt?.trim()) { setError('Primary Court of practice is required.'); setStep(2); return; }

    // Step 3 validation
    if (!formData.specializations || !formData.specializations.length) {
      setError('Please select at least one legal specialization.'); setStep(3); return;
    }
    if (!Number(formData.consultationFee) || Number(formData.consultationFee) <= 0) {
      setError('Please enter a valid consultation fee.'); setStep(3); return;
    }

    // Step 4 document checks
    const hasEnrollmentCert = formData.documents?.some((d) => d.type === 'Bar Enrollment Certificate' || d.documentType === 'Bar Enrollment Certificate');
    const hasIdCard = formData.documents?.some((d) =>
      d.type === 'Advocate Identity Card' ||
      d.documentType === 'Advocate Identity Card' ||
      d.type === 'Bar ID / Registration Proof' ||
      d.documentType === 'Bar ID / Registration Proof'
    );

    if (!hasEnrollmentCert) {
      setError('Please attach your Bar Enrollment Certificate.');
      setStep(4);
      return;
    }
    if (!hasIdCard) {
      setError('Please attach your Bar Council Identity Card / Certificate of Practice.');
      setStep(4);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await lawyerPortalClient.register(formData);
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`, {
        state: {
          email: formData.email,
          phone: formData.phone,
          maskedEmail: res?.maskedEmail,
          maskedPhone: res?.maskedPhone,
          message: res?.message || 'Enter the verification code sent to your registered contact.',
        },
      });
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
                    placeholder="Enter your city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    State / Jurisdiction *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>
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
                    if (!formData.name?.trim()) { setError('Full legal name is required.'); return; }
                    if (!formData.email?.trim()) { setError('Email address is required.'); return; }
                    if (!formData.phone?.trim() || formData.phone.replace(/[^\d]/g, '').length < 10) {
                      setError('A valid 10-digit mobile number is required.'); return;
                    }
                    if (!formData.password || formData.password.length < 8) {
                      setError('Password must be at least 8 characters long.'); return;
                    }
                    if (!formData.city?.trim()) { setError('City is required.'); return; }
                    if (!formData.state?.trim()) { setError('State is required.'); return; }
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
                    required
                    value={formData.stateBarCouncil}
                    onChange={(e) => handleInputChange('stateBarCouncil', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  >
                    <option value="">Select your Bar Council</option>
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
                    required
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
                    required
                    value={formData.yearsOfExperience}
                    onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Languages *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Comma-separated language names"
                    value={formData.languages.join(', ')}
                    onChange={(e) => handleInputChange('languages', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))}
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
                    if (!formData.barRegistrationNumber?.trim()) {
                      setError('Bar Council Registration Number is required.');
                      return;
                    }
                    if (!formData.stateBarCouncil) {
                      setError('Please select your State Bar Council.');
                      return;
                    }
                    if (!formData.yearOfEnrollment) {
                      setError('Year of Enrollment is required.');
                      return;
                    }
                    if (formData.yearsOfExperience === '' || Number(formData.yearsOfExperience) < 0) {
                      setError('Years of practice experience is required.');
                      return;
                    }
                    if (!formData.languages || !formData.languages.length) {
                      setError('Please specify at least one language.');
                      return;
                    }
                    if (!formData.primaryCourt?.trim()) {
                      setError('Primary Court of practice is required.');
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
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.specializations || !formData.specializations.length) {
                      setError('Please select at least one legal specialization.');
                      return;
                    }
                    if (!Number(formData.consultationFee) || Number(formData.consultationFee) <= 0) {
                      setError('Please specify a valid 30-minute consultation fee.');
                      return;
                    }
                    setError('');
                    setStep(4);
                  }}
                  className="lp-btn-action lp-btn-primary"
                >
                  Continue to Documents <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Genuine Verification Documents Upload */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: '#e5c07b',
                }}
              >
                <ShieldCheck size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: '#d4af37' }} />
                <strong>Mandatory Verification Policy:</strong> Real Bar enrollment certificate and identification proof must be submitted. All advocate applications route to the administrative review council and remain <strong>PENDING</strong> until approved.
              </div>

              {/* Document 1: Bar Enrollment Certificate */}
              <div
                style={{
                  padding: '18px',
                  background: '#12141c',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                      1. Bar Enrollment Certificate *
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                      Official state bar council certificate of enrollment (PDF, PNG, or JPG up to 20MB)
                    </p>
                  </div>
                  {formData.documents.some((d) => d.type === 'Bar Enrollment Certificate') && (
                    <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, background: 'rgba(52, 211, 153, 0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      ✓ Attached
                    </span>
                  )}
                </div>

                {formData.documents.some((d) => d.type === 'Bar Enrollment Certificate') ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0a0b0e', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={20} color="#d4af37" />
                      <div>
                        <strong style={{ fontSize: '0.875rem', color: '#fff' }}>
                          {formData.documents.find((d) => d.type === 'Bar Enrollment Certificate')?.name}
                        </strong>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#a1a1aa' }}>
                          {formData.documents.find((d) => d.type === 'Bar Enrollment Certificate')?.sizeFormatted || 'Uploaded'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument('Bar Enrollment Certificate')}
                      style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      border: '2px dashed rgba(212, 175, 55, 0.35)',
                      borderRadius: '8px',
                      background: 'rgba(212, 175, 55, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <UploadCloud size={28} color="#d4af37" style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f2f6' }}>
                      Click to browse or drag & drop Bar Certificate
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '4px' }}>
                      Accepted: .pdf, .png, .jpg, .jpeg
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e, 'Bar Enrollment Certificate')}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Document 2: Bar Council ID Card / Certificate of Practice */}
              <div
                style={{
                  padding: '18px',
                  background: '#12141c',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                      2. Bar Council ID / Certificate of Practice *
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                      Current advocate photo ID card or All India Bar Examination (AIBE) pass certificate
                    </p>
                  </div>
                  {formData.documents.some((d) => d.type === 'Advocate Identity Card' || d.type === 'Bar ID / Registration Proof' || d.documentType === 'Advocate Identity Card') && (
                    <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, background: 'rgba(52, 211, 153, 0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      ✓ Attached
                    </span>
                  )}
                </div>

                {formData.documents.some((d) => d.type === 'Advocate Identity Card' || d.type === 'Bar ID / Registration Proof' || d.documentType === 'Advocate Identity Card') ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0a0b0e', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={20} color="#d4af37" />
                      <div>
                        <strong style={{ fontSize: '0.875rem', color: '#fff' }}>
                          {formData.documents.find((d) => d.type === 'Advocate Identity Card' || d.type === 'Bar ID / Registration Proof' || d.documentType === 'Advocate Identity Card')?.name}
                        </strong>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#a1a1aa' }}>
                          {formData.documents.find((d) => d.type === 'Advocate Identity Card' || d.type === 'Bar ID / Registration Proof' || d.documentType === 'Advocate Identity Card')?.sizeFormatted || 'Uploaded'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument('Advocate Identity Card')}
                      style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      border: '2px dashed rgba(212, 175, 55, 0.35)',
                      borderRadius: '8px',
                      background: 'rgba(212, 175, 55, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <UploadCloud size={28} color="#d4af37" style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f1f2f6' }}>
                      Click to browse or drag & drop Bar ID / Proof
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '4px' }}>
                      Accepted: .pdf, .png, .jpg, .jpeg
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e, 'Advocate Identity Card')}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {uploadingDoc && (
                <div style={{ textAlign: 'center', color: '#d4af37', fontSize: '0.85rem' }}>
                  ⏳ Uploading and validating document securely...
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button type="button" onClick={() => setStep(3)} className="lp-btn-action">
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    uploadingDoc ||
                    !formData.documents.some((d) => d.type === 'Bar Enrollment Certificate' || d.documentType === 'Bar Enrollment Certificate') ||
                    !formData.documents.some((d) => d.type === 'Advocate Identity Card' || d.type === 'Bar ID / Registration Proof' || d.documentType === 'Advocate Identity Card')
                  }
                  className="lp-btn-action lp-btn-primary"
                  style={{
                    padding: '12px 28px',
                    fontSize: '1rem',
                    opacity:
                      !formData.documents.some((d) => d.type === 'Bar Enrollment Certificate' || d.documentType === 'Bar Enrollment Certificate') ||
                      !formData.documents.some((d) => d.type === 'Advocate Identity Card' || d.type === 'Bar ID / Registration Proof' || d.documentType === 'Advocate Identity Card')
                        ? 0.6
                        : 1,
                    cursor:
                      !formData.documents.some((d) => d.type === 'Bar Enrollment Certificate' || d.documentType === 'Bar Enrollment Certificate') ||
                      !formData.documents.some((d) => d.type === 'Advocate Identity Card' || d.type === 'Bar ID / Registration Proof' || d.documentType === 'Advocate Identity Card')
                        ? 'not-allowed'
                        : 'pointer',
                  }}
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
