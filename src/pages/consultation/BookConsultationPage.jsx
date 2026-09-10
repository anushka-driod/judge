import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { lawyerService } from '../../services/lawyerService';
import { consultationService } from '../../services/consultationService';
import { useUI } from '../../hooks/useUI';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { TextArea } from '../../components/common/TextArea';
import { Loading } from '../../components/common/Loading';
import { Stepper } from '../../components/common/Stepper';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import './Consultation.css';

export function BookConsultationPage() {
  const { lawyerId } = useParams();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId');
  const navigate = useNavigate();
  const { showToast } = useUI();

  const [lawyer, setLawyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Booking fields
  const [selectedDate, setSelectedDate] = useState('2026-09-15');
  const [selectedSlot, setSelectedSlot] = useState('02:30 PM');
  const [consultMode, setConsultMode] = useState('Video Consultation');
  const [clientNotes, setClientNotes] = useState('');

  useEffect(() => {
    async function load() {
      const data = await lawyerService.getLawyerById(lawyerId);
      setLawyer(data);
      if (data?.timeSlots?.length) setSelectedSlot(data.timeSlots[0]);
      setLoading(false);
    }
    load();
  }, [lawyerId]);

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot) {
      alert('Please select both date and time slot.');
      return;
    }

    setBookingLoading(true);
    try {
      const booking = await consultationService.bookConsultation({
        lawyerId,
        caseId: caseId || 'case-101',
        date: selectedDate,
        timeSlot: selectedSlot,
        mode: consultMode,
        notes: clientNotes,
      });

      showToast('Consultation successfully scheduled!', 'success');
      navigate(`/consultation/confirmed/${booking.bookingId}`);
    } catch (err) {
      alert('Failed to book consultation: ' + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <Loading text="Preparing advocate availability calendar..." />;
  if (!lawyer) return <div>Lawyer record not found</div>;

  const consultationModes = [
    {
      id: 'Video Consultation',
      label: 'Secure Video Call',
      desc: 'Screen share documents and talk face-to-face via encrypted VidhiSetu room',
      icon: Video,
    },
    {
      id: 'Phone Consultation',
      label: 'Audio Phone Call',
      desc: 'Advocate calls your registered mobile number directly',
      icon: Phone,
    },
  ];

  return (
    <div className="consultation-booking-page animate-fade-in">
      <Link to={`/lawyers/${lawyerId}${caseId ? `?caseId=${caseId}` : ''}`} className="back-nav-link">
        <ArrowLeft size={16} /> Back to Advocate Profile
      </Link>

      <div className="booking-page-header">
        <h1 className="booking-title">Book Legal Consultation</h1>
        <p className="booking-subtitle">
          Schedule a 1-on-1 consultation with <strong>{lawyer.name}</strong> ({lawyer.court}).
        </p>
      </div>

      <div className="booking-layout-grid">
        <div className="booking-form-col">
          {/* Step 1: Select Consultation Mode */}
          <Card className="booking-step-card">
            <div className="step-card-header">
              <span className="step-num">1</span>
              <h3 className="card-title">Choose Consultation Mode</h3>
            </div>
            <div className="modes-selection-grid">
              {consultationModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = consultMode === mode.id;
                return (
                  <div
                    key={mode.id}
                    className={`mode-card ${isSelected ? 'mode-card-selected' : ''}`}
                    onClick={() => setConsultMode(mode.id)}
                  >
                    <div className="mode-radio-icon">
                      <Icon size={20} />
                    </div>
                    <div>
                      <strong className="mode-name">{mode.label}</strong>
                      <p className="mode-desc">{mode.desc}</p>
                    </div>
                    {isSelected && <CheckCircle2 size={18} className="mode-check" />}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Step 2: Date & Available Slots */}
          <Card className="booking-step-card">
            <div className="step-card-header">
              <span className="step-num">2</span>
              <h3 className="card-title">Select Date & Time Slot</h3>
            </div>

            <div className="date-picker-row">
              <Input
                label="Choose Consultation Date"
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="slots-picker-block">
              <label className="input-label">Available Time Slots for {selectedDate}</label>
              <div className="slots-grid">
                {(lawyer.timeSlots || ['10:00 AM', '02:30 PM', '04:00 PM']).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`slot-chip ${selectedSlot === slot ? 'slot-chip-selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <Clock size={14} />
                    <span>{slot}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Step 3: Brief Notes for the Advocate */}
          <Card className="booking-step-card">
            <div className="step-card-header">
              <span className="step-num">3</span>
              <h3 className="card-title">Case Brief & Specific Questions (Optional)</h3>
            </div>
            <TextArea
              placeholder="What specific legal questions would you like the advocate to address during the call?"
              rows={3}
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              helperText="The advocate will review your notes before the call starts."
            />
          </Card>
        </div>

        {/* Right Column: Appointment Summary & Pay Later confirmation */}
        <div className="booking-summary-col">
          <Card className="booking-summary-card">
            <h3 className="card-title">Consultation Summary</h3>

            <div className="lawyer-summary-preview">
              <img src={lawyer.photoUrl} alt={lawyer.name} className="summary-lawyer-avatar" />
              <div>
                <strong className="summary-lawyer-name">{lawyer.name}</strong>
                <p className="summary-lawyer-sub">{lawyer.court}</p>
                <span className="bar-verified-badge" style={{ fontSize: '0.6875rem' }}>
                  <ShieldCheck size={12} /> {lawyer.barCouncilId}
                </span>
              </div>
            </div>

            <div className="summary-details-list">
              <div className="summary-row">
                <span>Date:</span>
                <strong>{selectedDate}</strong>
              </div>
              <div className="summary-row">
                <span>Time Slot:</span>
                <strong>{selectedSlot}</strong>
              </div>
              <div className="summary-row">
                <span>Mode:</span>
                <strong>{consultMode}</strong>
              </div>
              <div className="summary-row">
                <span>Duration:</span>
                <strong>30 Minutes</strong>
              </div>
              <div className="summary-row summary-total-row">
                <span>Consultation Fee:</span>
                <span className="summary-total-price">₹{lawyer.consultationFee}</span>
              </div>
            </div>

            <div className="summary-payment-terms">
              <span>🛡️ 100% Protected by VidhiSetu Fair Consultation Guarantee</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={bookingLoading}
              onClick={handleConfirmBooking}
              icon={ArrowRight}
              iconPosition="right"
            >
              Confirm & Book Consultation
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
