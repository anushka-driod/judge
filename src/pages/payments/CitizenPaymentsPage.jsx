import React, { useState, useEffect } from 'react';
import paymentService from '../../services/paymentService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { useUI } from '../../hooks/useUI';
import {
  CreditCard,
  IndianRupee,
  Calendar,
  Clock,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  XCircle,
  RotateCcw,
  Receipt,
} from 'lucide-react';
import './Payments.css';

export function CitizenPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const { showToast } = useUI();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await paymentService.getCitizenPayments();
      if (res && res.payments) {
        setPayments(res.payments);
      }
    } catch (err) {
      console.warn('Citizen payments fetch notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleCancelBooking = async (payment) => {
    const reason = window.prompt(
      'Please state the reason for cancelling your consultation:',
      'Rescheduling required'
    );
    if (!reason) return;

    setCancellingId(payment.id);
    try {
      const targetId = payment.consultation_id || payment.id;
      const res = await paymentService.cancelConsultation(targetId, reason);
      if (res.success) {
        showToast(`Consultation cancelled. ${res.cancellation?.policyApplied}`, 'success');
        fetchPayments();
      } else {
        showToast(res.error || 'Failed to cancel consultation', 'danger');
      }
    } catch (err) {
      showToast(err.message || 'Cancellation error', 'danger');
    } finally {
      setCancellingId(null);
    }
  };

  const handleViewInvoice = async (payment) => {
    try {
      const targetId = payment.consultation_id || payment.id;
      const res = await paymentService.getInvoice(targetId);
      if (res && res.invoice) {
        setActiveInvoice(res.invoice);
      }
    } catch (err) {
      showToast('Could not retrieve tax invoice: ' + err.message, 'danger');
    }
  };

  const totalPaid = payments
    .filter((p) => p.payment_status === 'PAYMENT_SUCCESSFUL')
    .reduce((sum, p) => sum + p.total_amount, 0);

  const pendingRefunds = payments
    .filter((p) => p.payment_status === 'REFUND_PENDING')
    .reduce((sum, p) => sum + (p.refund_amount || p.total_amount), 0);

  const completedCount = payments.filter((p) => p.payment_status === 'PAYMENT_SUCCESSFUL').length;

  if (loading) return <Loading text="Retrieving consultation ledger & tax receipts..." />;

  return (
    <div className="citizen-payments-page animate-fade-in">
      <div className="payments-header-row">
        <div>
          <h1 className="payments-title">Consultation Payments & Invoices</h1>
          <p className="payments-subtitle">
            Verified receipts, transparent fee breakdowns, and refund management
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPayments} icon={RefreshCw}>
          Refresh Ledger
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="payments-metrics-grid">
        <div className="payment-metric-card">
          <div className="metric-icon-wrap metric-blue">
            <IndianRupee size={22} />
          </div>
          <div>
            <h3>₹{totalPaid.toLocaleString('en-IN')}</h3>
            <p>Total Consultation Fees Paid</p>
          </div>
        </div>

        <div className="payment-metric-card">
          <div className="metric-icon-wrap metric-green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h3>{completedCount}</h3>
            <p>Confirmed Appointments</p>
          </div>
        </div>

        <div className="payment-metric-card">
          <div className="metric-icon-wrap metric-amber">
            <RotateCcw size={22} />
          </div>
          <div>
            <h3>₹{pendingRefunds.toLocaleString('en-IN')}</h3>
            <p>Pending Escrow Refunds</p>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <Card className="payments-table-card">
        <div className="table-card-head">
          <h3 className="card-title">Transaction History</h3>
          <span className="escrow-badge">🛡️ 100% Protected Escrow Guarantee</span>
        </div>

        {payments.length === 0 ? (
          <div className="empty-payments-state">
            <Receipt size={40} color="#94a3b8" />
            <p>No consultation payment transactions found.</p>
          </div>
        ) : (
          <div className="payments-table-wrapper">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Advocate & Case</th>
                  <th>Appointment</th>
                  <th>Fee Breakdown</th>
                  <th>Total Paid</th>
                  <th>Status</th>
                  <th>Txn Reference</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const isSuccess = p.payment_status === 'PAYMENT_SUCCESSFUL';
                  const isRefundPending = p.payment_status === 'REFUND_PENDING';
                  const isRefunded = p.payment_status === 'REFUNDED';
                  const isFailed = p.payment_status === 'PAYMENT_FAILED';

                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>#{p.id.slice(-6)}</strong>
                        <div className="table-subtext">{p.invoice_number || 'N/A'}</div>
                      </td>
                      <td>
                        <strong>{p.lawyer_name}</strong>
                        <div className="table-subtext">{p.case_id}</div>
                      </td>
                      <td>
                        <div>📅 {p.scheduled_date}</div>
                        <div className="table-subtext">⏰ {p.time_slot} ({p.consultation_mode})</div>
                      </td>
                      <td>
                        <div className="fee-breakdown-sub">
                          <span>Base: ₹{p.base_fee}</span>
                          <span>GST: ₹{p.gst_amount}</span>
                        </div>
                      </td>
                      <td>
                        <strong className="total-amount-highlight">₹{p.total_amount}</strong>
                      </td>
                      <td>
                        <span className={`payment-status-pill status-${p.payment_status.toLowerCase()}`}>
                          {p.payment_status}
                        </span>
                        {p.refund_amount && (
                          <div className="refund-amount-note">
                            Refund: ₹{p.refund_amount}
                          </div>
                        )}
                      </td>
                      <td>
                        <code className="txn-ref-code">
                          {p.gateway_payment_id || 'PENDING'}
                        </code>
                      </td>
                      <td>
                        <div className="table-action-btns">
                          {isSuccess && (
                            <>
                              <button
                                type="button"
                                className="action-link-btn"
                                onClick={() => handleViewInvoice(p)}
                              >
                                Invoice
                              </button>
                              <button
                                type="button"
                                className="action-cancel-btn"
                                disabled={cancellingId === p.id}
                                onClick={() => handleCancelBooking(p)}
                              >
                                {cancellingId === p.id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            </>
                          )}
                          {(isRefundPending || isRefunded) && (
                            <button
                              type="button"
                              className="action-link-btn"
                              onClick={() => handleViewInvoice(p)}
                            >
                              Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Invoice Modal */}
      {activeInvoice && (
        <div className="invoice-modal-backdrop animate-fade-in">
          <div className="invoice-modal-box">
            <div className="invoice-modal-header">
              <h3>Official Tax Invoice / Payment Receipt</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setActiveInvoice(null)}
              >
                ✕
              </button>
            </div>

            <div className="invoice-content-body printable-invoice">
              <div className="invoice-banner-row">
                <div>
                  <h2>{activeInvoice.platform.companyName}</h2>
                  <p>{activeInvoice.platform.address}</p>
                  <p>GSTIN: <strong>{activeInvoice.platform.gstin}</strong> | SAC: {activeInvoice.platform.hsnSacCode}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="invoice-id-tag">{activeInvoice.invoiceNumber}</div>
                  <p>Date: {new Date(activeInvoice.invoiceDate).toLocaleDateString()}</p>
                </div>
              </div>

              <hr className="invoice-divider" />

              <div className="invoice-parties-grid">
                <div>
                  <span className="party-title">Billed To (Citizen):</span>
                  <p><strong>{activeInvoice.client.name}</strong></p>
                  <p>{activeInvoice.client.email} | {activeInvoice.client.phone}</p>
                  <p>Case Reference: #{activeInvoice.client.caseId}</p>
                </div>
                <div>
                  <span className="party-title">Advocate Appointed:</span>
                  <p><strong>{activeInvoice.advocate.name}</strong></p>
                  <p>Bar Reg: {activeInvoice.advocate.barRegistrationNumber}</p>
                  <p>{activeInvoice.advocate.court}</p>
                </div>
              </div>

              <table className="invoice-line-items">
                <thead>
                  <tr>
                    <th>Service Description</th>
                    <th>Mode</th>
                    <th>Rate</th>
                    <th>GST (18%)</th>
                    <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Legal Advisory Consultation (30 Mins)
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Date: {activeInvoice.consultationDetails.scheduledDate} ({activeInvoice.consultationDetails.timeSlot})
                      </div>
                    </td>
                    <td>{activeInvoice.consultationDetails.mode}</td>
                    <td>₹{activeInvoice.financialBreakdown.baseConsultationFee}</td>
                    <td>₹{activeInvoice.financialBreakdown.gstAmount}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>₹{activeInvoice.financialBreakdown.totalCharged}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="invoice-footer-meta">
                <p>Payment Gateway Ref: <code>{activeInvoice.paymentReference.transactionRef}</code></p>
                <p>Status: <strong style={{ color: '#16a34a' }}>{activeInvoice.paymentReference.paymentStatus}</strong></p>
              </div>
            </div>

            <div className="invoice-modal-footer">
              <Button variant="primary" icon={Download} onClick={() => window.print()}>
                Print / Save PDF
              </Button>
              <Button variant="outline" onClick={() => setActiveInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CitizenPaymentsPage;
