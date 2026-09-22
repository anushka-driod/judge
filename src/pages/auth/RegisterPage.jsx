import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUI } from '../../hooks/useUI';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import {
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  ArrowRight,
  Scale,
  Briefcase,
  FileText,
  Upload,
  CheckCircle,
  Navigation,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import './AuthPage.css';

const ALL_INDIAN_STATES = [
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Arunachal Pradesh', label: 'Arunachal Pradesh' },
  { value: 'Assam', label: 'Assam' },
  { value: 'Bihar', label: 'Bihar' },
  { value: 'Chhattisgarh', label: 'Chhattisgarh' },
  { value: 'Delhi', label: 'Delhi (NCR)' },
  { value: 'Goa', label: 'Goa' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Haryana', label: 'Haryana' },
  { value: 'Himachal Pradesh', label: 'Himachal Pradesh' },
  { value: 'Jharkhand', label: 'Jharkhand' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Manipur', label: 'Manipur' },
  { value: 'Meghalaya', label: 'Meghalaya' },
  { value: 'Mizoram', label: 'Mizoram' },
  { value: 'Nagaland', label: 'Nagaland' },
  { value: 'Odisha', label: 'Odisha' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Sikkim', label: 'Sikkim' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Tripura', label: 'Tripura' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'Uttarakhand', label: 'Uttarakhand' },
  { value: 'West Bengal', label: 'West Bengal' },
  { value: 'Jammu and Kashmir', label: 'Jammu and Kashmir' },
  { value: 'Chandigarh', label: 'Chandigarh' },
  { value: 'Puducherry', label: 'Puducherry' },
];

const INDIAN_STATES = ALL_INDIAN_STATES;

const PRACTICE_AREAS_OPTIONS = [
  'Consumer Protection & Disputes',
  'Cheque Bounce (NI Act Sec 138)',
  'Real Estate & RERA Claims',
  'Tenancy & Security Deposit',
  'Civil & Contract Law',
  'Labour & Employment Disputes',
  'Family & Matrimonial Law',
  'Criminal & Bail Matters',
  'Cyber Fraud & E-Commerce',
];

export function RegisterPage() {
  const { register, googleAuth } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();

  // Step 0: Selection ('choose_role' | 'candidate' | 'advocate')
  const [selectedRole, setSelectedRole] = useState('choose_role');

  // Candidate Form State
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    password: '',
    confirmPassword: '',
  });

  // Advocate Form State
  const [advocateForm, setAdvocateForm] = useState({
    name: '',
    email: '',
    phone: '',
    barCouncilState: 'Karnataka',
    barNumber: '',
    experienceYears: '3',
    primaryCourt: 'High Court of Karnataka',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    consultationFee: '800',
    practiceAreas: ['Consumer Protection & Disputes'],
    languages: ['English', 'Kannada'],
    profileBio: '',
    password: '',
    confirmPassword: '',
  });

  const [detectingGps, setDetectingGps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Geolocation Handler: Reverse geocodes real latitude & longitude automatically
  const handleUseCurrentLocation = (isAdvocate = false) => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let detectedCity = '';
        let detectedState = '';

        try {
          // Primary reverse geocoding via BigDataCloud client API (free, fast, no key)
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (res.ok) {
            const data = await res.json();
            detectedCity = data.city || data.locality || '';
            detectedState = data.principalSubdivision || '';
          }
        } catch (e) {
          console.warn('[GPS] Primary geocoding failed, trying secondary fallback:', e);
        }

        // Secondary fallback via Nominatim if needed
        if (!detectedCity || !detectedState) {
          try {
            const res2 = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            if (res2.ok) {
              const data2 = await res2.json();
              const addr = data2.address || {};
              detectedCity = detectedCity || addr.city || addr.town || addr.municipality || addr.state_district || '';
              detectedState = detectedState || addr.state || '';
            }
          } catch (e) {
            console.warn('[GPS] Secondary geocoding failed:', e);
          }
        }

        setDetectingGps(false);

        // Normalize state to match select dropdown
        let matchedState = '';
        if (detectedState) {
          const lowerDetected = detectedState.toLowerCase();
          const match = ALL_INDIAN_STATES.find(
            (s) => s.value.toLowerCase() === lowerDetected || lowerDetected.includes(s.value.toLowerCase())
          );
          matchedState = match ? match.value : detectedState;
        }

        const finalCity = detectedCity || (matchedState ? matchedState : 'Bengaluru');
        const finalState = matchedState || 'Karnataka';

        if (isAdvocate) {
          setAdvocateForm((prev) => ({
            ...prev,
            city: finalCity,
            state: finalState,
            barCouncilState: finalState,
          }));
        } else {
          setCandidateForm((prev) => ({
            ...prev,
            city: finalCity,
            state: finalState,
          }));
        }

        showToast(`Live location detected: ${finalCity}, ${finalState}`, 'success');
      },
      (err) => {
        setDetectingGps(false);
        console.warn('[GPS] Geolocation error:', err);
        showToast('Could not access live GPS. Please enable browser location permissions.', 'info');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Toggle practice area chips
  const togglePracticeArea = (area) => {
    setAdvocateForm((prev) => {
      const current = prev.practiceAreas || [];
      if (current.includes(area)) {
        return { ...prev, practiceAreas: current.filter((a) => a !== area) };
      }
      return { ...prev, practiceAreas: [...current, area] };
    });
  };

  // Submit Candidate Registration
  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (candidateForm.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (candidateForm.password !== candidateForm.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    const phoneDigits = candidateForm.phone.replace(/[^\d]/g, '');
    if (phoneDigits.length < 10) {
      setError('Please enter a valid 10-digit mobile number for SMS verification.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        ...candidateForm,
        accountType: 'candidate',
        location: {
          country: candidateForm.country,
          state: candidateForm.state,
          city: candidateForm.city,
        },
      });

      showToast('Account created! Please enter verification code.', 'info');
      navigate(`/verify-email?email=${encodeURIComponent(candidateForm.email)}`, {
        state: {
          email: candidateForm.email,
          phone: candidateForm.phone,
          maskedEmail: res?.maskedEmail,
          maskedPhone: res?.maskedPhone,
          message: res?.message || 'Verification code dispatched to your registered contact details.',
        },
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Advocate Registration
  const handleAdvocateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (advocateForm.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (advocateForm.password !== advocateForm.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (!advocateForm.enrollmentNumber.trim()) {
      setError('Bar Council Enrollment Number is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: advocateForm.name,
        email: advocateForm.email,
        phone: advocateForm.phone,
        password: advocateForm.password,
        accountType: 'advocate',
        city: advocateForm.city,
        state: advocateForm.state,
        location: {
          country: advocateForm.country,
          state: advocateForm.state,
          city: advocateForm.city,
        },
        advocateDetails: {
          barCouncil: advocateForm.barCouncil,
          enrollmentNumber: advocateForm.enrollmentNumber.trim(),
          enrollmentState: advocateForm.enrollmentState,
          enrollmentYear: advocateForm.enrollmentYear,
          practiceAreas: advocateForm.practiceAreas,
          experienceYears: Number(advocateForm.experienceYears),
          officeAddress: advocateForm.officeAddress,
          documents: [
            { id: `doc-cert-${Date.now()}`, name: advocateForm.certificateDoc, type: 'Bar Enrollment Certificate' },
            { id: `doc-id-${Date.now()}`, name: advocateForm.advocateIdDoc, type: 'Bar Council Photo ID' },
          ],
        },
      });

      showToast('Advocate application submitted! Please enter verification code.', 'info');
      navigate(`/verify-email?email=${encodeURIComponent(advocateForm.email)}`, {
        state: {
          email: advocateForm.email,
          phone: advocateForm.phone,
          maskedEmail: res?.maskedEmail,
          maskedPhone: res?.maskedPhone,
          message: res?.message || 'Verification code dispatched to your registered mobile and email.',
        },
      });
    } catch (err) {
      setError(err.message || 'Advocate registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In button on registration screen
  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      const mockGoogleProfile = {
        email: 'google.newuser@example.com',
        name: 'Ananya Sharma',
        picture: null,
      };
      const res = await googleAuth(mockGoogleProfile);
      if (res.isNewUser) {
        // Pre-fill email and switch to Candidate or Advocate form
        setCandidateForm((prev) => ({ ...prev, email: res.email, name: res.name }));
        setAdvocateForm((prev) => ({ ...prev, email: res.email, name: res.name }));
        showToast('Google verified! Please choose your account type.', 'info');
      } else {
        showToast('Existing Google account found. Logging you in!', 'success');
        navigate('/chat');
      }
    } catch (err) {
      setError(err.message || 'Google signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page animate-fade-in">
      {/* Step 0: Choose Account Type */}
      {selectedRole === 'choose_role' && (
        <div className="role-selection-view">
          <div className="auth-header text-center">
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-desc">How would you like to use VidhiSetu?</p>
          </div>

          <div className="role-cards-grid">
            <div
              className="role-card"
              onClick={() => setSelectedRole('candidate')}
              tabIndex={0}
              role="button"
            >
              <div className="role-card-icon">
                <User size={28} />
              </div>
              <h3 className="role-card-title">👤 Candidate</h3>
              <p className="role-card-desc">
                Get evidence-based AI legal guidance, research Indian court precedents, and connect with advocates.
              </p>
            </div>

            <div
              className="role-card"
              onClick={() => setSelectedRole('advocate')}
              tabIndex={0}
              role="button"
            >
              <div className="role-card-icon icon-advocate">
                <Scale size={28} />
              </div>
              <h3 className="role-card-title">⚖️ Advocate</h3>
              <p className="role-card-desc">
                Provide certified legal services, review client dispute action plans, and attend verified consultations.
              </p>
            </div>
          </div>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="google-signin-btn"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <svg className="google-icon-svg" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      )}

      {/* Option 1: Candidate Registration Form */}
      {selectedRole === 'candidate' && (
        <div className="candidate-registration-view">
          <button
            type="button"
            className="role-back-btn"
            onClick={() => setSelectedRole('choose_role')}
          >
            <ArrowLeft size={14} /> Change Account Type
          </button>

          <div className="auth-header">
            <h2 className="auth-title">Register as Candidate</h2>
            <p className="auth-desc">Simple, secure legal assistance for everyday citizens.</p>
          </div>

          {error && <Alert type="danger" onClose={() => setError('')}>{error}</Alert>}

          <form onSubmit={handleCandidateSubmit} className="auth-form">
            <Input
              label="Full Legal Name"
              placeholder="e.g. Ramesh Kumar"
              icon={User}
              value={candidateForm.name}
              onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
              required
            />

            <div className="form-row-2">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                icon={Mail}
                value={candidateForm.email}
                onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                helperText="Verification code will be sent here"
                required
              />

              <Input
                label="Mobile Number"
                type="tel"
                placeholder="+91 98765 43210"
                icon={Phone}
                value={candidateForm.phone}
                onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                required
              />
            </div>

            {/* Location Section with GPS Button */}
            <div className="location-row-container">
              <div className="location-input-grid">
                <Select
                  label="State / Union Territory"
                  options={INDIAN_STATES}
                  value={candidateForm.state}
                  onChange={(e) => setCandidateForm({ ...candidateForm, state: e.target.value })}
                />
                <Input
                  label="City / District"
                  placeholder="e.g. Bengaluru, Pune"
                  icon={MapPin}
                  value={candidateForm.city}
                  onChange={(e) => setCandidateForm({ ...candidateForm, city: e.target.value })}
                  required
                />
              </div>

              <button
                type="button"
                className="btn-gps-location"
                onClick={() => handleUseCurrentLocation(false)}
                disabled={detectingGps}
              >
                <Navigation size={13} className={detectingGps ? 'animate-spin' : ''} />
                <span>{detectingGps ? 'Detecting GPS...' : '📍 Use my current location'}</span>
              </button>
            </div>

            <div className="form-row-2">
              <Input
                label="Create Password"
                type="password"
                placeholder="Min. 8 characters"
                icon={Lock}
                value={candidateForm.password}
                onChange={(e) => setCandidateForm({ ...candidateForm, password: e.target.value })}
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                icon={Lock}
                value={candidateForm.confirmPassword}
                onChange={(e) => setCandidateForm({ ...candidateForm, confirmPassword: e.target.value })}
                required
              />
            </div>

            <div className="terms-agreement">
              <label className="remember-me-checkbox">
                <input type="checkbox" required defaultChecked />
                <span>
                  I agree to VidhiSetu Terms. I understand email verification is mandatory before account activation.
                </span>
              </label>
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
              Continue to Email Verification
            </Button>
          </form>
        </div>
      )}

      {/* Option 2: Advocate Registration Form */}
      {selectedRole === 'advocate' && (
        <div className="advocate-registration-view">
          <button
            type="button"
            className="role-back-btn"
            onClick={() => setSelectedRole('choose_role')}
          >
            <ArrowLeft size={14} /> Change Account Type
          </button>

          <div className="auth-header">
            <h2 className="auth-title">Register as Advocate</h2>
            <p className="auth-desc">
              Rigorous verification for certified advocates practicing before Indian courts.
            </p>
          </div>

          {error && <Alert type="danger" onClose={() => setError('')}>{error}</Alert>}

          {/* Advocate Steps Navigation */}
          <div className="advocate-steps-tabs">
            <button
              type="button"
              className={`adv-step-tab ${advocateStep === 1 ? 'adv-step-tab-active' : ''}`}
              onClick={() => setAdvocateStep(1)}
            >
              1. Personal & Location
            </button>
            <button
              type="button"
              className={`adv-step-tab ${advocateStep === 2 ? 'adv-step-tab-active' : ''}`}
              onClick={() => setAdvocateStep(2)}
            >
              2. Bar Credentials
            </button>
            <button
              type="button"
              className={`adv-step-tab ${advocateStep === 3 ? 'adv-step-tab-active' : ''}`}
              onClick={() => setAdvocateStep(3)}
            >
              3. Verification Documents
            </button>
          </div>

          <form onSubmit={handleAdvocateSubmit} className="auth-form">
            {/* Step 1: Personal & Location */}
            {advocateStep === 1 && (
              <>
                <Input
                  label="Advocate Full Name (As registered with Bar Council)"
                  placeholder="e.g. Adv. Vikram Malhotra"
                  icon={User}
                  value={advocateForm.name}
                  onChange={(e) => setAdvocateForm({ ...advocateForm, name: e.target.value })}
                  required
                />

                <div className="form-row-2">
                  <Input
                    label="Official Email Address"
                    type="email"
                    placeholder="counsel@legalchambers.com"
                    icon={Mail}
                    value={advocateForm.email}
                    onChange={(e) => setAdvocateForm({ ...advocateForm, email: e.target.value })}
                    required
                  />

                  <Input
                    label="Mobile Number"
                    type="tel"
                    placeholder="+91 98765 12345"
                    icon={Phone}
                    value={advocateForm.phone}
                    onChange={(e) => setAdvocateForm({ ...advocateForm, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="location-row-container">
                  <div className="location-input-grid">
                    <Select
                      label="Primary Jurisdiction / State"
                      options={INDIAN_STATES}
                      value={advocateForm.state}
                      onChange={(e) => setAdvocateForm({ ...advocateForm, state: e.target.value })}
                    />
                    <Input
                      label="City of Practice"
                      placeholder="e.g. Mumbai, Bengaluru"
                      icon={MapPin}
                      value={advocateForm.city}
                      onChange={(e) => setAdvocateForm({ ...advocateForm, city: e.target.value })}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-gps-location"
                    onClick={() => handleUseCurrentLocation(true)}
                    disabled={detectingGps}
                  >
                    <Navigation size={13} className={detectingGps ? 'animate-spin' : ''} />
                    <span>{detectingGps ? 'Detecting GPS...' : '📍 Use my current location'}</span>
                  </button>
                </div>

                <div className="form-row-2">
                  <Input
                    label="Create Password"
                    type="password"
                    placeholder="Min. 8 characters"
                    icon={Lock}
                    value={advocateForm.password}
                    onChange={(e) => setAdvocateForm({ ...advocateForm, password: e.target.value })}
                    required
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Re-enter password"
                    icon={Lock}
                    value={advocateForm.confirmPassword}
                    onChange={(e) => setAdvocateForm({ ...advocateForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    if (!advocateForm.name || !advocateForm.email || !advocateForm.password) {
                      setError('Please fill in required personal details.');
                      return;
                    }
                    setError('');
                    setAdvocateStep(2);
                  }}
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Next: Enter Bar Credentials
                </Button>
              </>
            )}

            {/* Step 2: Professional Details */}
            {advocateStep === 2 && (
              <>
                <div className="form-row-2">
                  <Input
                    label="Bar Enrollment Number"
                    placeholder="e.g. MAH/4590/2018 or KAR/1842/2014"
                    icon={Scale}
                    value={advocateForm.enrollmentNumber}
                    onChange={(e) => setAdvocateForm({ ...advocateForm, enrollmentNumber: e.target.value })}
                    helperText="Mandatory enrollment ID for statutory registry checks"
                    required
                  />

                  <Input
                    label="Year of Enrollment"
                    type="number"
                    min={1960}
                    max={new Date().getFullYear()}
                    value={advocateForm.enrollmentYear}
                    onChange={(e) => setAdvocateForm({ ...advocateForm, enrollmentYear: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <Input
                    label="State Bar Council / Association"
                    placeholder="e.g. Bar Council of Maharashtra & Goa"
                    value={advocateForm.barCouncil}
                    onChange={(e) => setAdvocateForm({ ...advocateForm, barCouncil: e.target.value })}
                    required
                  />

                  <Input
                    label="Years of Experience"
                    type="number"
                    min={0}
                    max={60}
                    value={advocateForm.experienceYears}
                    onChange={(e) => setAdvocateForm({ ...advocateForm, experienceYears: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Office / Chamber Address"
                  placeholder="e.g. #402, High Court Chambers, Fort, Mumbai"
                  value={advocateForm.officeAddress}
                  onChange={(e) => setAdvocateForm({ ...advocateForm, officeAddress: e.target.value })}
                />

                {/* Practice Areas Multi-Select */}
                <div className="practice-areas-container">
                  <label className="input-label">Areas of Practice (Select all that apply)</label>
                  <div className="practice-chips-grid">
                    {PRACTICE_AREAS_OPTIONS.map((area) => {
                      const isSelected = (advocateForm.practiceAreas || []).includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          className={`practice-chip ${isSelected ? 'practice-chip-selected' : ''}`}
                          onClick={() => togglePracticeArea(area)}
                        >
                          {isSelected && '✓ '} {area}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="step-nav-buttons">
                  <Button type="button" variant="secondary" size="md" onClick={() => setAdvocateStep(1)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (!advocateForm.enrollmentNumber) {
                        setError('Enrollment Number is required.');
                        return;
                      }
                      setError('');
                      setAdvocateStep(3);
                    }}
                    icon={ArrowRight}
                    iconPosition="right"
                  >
                    Next: Upload Documents
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Document Verification Uploads */}
            {advocateStep === 3 && (
              <>
                <div className="doc-upload-block">
                  <span className="doc-upload-label">1. Bar Enrollment Certificate</span>
                  <span className="doc-upload-helper">
                    Issued by your State Bar Council upon formal enrollment (PDF / JPG up to 10MB)
                  </span>
                  <div className="doc-item-row">
                    <FileText size={20} className="doc-icon" />
                    <span className="doc-name">{advocateForm.certificateDoc}</span>
                    <span className="doc-status-tag">Ready for upload</span>
                  </div>
                </div>

                <div className="doc-upload-block">
                  <span className="doc-upload-label">2. Advocate Identity Card</span>
                  <span className="doc-upload-helper">
                    Valid photo identity card issued by the Bar Council or High Court Bar Association
                  </span>
                  <div className="doc-item-row">
                    <FileText size={20} className="doc-icon" />
                    <span className="doc-name">{advocateForm.advocateIdDoc}</span>
                    <span className="doc-status-tag">Ready for upload</span>
                  </div>
                </div>

                <div className="alert-box-notice" style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.8rem', color: '#166534', marginBottom: '1rem' }}>
                  <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  <strong>Strict Privacy & Verification Policy:</strong> Uploaded credentials are used strictly for compliance checks and are never shared publicly.
                </div>

                <div className="step-nav-buttons">
                  <Button type="button" variant="secondary" size="md" onClick={() => setAdvocateStep(2)}>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    icon={CheckCircle}
                    iconPosition="right"
                  >
                    Submit Application & Verify Email
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      <div className="auth-footer">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
