import crypto from 'node:crypto';
import PaymentGatewayService from '../services/paymentGatewayService.js';
import LawyerPortalService, { PAYMENT_STATUSES } from '../services/lawyerPortalService.js';

// In-memory payment repository (backed by fallback sync & persistence)
let consultationPayments = [
  {
    id: 'pay-order-101',
    consultation_id: 'req-101',
    case_id: 'case-101',
    citizen_id: 'usr_001',
    citizen_name: 'Aarav Mehta',
    citizen_email: 'aarav.mehta@example.com',
    citizen_phone: '+91 98450 99887',
    lawyer_id: 'law-kar-01',
    lawyer_name: 'Adv. Rajeshwar Rao',
    consultation_mode: 'video',
    scheduled_date: '2026-09-28',
    time_slot: '02:30 PM',
    gateway_name: 'razorpay',
    gateway_order_id: 'order_preseed_101',
    gateway_payment_id: 'PAY_TXN_9845892',
    gateway_signature: 'sig_preseed_valid_101',
    currency: 'INR',
    base_fee: 1200,
    platform_fee: 120,
    gst_amount: 216,
    total_amount: 1416,
    lawyer_net_payout: 1080,
    payment_status: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
    failure_reason: null,
    refund_id: null,
    refund_amount: null,
    refund_reason: null,
    refunded_at: null,
    invoice_number: 'INV-VS-2026-00101',
    idempotency_key: 'idemp-seed-101',
    created_at: '2026-08-28T14:00:00Z',
    updated_at: '2026-08-28T14:02:00Z',
  },
  {
    id: 'pay-order-102',
    consultation_id: 'req-102',
    case_id: 'case-102',
    citizen_id: 'usr_001',
    citizen_name: 'Aarav Mehta',
    citizen_email: 'aarav.mehta@example.com',
    citizen_phone: '+91 98450 99887',
    lawyer_id: 'law-kar-01',
    lawyer_name: 'Adv. Rajeshwar Rao',
    consultation_mode: 'video',
    scheduled_date: '2026-09-29',
    time_slot: '04:00 PM',
    gateway_name: 'razorpay',
    gateway_order_id: 'order_preseed_102',
    gateway_payment_id: 'PAY_TXN_7741295',
    gateway_signature: 'sig_preseed_valid_102',
    currency: 'INR',
    base_fee: 1200,
    platform_fee: 120,
    gst_amount: 216,
    total_amount: 1416,
    lawyer_net_payout: 1080,
    payment_status: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
    failure_reason: null,
    refund_id: null,
    refund_amount: null,
    refund_reason: null,
    refunded_at: null,
    invoice_number: 'INV-VS-2026-00102',
    idempotency_key: 'idemp-seed-102',
    created_at: '2026-09-02T11:20:00Z',
    updated_at: '2026-09-02T11:22:00Z',
  },
  {
    id: 'pay-order-103',
    consultation_id: 'req-103',
    case_id: 'case-103',
    citizen_id: 'usr_002',
    citizen_name: 'Priya Sharma',
    citizen_email: 'priya.sharma@example.com',
    citizen_phone: '+91 97411 22334',
    lawyer_id: 'law-kar-01',
    lawyer_name: 'Adv. Rajeshwar Rao',
    consultation_mode: 'chat',
    scheduled_date: '2026-09-29',
    time_slot: '11:30 AM',
    gateway_name: 'razorpay',
    gateway_order_id: 'order_preseed_103',
    gateway_payment_id: 'PAY_TXN_4512903',
    gateway_signature: 'sig_preseed_valid_103',
    currency: 'INR',
    base_fee: 600,
    platform_fee: 60,
    gst_amount: 108,
    total_amount: 708,
    lawyer_net_payout: 540,
    payment_status: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
    failure_reason: null,
    refund_id: null,
    refund_amount: null,
    refund_reason: null,
    refunded_at: null,
    invoice_number: 'INV-VS-2026-00103',
    idempotency_key: 'idemp-seed-103',
    created_at: '2026-09-26T18:40:00Z',
    updated_at: '2026-09-26T18:42:00Z',
  },
];

export const PaymentController = {
  getStore() {
    return consultationPayments;
  },

  /**
   * 1. Initiate Consultation Payment
   * Server-side fee calculation, double-booking prevention, idempotency, gateway order creation.
   */
  async initiatePayment(req, res) {
    try {
      const {
        caseId,
        lawyerId,
        consultationMode = 'video',
        scheduledDate,
        timeSlot,
        userNotes = '',
        idempotencyKey,
      } = req.body;

      if (!lawyerId) {
        return res.status(400).json({ success: false, error: 'Lawyer ID is required.' });
      }
      if (!scheduledDate || !timeSlot) {
        return res.status(400).json({ success: false, error: 'Scheduled date and time slot are required.' });
      }

      // Identify user from auth token or request
      const citizenId = req.user?.id || req.body.userId || 'usr_001';
      const citizenName = req.user?.name || req.body.userName || 'Citizen';
      const citizenEmail = req.user?.email || req.body.userEmail || 'citizen@vidhisetu.in';
      const citizenPhone = req.user?.phone || req.body.userPhone || '+91 98450 00000';

      // 1. Fetch lawyer and verify availability
      const lawyer = await LawyerPortalService.getLawyerProfile(lawyerId).catch(() => null);
      if (!lawyer) {
        return res.status(404).json({ success: false, error: 'Advocate not found.' });
      }

      // 2. Double-booking prevention
      const isAvailable = await LawyerPortalService.validateSlotAvailability(
        lawyerId,
        scheduledDate,
        timeSlot
      );
      if (!isAvailable) {
        return res.status(409).json({
          success: false,
          error: 'The selected advocate slot is already booked. Please choose an alternative slot.',
          code: 'SLOT_OCCUPIED',
        });
      }

      // 3. Server-side fee calculation (Strict: client-sent fees are IGNORED)
      let baseFee = lawyer.consultation_fee || 1000;
      const normalizedMode = consultationMode.toLowerCase().replace(/[^a-z]/g, '_');

      if (lawyer.fee_schedule) {
        if (normalizedMode.includes('chat') && lawyer.fee_schedule.chat) {
          baseFee = lawyer.fee_schedule.chat;
        } else if (normalizedMode.includes('voice') && lawyer.fee_schedule.voice) {
          baseFee = lawyer.fee_schedule.voice;
        } else if (normalizedMode.includes('video') && lawyer.fee_schedule.video) {
          baseFee = lawyer.fee_schedule.video;
        } else if (normalizedMode.includes('person') && lawyer.fee_schedule.in_person) {
          baseFee = lawyer.fee_schedule.in_person;
        }
      }

      // Calculations: 10% platform commission, 18% GST on consultation
      const platformFee = Math.round(baseFee * 0.10);
      const gstAmount = Math.round(baseFee * 0.18);
      const totalAmount = baseFee + gstAmount;
      const lawyerNetPayout = baseFee - platformFee;

      // 4. Idempotency Check
      if (idempotencyKey) {
        const existingOrder = consultationPayments.find(
          (p) => p.idempotency_key === idempotencyKey && p.payment_status === PAYMENT_STATUSES.PENDING_PAYMENT
        );
        if (existingOrder) {
          return res.json({
            success: true,
            isIdempotentReplay: true,
            order: {
              id: existingOrder.id,
              orderId: existingOrder.gateway_order_id,
              amount: existingOrder.total_amount * 100, // paise
              currency: existingOrder.currency,
              baseFee: existingOrder.base_fee,
              platformFee: existingOrder.platform_fee,
              gstAmount: existingOrder.gst_amount,
              totalAmount: existingOrder.total_amount,
              lawyerId: existingOrder.lawyer_id,
              lawyerName: existingOrder.lawyer_name,
              scheduledDate: existingOrder.scheduled_date,
              timeSlot: existingOrder.time_slot,
              consultationMode: existingOrder.consultation_mode,
              keyId: PaymentGatewayService.getPublicConfig().keyId,
              sandboxMode: PaymentGatewayService.getPublicConfig().sandboxMode,
            },
          });
        }
      }

      // 5. Create Payment Gateway Order
      const amountInPaise = totalAmount * 100;
      const receipt = `rcpt_${citizenId.slice(-6)}_${Date.now().toString().slice(-6)}`;
      const gatewayOrder = await PaymentGatewayService.createOrder({
        amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          caseId: caseId || 'general',
          lawyerId,
          citizenId,
          mode: consultationMode,
        },
      });

      // 6. Persist Consultation Payment Record (status: PENDING_PAYMENT)
      const paymentRecord = {
        id: `pay-order-${Date.now()}`,
        consultation_id: null, // Linked once verified
        case_id: caseId || `case-${Date.now()}`,
        citizen_id: citizenId,
        citizen_name: citizenName,
        citizen_email: citizenEmail,
        citizen_phone: citizenPhone,
        lawyer_id: lawyerId,
        lawyer_name: lawyer.name,
        consultation_mode: consultationMode,
        scheduled_date: scheduledDate,
        time_slot: timeSlot,
        user_notes: userNotes,
        gateway_name: 'razorpay',
        gateway_order_id: gatewayOrder.orderId,
        gateway_payment_id: null,
        gateway_signature: null,
        currency: 'INR',
        base_fee: baseFee,
        platform_fee: platformFee,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        lawyer_net_payout: lawyerNetPayout,
        payment_status: PAYMENT_STATUSES.PENDING_PAYMENT,
        failure_reason: null,
        refund_id: null,
        refund_amount: null,
        refund_reason: null,
        refunded_at: null,
        invoice_number: null,
        idempotency_key: idempotencyKey || `idemp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      consultationPayments.push(paymentRecord);

      return res.status(201).json({
        success: true,
        order: {
          id: paymentRecord.id,
          orderId: gatewayOrder.orderId,
          amount: amountInPaise,
          currency: 'INR',
          baseFee,
          platformFee,
          gstAmount,
          totalAmount,
          lawyerId,
          lawyerName: lawyer.name,
          scheduledDate,
          timeSlot,
          consultationMode,
          keyId: PaymentGatewayService.getPublicConfig().keyId,
          sandboxMode: PaymentGatewayService.getPublicConfig().sandboxMode,
          receipt,
        },
      });
    } catch (err) {
      console.error('[PaymentController] initiatePayment error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * 2. Verify Payment Cryptographically (Server-side HMAC SHA-256)
   * Only upon verified mathematical match does consultation transition to CONFIRMED!
   */
  async verifyPayment(req, res) {
    try {
      const { orderId, paymentId, signature } = req.body;

      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment verification parameters: orderId, paymentId, signature are mandatory.',
        });
      }

      // Lookup payment order
      const paymentRecord = consultationPayments.find(
        (p) => p.gateway_order_id === orderId || p.id === orderId
      );
      if (!paymentRecord) {
        return res.status(404).json({ success: false, error: 'Payment order record not found.' });
      }

      // Idempotency: If already confirmed, return existing confirmation
      if (paymentRecord.payment_status === PAYMENT_STATUSES.PAYMENT_SUCCESSFUL) {
        return res.json({
          success: true,
          message: 'Payment already successfully verified.',
          isDuplicateVerification: true,
          payment: paymentRecord,
          consultationId: paymentRecord.consultation_id,
          invoiceNumber: paymentRecord.invoice_number,
        });
      }

      // Cryptographic verification
      const isValid = PaymentGatewayService.verifyPaymentSignature({
        orderId: paymentRecord.gateway_order_id,
        paymentId,
        signature,
      });

      if (!isValid) {
        console.warn(`[Security Alert] Fraudulent payment signature attempt for order ${orderId}`);
        return res.status(400).json({
          success: false,
          error: 'Cryptographic signature mismatch. Server-side payment verification failed. Payment tampering detected.',
          code: 'INVALID_SIGNATURE',
        });
      }

      // Successful verification
      const confirmedConsultationId = `req-${Date.now()}`;
      const invoiceNumber = `INV-VS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      paymentRecord.payment_status = PAYMENT_STATUSES.PAYMENT_SUCCESSFUL;
      paymentRecord.gateway_payment_id = paymentId;
      paymentRecord.gateway_signature = signature;
      paymentRecord.consultation_id = confirmedConsultationId;
      paymentRecord.invoice_number = invoiceNumber;
      paymentRecord.updated_at = new Date().toISOString();

      // Create confirmed consultation in Lawyer Portal store
      const confirmedConsultation = {
        id: confirmedConsultationId,
        caseId: paymentRecord.case_id,
        clientId: paymentRecord.citizen_id,
        clientName: paymentRecord.citizen_name,
        clientEmail: paymentRecord.citizen_email,
        clientPhone: paymentRecord.citizen_phone,
        lawyerId: paymentRecord.lawyer_id,
        lawyerName: paymentRecord.lawyer_name,
        caseTitle: `Legal Consultation: Case ${paymentRecord.case_id}`,
        category: 'Legal Consultation',
        shortSummary: paymentRecord.user_notes || 'Scheduled via VidhiSetu verified payment pass.',
        consultationType: paymentRecord.consultation_mode,
        requestedDate: paymentRecord.scheduled_date,
        requestedTime: paymentRecord.time_slot,
        durationMinutes: 30,
        feeAmount: paymentRecord.base_fee,
        totalPaid: paymentRecord.total_amount,
        paymentStatus: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
        transactionRef: paymentId,
        status: 'accepted',
        clientNotes: paymentRecord.user_notes,
        meetingLink: paymentRecord.consultation_mode === 'Video Consultation' || paymentRecord.consultation_mode === 'video'
          ? `https://meet.vidhisetu.in/room-${paymentRecord.case_id}-${Date.now().toString().slice(-4)}`
          : null,
        createdAt: new Date().toISOString(),
      };

      // Add to LawyerPortalService stores & ledger
      LawyerPortalService.addConfirmedConsultation(confirmedConsultation, paymentRecord);

      return res.json({
        success: true,
        message: 'Payment verified and consultation confirmed.',
        consultation: confirmedConsultation,
        payment: {
          id: paymentRecord.id,
          orderId: paymentRecord.gateway_order_id,
          paymentId: paymentRecord.gateway_payment_id,
          status: paymentRecord.payment_status,
          totalAmount: paymentRecord.total_amount,
          invoiceNumber,
          transactionRef: paymentId,
        },
      });
    } catch (err) {
      console.error('[PaymentController] verifyPayment error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * 3. Handle Payment Failure / Drop
   */
  async handlePaymentFailure(req, res) {
    try {
      const { orderId, errorCode, errorDescription } = req.body;
      const paymentRecord = consultationPayments.find(
        (p) => p.gateway_order_id === orderId || p.id === orderId
      );

      if (paymentRecord) {
        paymentRecord.payment_status = PAYMENT_STATUSES.PAYMENT_FAILED;
        paymentRecord.failure_reason = errorDescription || errorCode || 'Payment declined by gateway or cancelled by user.';
        paymentRecord.updated_at = new Date().toISOString();
      }

      return res.json({
        success: true,
        message: 'Payment failure recorded. Slot remains unconfirmed.',
        orderId,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * 4. Citizen Consultation Cancellation & Refund Eligibility Evaluation
   */
  async cancelConsultation(req, res) {
    try {
      const targetId = req.params.id;
      const { reason = 'Cancelled by client' } = req.body;
      const citizenId = req.user?.id || req.body.userId || 'usr_001';

      // Find payment record by consultation_id or payment id
      const payment = consultationPayments.find(
        (p) => p.consultation_id === targetId || p.id === targetId || p.gateway_order_id === targetId
      );

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Consultation or payment record not found.' });
      }

      // Ownership check: only booking citizen or admin can cancel
      if (req.user && req.user.role !== 'admin' && payment.citizen_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Unauthorized to cancel this consultation.' });
      }

      if (payment.payment_status === PAYMENT_STATUSES.CANCELLED || payment.payment_status === PAYMENT_STATUSES.REFUNDED) {
        return res.status(400).json({ success: false, error: 'Consultation is already cancelled or refunded.' });
      }

      // Cancellation Window Rule:
      // Scheduled slot time calculation
      const slotDateTimeStr = `${payment.scheduled_date} ${payment.time_slot}`;
      const scheduledTimestamp = new Date(slotDateTimeStr).getTime();
      const now = Date.now();
      const hoursRemaining = (scheduledTimestamp - now) / (1000 * 60 * 60);

      let refundAmount = 0;
      let policyApplied = '';

      if (isNaN(hoursRemaining) || hoursRemaining > 24) {
        // More than 24 hours: 100% full refund
        refundAmount = payment.total_amount;
        policyApplied = 'Full 100% refund applied (> 24 hours prior to appointment)';
      } else if (hoursRemaining >= 4 && hoursRemaining <= 24) {
        // Between 4 and 24 hours: 90% refund (10% platform cancellation charge)
        refundAmount = Math.round(payment.total_amount * 0.90);
        policyApplied = '90% refund applied (4–24 hours prior, 10% platform fee retained)';
      } else {
        // Less than 4 hours: No automatic refund
        refundAmount = 0;
        policyApplied = 'Non-refundable window (< 4 hours prior). Slot reserved for counsel.';
      }

      payment.payment_status = refundAmount > 0 ? PAYMENT_STATUSES.REFUND_PENDING : PAYMENT_STATUSES.CANCELLED;
      payment.refund_amount = refundAmount;
      payment.refund_reason = reason;
      payment.updated_at = new Date().toISOString();

      // Synchronize cancellation with LawyerPortalService
      LawyerPortalService.syncConsultationCancellation(payment.consultation_id, reason, payment.payment_status);

      return res.json({
        success: true,
        message: 'Consultation successfully cancelled.',
        cancellation: {
          consultationId: payment.consultation_id,
          paymentStatus: payment.payment_status,
          refundAmount,
          policyApplied,
          reason,
        },
      });
    } catch (err) {
      console.error('[PaymentController] cancelConsultation error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * 5. Download / View Tax Invoice & Receipt
   */
  async getInvoice(req, res) {
    try {
      const targetId = req.params.id;
      const payment = consultationPayments.find(
        (p) => p.consultation_id === targetId || p.id === targetId || p.invoice_number === targetId
      );

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Invoice not found.' });
      }

      const invoice = {
        invoiceNumber: payment.invoice_number || `INV-VS-PRE-${payment.id.slice(-6)}`,
        invoiceDate: payment.created_at,
        platform: {
          companyName: 'Vidhi Setu Legal Technologies Private Limited',
          gstin: '29AAACV2026F1Z5',
          hsnSacCode: '998211 (Legal Advisory & Representation Services)',
          address: 'High Court Chambers Block, MG Road, Bengaluru, KA 560001',
          contactEmail: 'billing@vidhisetu.in',
        },
        advocate: {
          name: payment.lawyer_name,
          barRegistrationNumber: 'KAR/2012/5894',
          court: 'High Court & Civil Jurisdictions',
        },
        client: {
          name: payment.citizen_name,
          email: payment.citizen_email,
          phone: payment.citizen_phone,
          caseId: payment.case_id,
        },
        consultationDetails: {
          mode: payment.consultation_mode,
          scheduledDate: payment.scheduled_date,
          timeSlot: payment.time_slot,
          duration: '30 Minutes',
        },
        financialBreakdown: {
          baseConsultationFee: payment.base_fee,
          platformServiceFee: payment.platform_fee,
          gstRate: '18%',
          gstAmount: payment.gst_amount,
          totalCharged: payment.total_amount,
          currency: payment.currency,
        },
        paymentReference: {
          gateway: 'Razorpay PG',
          gatewayOrderId: payment.gateway_order_id,
          transactionRef: payment.gateway_payment_id || 'PENDING',
          paymentStatus: payment.payment_status,
          settledAt: payment.updated_at,
        },
      };

      return res.json({ success: true, invoice });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * 6. Citizen Payment History
   */
  async getCitizenPayments(req, res) {
    try {
      const citizenId = req.user?.id || req.query.userId || 'usr_001';
      const list = consultationPayments.filter((p) => p.citizen_id === citizenId);

      return res.json({
        success: true,
        count: list.length,
        payments: list.slice().reverse(),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * 7. Admin Payment Management & Escrow Listing
   */
  async getAdminPayments(req, res) {
    try {
      const totalCollected = consultationPayments
        .filter((p) => p.payment_status === PAYMENT_STATUSES.PAYMENT_SUCCESSFUL)
        .reduce((sum, p) => sum + p.total_amount, 0);

      const totalPlatformCommission = consultationPayments
        .filter((p) => p.payment_status === PAYMENT_SUCCESSFUL || p.payment_status === PAYMENT_STATUSES.PAYMENT_SUCCESSFUL)
        .reduce((sum, p) => sum + p.platform_fee, 0);

      const pendingRefunds = consultationPayments.filter(
        (p) => p.payment_status === PAYMENT_STATUSES.REFUND_PENDING
      );

      const totalRefunded = consultationPayments
        .filter((p) => p.payment_status === PAYMENT_STATUSES.REFUNDED)
        .reduce((sum, p) => sum + (p.refund_amount || 0), 0);

      return res.json({
        success: true,
        summary: {
          totalVolume: totalCollected,
          platformRevenue: totalPlatformCommission,
          pendingRefundsCount: pendingRefunds.length,
          totalRefundedAmount: totalRefunded,
          currency: 'INR',
        },
        transactions: consultationPayments.slice().reverse(),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * 8. Admin Process Refund
   */
  async processAdminRefund(req, res) {
    try {
      const targetId = req.params.id;
      const { remarks = 'Approved by administrator' } = req.body;

      const payment = consultationPayments.find(
        (p) => p.id === targetId || p.consultation_id === targetId || p.gateway_order_id === targetId
      );

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment transaction not found.' });
      }

      if (payment.payment_status === PAYMENT_STATUSES.REFUNDED) {
        return res.status(400).json({ success: false, error: 'Transaction has already been refunded.' });
      }

      const refundAmount = payment.refund_amount || payment.total_amount;
      const refundResult = await PaymentGatewayService.processRefund({
        paymentId: payment.gateway_payment_id,
        amountInPaise: refundAmount * 100,
        notes: {
          reason: remarks,
          consultationId: payment.consultation_id,
        },
      });

      payment.payment_status = PAYMENT_STATUSES.REFUNDED;
      payment.refund_id = refundResult.refundId;
      payment.refund_amount = refundAmount;
      payment.refunded_at = new Date().toISOString();
      payment.refund_reason = remarks;
      payment.updated_at = new Date().toISOString();

      // Synchronize refund deduction with LawyerPortalService
      LawyerPortalService.syncRefundSettlement(payment.consultation_id, refundAmount);

      return res.json({
        success: true,
        message: 'Refund executed successfully.',
        refund: refundResult,
        payment,
      });
    } catch (err) {
      console.error('[PaymentController] processAdminRefund error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * 9. Sandbox Signature Generator (Backend-Only Secret Protection)
   */
  generateSandboxSignature(req, res) {
    try {
      const { orderId, paymentId } = req.body;
      if (!orderId || !paymentId) {
        return res.status(400).json({ success: false, error: 'orderId and paymentId are required.' });
      }
      const signature = PaymentGatewayService.generateSandboxSignature(orderId, paymentId);
      return res.json({ success: true, orderId, paymentId, signature });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};

export default PaymentController;
