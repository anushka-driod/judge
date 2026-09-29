import { request } from './api';

export const paymentService = {
  /**
   * 1. Initiate consultation payment
   * Server calculates verified fees & creates order on payment gateway
   */
  async initiatePayment({ caseId, lawyerId, consultationMode, scheduledDate, timeSlot, userNotes, idempotencyKey }) {
    return request('/consultations/payments/initiate', {
      method: 'POST',
      body: JSON.stringify({
        caseId,
        lawyerId,
        consultationMode,
        scheduledDate,
        timeSlot,
        userNotes,
        idempotencyKey,
      }),
    });
  },

  /**
   * 2. Verify payment on server (HMAC SHA-256)
   */
  async verifyPayment({ orderId, paymentId, signature }) {
    return request('/consultations/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ orderId, paymentId, signature }),
    });
  },

  /**
   * 3. Record gateway failure or dismissal
   */
  async reportPaymentFailure({ orderId, errorCode, errorDescription }) {
    return request('/consultations/payments/failure', {
      method: 'POST',
      body: JSON.stringify({ orderId, errorCode, errorDescription }),
    });
  },

  /**
   * 4. Cancel consultation & trigger refund eligibility
   */
  async cancelConsultation(consultationId, reason = '') {
    return request(`/consultations/${consultationId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * 5. Fetch tax invoice / receipt
   */
  async getInvoice(idOrBookingRef) {
    return request(`/consultations/${idOrBookingRef}/invoice`);
  },

  /**
   * 6. Citizen consultation payment history
   */
  async getCitizenPayments() {
    return request('/citizen/payments');
  },

  /**
   * 7. Admin payment oversight & escrow ledger
   */
  async getAdminPayments() {
    return request('/admin/payments');
  },

  /**
   * 8. Admin process refund
   */
  async processAdminRefund(paymentId, remarks = '') {
    return request(`/admin/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
  },
};

export default paymentService;
