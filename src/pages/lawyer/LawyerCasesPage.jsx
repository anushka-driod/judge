import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { lawyerPortalClient } from '../../services/lawyerPortalClient';
import {
  Briefcase,
  User,
  ShieldCheck,
  Calendar,
  ArrowRight,
  RefreshCw,
  Search,
  FileText,
} from 'lucide-react';
import '../../components/lawyer/LawyerPortal.css';

export function LawyerCasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await lawyerPortalClient.getCases();
      setCases(res || []);
    } catch (err) {
      console.warn('Failed to load authorized cases:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filtered = cases.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.clientName.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#fff' }}>
            Authorized Client Cases
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Active consultations and case workspaces authorized by client consent
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <input
              type="text"
              placeholder="Search cases or clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: '#101626',
                border: '1px solid #22304d',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.875rem',
              }}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
          </div>

          <button type="button" onClick={fetchCases} className="lp-btn-action">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="lp-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="lp-table-wrap">
          <table className="lp-table">
            <thead>
              <tr>
                <th>Case Ref / Title</th>
                <th>Client Name</th>
                <th>Forum & Jurisdiction</th>
                <th>Category</th>
                <th>Consent Status</th>
                <th>Scheduled Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    {loading ? 'Loading authorized case docket...' : 'No authorized cases found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{c.title}</div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.id}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={15} color="#60a5fa" />
                        <strong>{c.clientName}</strong>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: '#cbd5e1', fontSize: '0.8125rem' }}>{c.jurisdiction}</span>
                    </td>
                    <td>
                      <span className="lp-badge lp-badge-lawyer" style={{ fontSize: '0.75rem' }}>
                        {c.category}
                      </span>
                    </td>
                    <td>
                      {c.hasConsent ? (
                        <span className="lp-badge lp-badge-verified">
                          <ShieldCheck size={12} /> Active Consent
                        </span>
                      ) : (
                        <span className="lp-badge lp-badge-pending">Consultation Scope</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                        {c.requestedDate || 'Scheduled'}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/lawyer/cases/${c.id}`}
                        className="lp-btn-action lp-btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
                      >
                        <span>Open Workspace</span>
                        <ArrowRight size={13} />
                      </Link>
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

export default LawyerCasesPage;
