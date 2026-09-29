import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  User,
  ShieldCheck,
  IndianRupee,
  Save,
  CheckCircle,
  Briefcase,
  MapPin,
  Languages,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerProfilePage() {
  const { lawyer, setLawyer } = useOutletContext();
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    photoUrl: '',
    location_city: '',
    primary_court: '',
    primary_jurisdiction: '',
    profile_bio: '',
    fee_schedule: {
      chat: 600,
      voice: 900,
      video: 1200,
      in_person: 2000,
    },
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (lawyer) {
      setProfile({
        name: lawyer.name || '',
        phone: lawyer.phone || '',
        photoUrl: lawyer.photoUrl || '',
        location_city: lawyer.location_city || '',
        primary_court: lawyer.primary_court || '',
        primary_jurisdiction: lawyer.primary_jurisdiction || '',
        profile_bio: lawyer.profile_bio || '',
        fee_schedule: lawyer.fee_schedule || {
          chat: 600,
          voice: 900,
          video: 1200,
          in_person: 2000,
        },
      });
    }
  }, [lawyer]);

  const handleFeeChange = (type, val) => {
    const num = parseInt(val, 10) || 0;
    setProfile((prev) => ({
      ...prev,
      fee_schedule: {
        ...prev.fee_schedule,
        [type]: num,
      },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const updated = await lawyerPortalClient.updateProfile({
        ...profile,
        consultation_fee: profile.fee_schedule.video,
      });
      if (setLawyer && updated.lawyer) {
        setLawyer(updated.lawyer);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#fff' }}>
            Chambers Profile & Fee Schedule
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Configure your professional public directory profile and consultation rates
          </p>
        </div>

        {lawyer?.verification_status === 'VERIFIED' && (
          <span className="lp-badge lp-badge-verified" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
            <ShieldCheck size={16} /> ✓ VERIFIED LAWYER
          </span>
        )}
      </div>

      <form onSubmit={handleSave}>
        {/* Chambers Identity */}
        <div className="lp-card">
          <div className="lp-card-header">
            <h3 className="lp-card-title">
              <User size={18} color="#60a5fa" />
              <span>Chambers Identity & Credentials</span>
            </h3>
            {success && (
              <span className="lp-badge lp-badge-verified">
                <CheckCircle size={13} /> Saved
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                style={{ width: '100%', padding: '10px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Chambers Phone
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                style={{ width: '100%', padding: '10px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                City / Location
              </label>
              <input
                type="text"
                value={profile.location_city}
                onChange={(e) => setProfile({ ...profile, location_city: e.target.value })}
                style={{ width: '100%', padding: '10px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Primary Court of Practice
              </label>
              <input
                type="text"
                value={profile.primary_court}
                onChange={(e) => setProfile({ ...profile, primary_court: e.target.value })}
                style={{ width: '100%', padding: '10px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Professional Bio
            </label>
            <textarea
              rows={4}
              value={profile.profile_bio}
              onChange={(e) => setProfile({ ...profile, profile_bio: e.target.value })}
              style={{ width: '100%', padding: '10px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff', lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* Dynamic Consultation Fee Schedule (INR) */}
        <div className="lp-card">
          <div className="lp-card-header">
            <h3 className="lp-card-title">
              <IndianRupee size={18} color="#d4af37" />
              <span>Consultation Rates Schedule (INR ₹ per 30-min session)</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Transparently displayed before user booking
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '14px' }}>
            <div style={{ background: '#101626', padding: '14px', borderRadius: '8px', border: '1px solid #22304d' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                Chat Consultation
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#d4af37', fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  value={profile.fee_schedule?.chat || 600}
                  onChange={(e) => handleFeeChange('chat', e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#090d16', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ background: '#101626', padding: '14px', borderRadius: '8px', border: '1px solid #22304d' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                Voice Consultation
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#d4af37', fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  value={profile.fee_schedule?.voice || 900}
                  onChange={(e) => handleFeeChange('voice', e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#090d16', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ background: '#101626', padding: '14px', borderRadius: '8px', border: '1px solid #3b82f6' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '6px' }}>
                Video Consultation
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#d4af37', fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  value={profile.fee_schedule?.video || 1200}
                  onChange={(e) => handleFeeChange('video', e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#090d16', border: '1px solid #3b82f6', borderRadius: '6px', color: '#fff', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ background: '#101626', padding: '14px', borderRadius: '8px', border: '1px solid #22304d' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                In-Person Chambers
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#d4af37', fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  min="200"
                  max="50000"
                  value={profile.fee_schedule?.in_person || 2000}
                  onChange={(e) => handleFeeChange('in_person', e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#090d16', border: '1px solid #22304d', borderRadius: '6px', color: '#fff', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            type="submit"
            disabled={saving}
            className="lp-btn-action lp-btn-primary"
            style={{ padding: '12px 28px', fontSize: '1rem' }}
          >
            <Save size={18} />
            <span>{saving ? 'Saving Chambers Profile...' : 'Save Chambers Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default LawyerProfilePage;
