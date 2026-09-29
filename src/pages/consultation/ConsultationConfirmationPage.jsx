import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { consultationService } from '../../services/consultationService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { formatDate } from '../../utils/formatDate';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Download,
  AlertCircle,
} from 'lucide-react';
import './Consultation.css';

export function ConsultationConfirmationPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await consultationService.getBookingById(bookingId);
      setBooking(data);
      setLoading(false);
    }
    load();
  }, [bookingId]);

  if (loading) return <Loading text="Fetching consultation appointment pass..." />;
  if (!booking) return <div>Appointment details not found</div>;

  return (
    <div className="consultation-confirmed-page animate-fade-in">
      <div className="confirmed-card-wrapper">
        <Card className="confirmed-main-card">
          <div className="confirmed-top-banner">
            <div className="confirmed-icon-circle">
              <CheckCircle2 size={36} />
            </div>
            <h1 className="confirmed-title">Consultation Confirmed!</h1>
            <p className="confirmed-subtitle">
              Booking Ref: <strong>#{booking.bookingId}</strong>
            </p>
          </div>

          <div className="confirmed-details-box">
            <div className="confirmed-lawyer-row">
              <div>
                <span className="lawyer-label">Advocate</span>
                <h3 className="confirmed-lawyer-title">{booking.lawyerName}</h3>
                <p className="confirmed-court-text">{booking.court}</p>
                {booking.transactionRef && (
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                      ✓ Verified Payment Txn: <code>{booking.transactionRef}</code>
                    </span>
                  </div>
                )}
              </div>
              <div className="confirmed-fee-pill">
                <span>Fee Paid (Inc. GST)</span>
                <strong>₹{booking.fee}</strong>
              </div>
            </div>

            <div className="confirmed-schedule-grid">
              <div className="schedule-box">
                <Calendar size={18} className="sched-icon" />
                <div>
                  <span className="sched-label">Appointment Date</span>
                  <strong className="sched-val">{formatDate(booking.date)}</strong>
                </div>
              </div>

              <div className="schedule-box">
                <Clock size={18} className="sched-icon" />
                <div>
                  <span className="sched-label">Time Slot</span>
                  <strong className="sched-val">{booking.timeSlot}</strong>
                </div>
              </div>

              <div className="schedule-box">
                <Video size={18} className="sched-icon" />
                <div>
                  <span className="sched-label">Consultation Mode</span>
                  <strong className="sched-val">{booking.mode}</strong>
                </div>
              </div>
            </div>

            {booking.meetingLink && (
              <div className="meeting-link-card">
                <div className="meeting-link-left">
                  <Video size={20} className="video-link-icon" />
                  <div>
                    <strong>VidhiSetu Encrypted Video Consultation Room</strong>
                    <p>The call will be unlocked 5 minutes prior to the scheduled slot.</p>
                  </div>
                </div>
                <a
                  href={booking.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="join-meeting-btn"
                >
                  Join Room <ExternalLink size={15} />
                </a>
              </div>
            )}
          </div>

          <div className="consult-instructions-card">
            <h4 className="instructions-title">
              <AlertCircle size={18} /> How to prepare for maximum consultation value:
            </h4>
            <ul className="instructions-list">
              <li>Upload primary invoices, receipts, or bounced cheque copies into Document Vault.</li>
              <li>Keep a pen and paper ready to note statutory deadlines advised by counsel.</li>
              <li>After the consultation, your advocate will upload your formal Case Action Plan.</li>
            </ul>
          </div>

          <div className="confirmed-actions-row">
            <Link to={`/cases/${booking.caseId || 'case-101'}`}>
              <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                View Case Progress & Tracking
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              icon={Download}
              onClick={() => window.print()}
            >
              Print / Save Tax Invoice
            </Button>
            <Link to="/dashboard">
              <Button variant="outline" size="lg">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
