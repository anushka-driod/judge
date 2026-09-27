import React, { useState } from 'react';
import { request } from '../../services/api';
import paymentService from '../../services/paymentService';
import {
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';
import './PaymentModal.css';

export function PaymentModal({ order, onVerified, onFailure, onClose }) {
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!order) return null;

  const handlePayNow = async () => {
    setProcessing(true);
    setErrorMsg(null);

    try {
      // 1. If real Razorpay key is configured and not in sandbox mode, use Razorpay checkout
      if (!order.sandboxMode && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'Vidhi Setu Legal Technologies',
          description: `Legal Consultation: ${order.lawyerName || 'Advocate'}`,
          order_id: order.orderId,
          prefill: {
            name: 'Client',
            email: 'client@vidhisetu.in',
            contact: '+91 98450 00000',
          },
          theme: {
            color: '#1e3a8a',
          },
          handler: async (response) => {
            try {
              // Server-side verification
              const verifyRes = await paymentService.verifyPayment({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });

              if (verifyRes.success) {
                onVerified(verifyRes);
              } else {
                setErrorMsg(verifyRes.error || 'Server payment verification failed.');
              }
            } catch (vErr) {
              setErrorMsg(vErr.message);
            }
          },
          modal: {
            ondismiss: async () => {
              setProcessing(false);
              await paymentService.reportPaymentFailure({
                orderId: order.orderId,
                errorCode: 'MODAL_DISMISSED',
                errorDescription: 'User closed payment window before completing authorization.',
              });
            },
          },
        });

        rzp.open();
        return;
      }

      // 2. Sandbox/Test Gateway Engine:
      // Request cryptographic signature from backend sandbox endpoint (secret never exposed to frontend)
      const mockPaymentId = `pay_sbx_${Date.now()}_${Math.random().toString(36).slice(-6)}`;
      const sigData = await request('/consultations/payments/sandbox-signature', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.orderId,
          paymentId: mockPaymentId,
        }),
      });

      if (!sigData || !sigData.signature) {
        throw new Error('Failed to generate verification token.');
      }

      // 3. Submit for true server-side cryptographic HMAC-SHA256 verification
      const verifyRes = await paymentService.verifyPayment({
        orderId: order.orderId,
        paymentId: mockPaymentId,
        signature: sigData.signature,
      });

      if (verifyRes.success) {
        onVerified(verifyRes);
      } else {
        setErrorMsg(verifyRes.error || 'Payment verification failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment transaction failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSimulateFailure = async () => {
    setProcessing(true);
    try {
      await paymentService.reportPaymentFailure({
        orderId: order.orderId,
        errorCode: 'CARD_DECLINED',
        errorDescription: 'Insufficient funds or card declined by issuing bank.',
      });
      if (onFailure) {
        onFailure({
          orderId: order.orderId,
          error: 'Payment declined by issuing bank. Please retry with an alternate card or UPI.',
        });
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="payment-modal-backdrop animate-fade-in">
      <div className="payment-modal-container">
        {/* Modal Header */}
        <div className="payment-modal-header">
          <div className="header-brand">
            <div className="brand-badge-icon">
              <ShieldCheck size={20} color="#22c55e" />
            </div>
            <div>
              <h3>VidhiSetu Secure Checkout</h3>
              <p>256-Bit SSL Encrypted Escrow Settlement</p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} disabled={processing}>
            <X size={18} />
          </button>
        </div>

        {order.sandboxMode && (
          <div className="sandbox-banner">
            <Info size={16} />
            <span>
              <strong>Sandbox Gateway Active:</strong> Test payment simulation using authentic HMAC SHA-256 signature verification. Real bank accounts will not be charged.
            </span>
          </div>
        )}

        {/* Order Brief */}
        <div className="consultation-summary-box">
          <div className="summary-main">
            <div>
              <span className="summary-label">Appointed Advocate</span>
              <h4>{order.lawyerName}</h4>
              <span className="summary-slot">
                📅 {order.scheduledDate} at {order.timeSlot} ({order.consultationMode})
              </span>
            </div>
            <div className="summary-total-tag">
              <span>Total Payable</span>
              <strong>₹{order.totalAmount}</strong>
            </div>
          </div>

          {/* Transparent Fee Breakdown */}
          <div className="price-breakdown-table">
            <div className="breakdown-line">
              <span>Advocate Consultation Fee</span>
              <span>₹{order.baseFee}</span>
            </div>
            <div className="breakdown-line">
              <span>Platform Technology Fee (10%)</span>
              <span>₹{order.platformFee}</span>
            </div>
            <div className="breakdown-line">
              <span>Statutory GST (18%)</span>
              <span>₹{order.gstAmount}</span>
            </div>
            <div className="breakdown-line breakdown-total">
              <strong>Final Amount Charged</strong>
              <strong style={{ color: '#2563eb' }}>₹{order.totalAmount}</strong>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="payment-error-alert animate-fade-in">
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Payment Methods */}
        <div className="payment-methods-tabs">
          <button
            type="button"
            className={`method-tab ${selectedMethod === 'upi' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('upi')}
          >
            <Smartphone size={16} /> UPI / QR
          </button>
          <button
            type="button"
            className={`method-tab ${selectedMethod === 'card' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('card')}
          >
            <CreditCard size={16} /> Cards
          </button>
          <button
            type="button"
            className={`method-tab ${selectedMethod === 'netbanking' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('netbanking')}
          >
            <Building2 size={16} /> NetBanking
          </button>
        </div>

        <div className="method-tab-panel">
          {selectedMethod === 'upi' && (
            <div className="upi-panel-content">
              <p>Pay instantly using any UPI App (Google Pay, PhonePe, Paytm, BHIM):</p>
              <div className="upi-apps-row">
                <span className="upi-pill">Google Pay</span>
                <span className="upi-pill">PhonePe</span>
                <span className="upi-pill">Paytm</span>
                <span className="upi-pill">BHIM UPI</span>
              </div>
            </div>
          )}

          {selectedMethod === 'card' && (
            <div className="card-panel-content">
              <p>Supports all major Indian and international debit/credit cards:</p>
              <div className="card-icons-row">
                <span className="upi-pill">Visa</span>
                <span className="upi-pill">Mastercard</span>
                <span className="upi-pill">RuPay</span>
              </div>
            </div>
          )}

          {selectedMethod === 'netbanking' && (
            <div className="netbanking-panel-content">
              <p>Direct bank integration via SBI, HDFC, ICICI, Axis Bank, and 50+ banks.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="payment-actions-wrapper">
          <button
            type="button"
            className="btn-pay-confirm"
            onClick={handlePayNow}
            disabled={processing}
          >
            {processing ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Verifying Payment on Server...
              </>
            ) : (
              <>
                <Lock size={16} /> Authorize & Pay ₹{order.totalAmount}
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-simulate-fail"
            onClick={handleSimulateFailure}
            disabled={processing}
          >
            Simulate Gateway Failure (Test Error Recovery)
          </button>
        </div>

        <div className="security-guarantee-note">
          <Lock size={12} />
          <span>
            Payment is held in secure VidhiSetu Escrow until the consultation is concluded. 100% money-back guarantee in case of advocate no-show.
          </span>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
