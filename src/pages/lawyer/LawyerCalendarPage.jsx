import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  Video,
  Phone,
  MessageSquare,
  Save,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerCalendarPage() {
  const [availability, setAvailability] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const avail = await lawyerPortalClient.getAvailability();
      if (avail && avail.availability) {
        setAvailability(avail.availability);
        setBookedSlots(avail.bookedSlots || []);
      }
      const consults = await lawyerPortalClient.getConsultations();
      setConsultations(consults?.consultations || []);
    } catch (err) {
      console.warn('Calendar fetch notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const handleDayToggle = (day) => {
    setAvailability((prev) => {
      const current = prev.workingDays || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...prev, workingDays: updated };
    });
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await lawyerPortalClient.updateAvailability(availability);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update availability: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#fff' }}>
            Calendar & Consultation Slots
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Configure active hours, prevent double bookings, and view confirmed appointments
          </p>
        </div>

        <button type="button" onClick={fetchCalendar} className="lp-btn-action">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Availability Settings */}
        <div className="lp-card">
          <div className="lp-card-header">
            <h3 className="lp-card-title">
              <Clock size={20} color="#3b82f6" />
              <span>Chambers Working Hours & Schedule</span>
            </h3>
            {saveSuccess && (
              <span className="lp-badge lp-badge-verified">
                <CheckCircle size={13} /> Updated
              </span>
            )}
          </div>

          <form onSubmit={handleSaveAvailability}>
            {/* Days Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '10px' }}>
                Available Consultation Days
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {daysOfWeek.map((day) => {
                  const isChecked = (availability?.workingDays || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isChecked ? '#3b82f6' : '#22304d'}`,
                        backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.2)' : '#101626',
                        color: isChecked ? '#93c5fd' : '#94a3b8',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Ranges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Chambers Opening Time
                </label>
                <input
                  type="time"
                  value={availability?.startTime || '10:00'}
                  onChange={(e) => setAvailability((prev) => ({ ...prev, startTime: e.target.value }))}
                  style={{ width: '100%', padding: '10px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Chambers Closing Time
                </label>
                <input
                  type="time"
                  value={availability?.endTime || '18:30'}
                  onChange={(e) => setAvailability((prev) => ({ ...prev, endTime: e.target.value }))}
                  style={{ width: '100%', padding: '10px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                />
              </div>
            </div>

            {/* Slot & Buffer Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Consultation Duration (Minutes)
                </label>
                <select
                  value={availability?.slotDuration || 30}
                  onChange={(e) => setAvailability((prev) => ({ ...prev, slotDuration: parseInt(e.target.value, 10) }))}
                  style={{ width: '100%', padding: '10px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes (Recommended)</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Buffer Between Sessions
                </label>
                <select
                  value={availability?.bufferMinutes || 15}
                  onChange={(e) => setAvailability((prev) => ({ ...prev, bufferMinutes: parseInt(e.target.value, 10) }))}
                  style={{ width: '100%', padding: '10px', background: '#101626', border: '1px solid #22304d', borderRadius: '8px', color: '#fff' }}
                >
                  <option value={5}>5 Minutes</option>
                  <option value={15}>15 Minutes (Buffer)</option>
                  <option value={30}>30 Minutes</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={saving}
                className="lp-btn-action lp-btn-primary"
              >
                <Save size={16} />
                <span>{saving ? 'Updating Schedule...' : 'Save Availability'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Confirmed Appointments Docket */}
        <div className="lp-card">
          <div className="lp-card-header">
            <h3 className="lp-card-title">
              <CalendarIcon size={20} color="#10b981" />
              <span>Confirmed Sessions ({consultations.length})</span>
            </h3>
          </div>

          {consultations.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '30px 0' }}>
              No confirmed appointments booked yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {consultations.map((c) => (
                <div
                  key={c.id}
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
                  <div>
                    <strong style={{ fontSize: '0.9375rem', color: '#fff' }}>{c.clientName}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                      {c.caseTitle}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '4px' }}>
                      📅 {c.requestedDate} • ⏰ {c.requestedTime} ({c.consultationType.toUpperCase()})
                    </div>
                  </div>

                  <Link
                    to={`/lawyer/cases/${c.caseId}`}
                    className="lp-btn-action"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    Open Case
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Double Booking Prevention Notice */}
          <div
            style={{
              marginTop: '24px',
              padding: '12px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: '#6ee7b7',
              lineHeight: 1.4,
            }}
          >
            🛡️ <strong>Double-Booking Prevention Active:</strong> Vidhi Setu backend automatically cross-references all booked time slots and blocks conflicting requests across both client and lawyer portals.
          </div>
        </div>
      </div>
    </div>
  );
}

export default LawyerCalendarPage;
