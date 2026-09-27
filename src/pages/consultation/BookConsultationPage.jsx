import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { lawyerService } from '../../services/lawyerService';
import { consultationService } from '../../services/consultationService';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import paymentService from '../../services/paymentService';
import { PaymentModal } from '../../components/payment/PaymentModal';
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
  const [selectedDate, setSelectedDate] = useState('2026-09-28');
  const [selectedSlot, setSelectedSlot] = useState('02:30 PM');
  const [consultMode, setConsultMode] = useState('Video Consultation');
  const [clientNotes, setClientNotes] = useState('');
  const [consentSummary, setConsentSummary] = useState(true);
  const [consentedDocs, setConsentedDocs] = useState(['doc-01']);

  const [activeOrder, setActiveOrder] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await lawyerService.getLawyerById(lawyerId);
      setLawyer(data);
      if (data?.timeSlots?.length) setSelectedSlot(data.timeSlots[0]);
      setLoading(false);
    }
    load();
  }, [lawyerId]);

  const getDynamicFee = (modeName) => {
    if (!lawyer) return 1000;
    const schedule = lawyer.fee_schedule || lawyer.feeSchedule;
    if (schedule) {
      if (modeName === 'Chat Consultation' && schedule.chat) return schedule.chat;
      if (modeName === 'Phone Consultation' && schedule.voice) return schedule.voice;
      if (modeName === 'Video Consultation' && schedule.video) return schedule.video;
      if (modeName === 'In-Person Consultation' && schedule.in_person) return schedule.in_person;
    }
    return lawyer.consultationFee || lawyer.consultation_fee || 1000;
  };

  const baseFee = getDynamicFee(consultMode);
  const platformFee = Math.round(baseFee * 0.10);
  const gstAmount = Math.round(baseFee * 0.18);
  const totalPayable = baseFee + gstAmount;

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot) {
      alert('Please select both date and time slot.');
      return;
    }

    setBookingLoading(true);
    setPaymentError(null);
    try {
      // 1. Explicitly grant client consent with scoped document IDs
      const targetCaseId = caseId || 'case-101';
      try {
        await lawyerPortalClient.grantConsent(targetCaseId, {
          lawyerId,
          sharedDocumentIds: consentedDocs,
          consentScope: consentSummary ? ['case_summary', 'documents', 'chat'] : ['documents', 'chat'],
        });
      } catch (cErr) {
        console.warn('Consent sync note:', cErr.message);
      }

      // 2. Initiate server-side payment order
      const initRes = await paymentService.initiatePayment({
        caseId: targetCaseId,
        lawyerId,
        consultationMode: consultMode,
        scheduledDate,
        timeSlot: selectedSlot,
        userNotes: clientNotes,
      });

      if (!initRes || !initRes.success || !initRes.order) {
        throw new Error(initRes?.error || 'Failed to initiate payment with gateway.');
      }

      // 3. Open secure payment modal
      setActiveOrder(initRes.order);
    } catch (err) {
      setPaymentError(err.message || 'Payment initiation failed.');
      showToast(err.message || 'Payment initiation failed.', 'danger');
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePaymentSuccess = async (verifyRes) => {
    setActiveOrder(null);
    showToast('Payment verified successfully! Consultation confirmed.', 'success');

    try {
      const booking = await consultationService.bookConsultation({
        lawyerId,
        caseId: caseId || 'case-101',
        date: selectedDate,
        timeSlot: selectedSlot,
        mode: consultMode,
        notes: clientNotes,
        transactionRef: verifyRes.payment?.paymentId || verifyRes.payment?.transactionRef,
      });

      navigate(`/consultation/confirmed/${booking.bookingId || verifyRes.consultation?.id || 'ref-confirmed'}`);
    } catch (bErr) {
      navigate(`/consultation/confirmed/${verifyRes.consultation?.id || 'ref-confirmed'}`);
    }
  };

  const handlePaymentFailure = (failData) => {
    setActiveOrder(null);
    setPaymentError(failData.error || 'Payment was declined or cancelled. You can retry with another method.');
    showToast('Payment unsuccessful. Your slot was not booked.', 'danger');
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

          {/* Step 4: Client Explicit Consent & Document Authorization */}
          <Card className="booking-step-card" style={{ border: '1px solid #3b82f6' }}>
            <div className="step-card-header">
              <span className="step-num" style={{ background: '#2563eb', color: '#fff' }}>4</span>
              <div>
                <h3 className="card-title">Explicit Case & Document Access Consent</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                  Select strictly which case information the advocate may access in their chambers workspace.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={consentSummary}
                  onChange={(e) => setConsentSummary(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong>Case Summary & Legal Issue Narration</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Authorizes advocate to review your case facts and AI-extracted statutory issues.
                  </p>
                </div>
              </label>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                  Authorize Specific Case Documents:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={consentedDocs.includes('doc-01')}
                      onChange={(e) => {
                        if (e.target.checked) setConsentedDocs((prev) => [...prev, 'doc-01']);
                        else setConsentedDocs((prev) => prev.filter((d) => d !== 'doc-01'));
                      }}
                    />
                    <span>📄 Amazon_Invoice_INV2026.pdf (Tax Invoice / Receipt)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={consentedDocs.includes('doc-02')}
                      onChange={(e) => {
                        if (e.target.checked) setConsentedDocs((prev) => [...prev, 'doc-02']);
                        else setConsentedDocs((prev) => prev.filter((d) => d !== 'doc-02'));
                      }}
                    />
                    <span>📄 Courier_Delivery_Refusal_Memo.pdf</span>
                  </label>
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#64748b',
                }}
              >
                🔒 <strong>Privacy Assurance:</strong> The advocate receives access ONLY to the checked documents. You can revoke sharing at any time from your Case Settings.
              </div>
            </div>
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
              <div className="summary-row">
                <span>Advocate Base Fee:</span>
                <strong>₹{baseFee}</strong>
              </div>
              <div className="summary-row">
                <span>Platform Fee (10%):</span>
                <span>₹{platformFee}</span>
              </div>
              <div className="summary-row">
                <span>GST (18%):</span>
                <span>₹{gstAmount}</span>
              </div>
              <div className="summary-row summary-total-row">
                <span>Total Amount:</span>
                <span className="summary-total-price">₹{totalPayable}</span>
              </div>
            </div>

            {paymentError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.8125rem',
                margin: '12px 0',
              }}>
                ⚠️ <strong>Payment Notice:</strong> {paymentError}
              </div>
            )}

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
              Proceed to Secure Payment (₹{totalPayable})
            </Button>
          </Card>
        </div>
      </div>

      {activeOrder && (
        <PaymentModal
          order={activeOrder}
          onVerified={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onClose={() => setActiveOrder(null)}
        />
      )}
    </div>
  );
}
