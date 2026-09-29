import React, { useState, useEffect } from 'react';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerEarningsPage() {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const res = await lawyerPortalClient.getEarnings();
      setEarningsData(res);
    } catch (err) {
      console.warn('Earnings fetch notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const transactions = earningsData?.transactions || [];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#fff' }}>
            Lawyer Consultation Earnings & Ledger
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Real-time consultation revenue, platform settlements, and transaction history
          </p>
        </div>

        <button type="button" onClick={fetchEarnings} className="lp-btn-action">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="lp-metrics-grid">
        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-gold">
            <IndianRupee size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>₹{(earningsData?.totalConsultationEarnings || 0).toLocaleString('en-IN')}</h3>
            <p>Total Consultation Earnings</p>
          </div>
        </div>

        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-green">
            <TrendingUp size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>₹{(earningsData?.todayEarnings || 0).toLocaleString('en-IN')}</h3>
            <p>Today's Settled Earnings</p>
          </div>
        </div>

        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-purple">
            <Clock size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>₹{(earningsData?.pendingPayouts || 0).toLocaleString('en-IN')}</h3>
            <p>Pending Escrow Settlements</p>
          </div>
        </div>

        <div className="lp-metric-card">
          <div className="lp-metric-icon-wrap lp-metric-icon-blue">
            <CheckCircle2 size={24} />
          </div>
          <div className="lp-metric-content">
            <h3>{earningsData?.completedConsultations || 0}</h3>
            <p>Completed Consultations</p>
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="lp-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #22304d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="lp-card-title">
            <FileCheck size={18} color="#d4af37" />
            <span>Consultation Ledger Transactions</span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Escrow settled every 24 hours post consultation
          </span>
        </div>

        <div className="lp-table-wrap">
          <table className="lp-table">
            <thead>
              <tr>
                <th>Consultation Ref</th>
                <th>Client Name</th>
                <th>Mode</th>
                <th>Fee Charged</th>
                <th>Platform Settlement (90%)</th>
                <th>Payment Status</th>
                <th>Consultation Status</th>
                <th>Txn Ref</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    {loading ? 'Retrieving ledger...' : 'No ledger transactions recorded yet.'}
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>
                      <strong style={{ color: '#fff' }}>{txn.consultationId}</strong>
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{txn.caseId}</div>
                    </td>
                    <td>
                      <span style={{ color: '#cbd5e1' }}>{txn.clientName}</span>
                    </td>
                    <td>
                      <span className="lp-badge lp-badge-lawyer" style={{ fontSize: '0.75rem' }}>
                        {txn.consultationType.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#fff' }}>₹{txn.amount}</strong>
                    </td>
                    <td>
                      <strong style={{ color: '#34d399' }}>₹{txn.netPayout}</strong>
                    </td>
                    <td>
                      <span className="lp-badge lp-badge-verified">
                        {txn.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                        {txn.consultationStatus}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem', color: '#d4af37' }}>{txn.transactionRef}</code>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{txn.date}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LawyerEarningsPage;
