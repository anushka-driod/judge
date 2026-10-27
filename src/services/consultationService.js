import { request } from './api';

export const consultationService = {
  async getAvailableSlots(lawyerId, date) {
    return request(`/lawyers/${lawyerId}/slots?date=${encodeURIComponent(date)}`);
  },

  async bookConsultation({ lawyerId, caseId, date, timeSlot, mode, notes }) {
    return request('/consultations/book', {
      method: 'POST',
      body: JSON.stringify({ lawyerId, caseId, date, timeSlot, mode, notes }),
    });
  },

  async getBookingById(bookingId) {
    return request(`/consultations/${bookingId}`);
  },
};
