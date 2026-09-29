import { request } from './api';
import { mockLawyers } from '../data/mockData';

const localBookings = [];

export const consultationService = {
  async getAvailableSlots(lawyerId, date) {
    return request(`/lawyers/${lawyerId}/slots?date=${date}`, {}, () => {
      const lawyer = mockLawyers.find((l) => l.id === lawyerId);
      return lawyer?.timeSlots || ['10:00 AM', '02:00 PM', '04:30 PM'];
    });
  },

  async bookConsultation({ lawyerId, caseId, date, timeSlot, mode, notes }) {
    return request('/consultations/book', {
      method: 'POST',
      body: JSON.stringify({ lawyerId, caseId, date, timeSlot, mode, notes }),
    }, () => {
      const lawyer = mockLawyers.find((l) => l.id === lawyerId);
      const booking = {
        bookingId: `book-${Date.now()}`,
        lawyerId,
        lawyerName: lawyer?.name || 'Advocate',
        lawyerLocation: lawyer?.location || 'India',
        court: lawyer?.court || 'High Court',
        caseId: caseId || 'case-101',
        date,
        timeSlot,
        mode: mode || 'Video Consultation',
        status: 'Confirmed',
        fee: lawyer?.consultationFee || 750,
        meetingLink: mode === 'Video Consultation' ? 'https://meet.vidhisetu.in/consult-room-489' : null,
        instructions: 'Please be ready 5 minutes early with your primary case documents and ID proof.',
        createdAt: new Date().toISOString(),
      };
      localBookings.push(booking);
      return booking;
    });
  },

  async getBookingById(bookingId) {
    return request(`/consultations/${bookingId}`, {}, () => {
      const booking = localBookings.find((b) => b.bookingId === bookingId);
      if (booking) return booking;
      // Fallback default mock booking
      return {
        bookingId,
        lawyerName: 'Adv. Rajeshwar Rao',
        lawyerLocation: 'New Delhi',
        court: 'Delhi High Court & NCDRC',
        date: '2026-09-10',
        timeSlot: '03:00 PM',
        mode: 'Video Consultation',
        status: 'Confirmed',
        fee: 1200,
        meetingLink: 'https://meet.vidhisetu.in/consult-room-489',
        instructions: 'Please keep your cheque copy, bank return memo, and registered notice handy.',
      };
    });
  },
};
