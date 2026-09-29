import React, { useState, useEffect } from 'react';
import paymentService from '../../services/paymentService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { useUI } from '../../hooks/useUI';
import {
  IndianRupee,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import '../payments/Payments.css';

export function AdminPaymentsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const { showToast } = useUI();

  const fetchAdminLedger = async () => {
    setLoading(true);
    try {
      const res = await paymentService.getAdminPayments();
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      console.warn('Admin payments fetch notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminLedger();
  }, []);

  const handleProcessRefund = async (payment) => {
    const remarks = window.prompt(
      `Confirm refund of ₹${payment.refund_amount || payment.total_amount} to ${payment.citizen_name}. Enter administrative remarks:`,
      'Approved: Policy cancellation compliance'
    );
    if (!remarks) return;

    setProcessingId(payment.id);
    try {
      const res = await paymentService.processAdminRefund(payment.id, remarks);
      if (res && res.success) {
        showToast(`Refund of ₹${payment.refund_amount || payment.total_amount} executed successfully.`, 'success');
        fetchAdminLedger();
      } else {
        showToast(res.error || 'Refund execution failed', 'danger');
      }
    } catch (err) {
      showToast(err.message || 'Refund error', 'danger');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <Loading text="Loading administrative escrow & financial ledger..." />;

  const summary = data?.summary || {};
  const transactions = data?.transactions || [];

  return (
    <div className="citizen-payments-page animate-fade-in" style={{ maxWidth: '1300px' }}>
      <div className="payments-header-row">
        <div>
          <h1 className="payments-title">Platform Escrow & Financial Management</h1>
          <p className="payments-subtitle">
            Admin oversight: Consultation payments, platform commission, and refund disbursement
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAdminLedger} icon={RefreshCw}>
          Refresh Financial Ledger
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="payments-metrics-grid">
        <div className="payment-metric-card">
          <div className="metric-icon-wrap metric-blue">
            <IndianRupee size={22} />
          </div>
          <div>
            <h3>₹{(summary.totalVolume || 0).toLocaleString('en-IN')}</h3>
            <p>Total Consultation Volume</p>
          </div>
        </div>

        <div className="payment-metric-card">
          <div className="metric-icon-wrap metric-green">
            <TrendingUp size={22} />
          </div>
          <div>
            <h3>₹{(summary.platformRevenue || 0).toLocaleString('en-IN')}</h3>
            <p>Platform Commission Revenue (10%)</p>
          </div>
        </div>

        <div className="payment-metric-card">
          <div className="metric-icon-wrap metric-amber">
            <RotateCcw size={22} />
          </div>
          <div>
            <h3>{summary.pendingRefundsCount || 0}</h3>
            <p>Pending Refund Requests</p>
          </div>
        </div>

        <div className="payment-metric-card">
          <div className="metric-icon-wrap" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3>₹{(summary.totalRefundedAmount || 0).toLocaleString('en-IN')}</h3>
            <p>Total Refunded Escrow</p>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <Card className="payments-table-card">
        <div className="table-card-head">
          <h3 className="card-title">Comprehensive Consultation Transactions ({transactions.length})</h3>
          <span className="escrow-badge">Audited Ledger</span>
        </div>

        <div className="payments-table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Citizen</th>
                <th>Advocate</th>
                <th>Base Fee</th>
                <th>GST (18%)</th>
                <th>Platform Fee</th>
                <th>Total Paid</th>
                <th>Status</th>
                <th>Gateway Txn Ref</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No payment transactions recorded.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>#{t.id.slice(-6)}</strong>
                      <div className="table-subtext">{t.invoice_number || 'Pending'}</div>
                    </td>
                    <td>
                      <div><strong>{t.citizen_name}</strong></div>
                      <div className="table-subtext">{t.citizen_email}</div>
                    </td>
                    <td>
                      <div><strong>{t.lawyer_name}</strong></div>
                      <div className="table-subtext">Net: ₹{t.lawyer_net_payout}</div>
                    </td>
                    <td>₹{t.base_fee}</td>
                    <td>₹{t.gst_amount}</td>
                    <td>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>₹{t.platform_fee}</span>
                    </td>
                    <td>
                      <strong className="total-amount-highlight">₹{t.total_amount}</strong>
                    </td>
                    <td>
                      <span className={`payment-status-pill status-${t.payment_status.toLowerCase()}`}>
                        {t.payment_status}
                      </span>
                      {t.refund_amount && (
                        <div className="refund-amount-note">
                          Refund: ₹{t.refund_amount}
                        </div>
                      )}
                    </td>
                    <td>
                      <code className="txn-ref-code">{t.gateway_payment_id || 'PENDING'}</code>
                    </td>
                    <td>
                      {t.payment_status === 'REFUND_PENDING' && (
                        <button
                          type="button"
                          className="action-cancel-btn"
                          disabled={processingId === t.id}
                          onClick={() => handleProcessRefund(t)}
                        >
                          {processingId === t.id ? 'Processing...' : 'Disburse Refund'}
                        </button>
                      )}
                      {t.payment_status === 'REFUNDED' && (
                        <span style={{ fontSize: '0.75rem', color: '#7e22ce', fontWeight: 600 }}>
                          ✓ Refunded ({t.refund_id})
                        </span>
                      )}
                      {t.payment_status === 'PAYMENT_SUCCESSFUL' && (
                        <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                          ✓ In Escrow
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default AdminPaymentsPage;
