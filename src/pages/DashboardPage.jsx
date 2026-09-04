import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney, greeting } from '../lib/format.js';

export default function DashboardPage() {
  const { user, loading } = useAuth({ redirect: true });
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user) return;
    api('/api/dashboard').then(setData);
  }, [user]);

  if (loading || !data) return null;

  function actionLink(a) {
    if (a.type === 'fund') return `/contracts/${a.contractId}/fund`;
    if (a.type === 'approval') return `/contracts/${a.contractId}/milestones/${a.milestoneId}/review`;
    if (a.type === 'deliverable') return `/contracts/${a.contractId}/milestones/${a.milestoneId}`;
    return '#';
  }

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Workspace</span>
        <h1>{greeting(user.fullName)}</h1>
        <div className="app-status-row">
          <span>KYC {data.user.kycStatus === 'VERIFIED' ? '✓' : '○'}</span>
          <span>Wallet {data.user.walletVerified ? '✓' : '○'}</span>
          <span>AML {data.user.amlStatus === 'CLEAR' ? '✓' : '○'}</span>
        </div>
        {user.role === 'client' ? (
          <div className="app-actions">
            <Link to="/contracts/create" className="app-btn app-btn--primary">Create Contract</Link>
          </div>
        ) : null}
      </div>
      <div className="app-grid-2" style={{ marginBottom: 24 }}>
        <div className="app-card" id="contracts">
          <div className="app-card__title">Active contracts</div>
          {data.contracts.length ? (
            data.contracts.map((c) => {
              const activeMs = c.milestones.find((m) =>
                ['IN_PROGRESS', 'SUBMITTED', 'PENDING'].includes(m.status)
              );
              const msIdx = activeMs ? c.milestones.indexOf(activeMs) + 1 : 0;
              return (
                <div key={c.id} className="app-card" style={{ marginTop: 12, padding: 16 }}>
                  <h3>{c.title || 'Untitled contract'}</h3>
                  <p>Counterparty: {c.counterpartyName || '—'}</p>
                  <p>
                    {fmtMoney(c.totalAmount, c.asset)} · Milestone {msIdx || '—'} of{' '}
                    {c.milestones.length || '—'}
                  </p>
                  <p style={{ marginTop: 8, color: 'var(--accent-gold)' }}>
                    {c.status.replace(/_/g, ' ')}
                  </p>
                  <div className="app-actions">
                    <Link to={`/contracts/${c.id}`} className="app-btn app-btn--ghost">Open Contract</Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="app-empty">No active contracts yet.</div>
          )}
        </div>
        <div className="app-card">
          <div className="app-card__title">Pending actions</div>
          {data.pendingActions.length ? (
            data.pendingActions.map((a) => (
              <div key={`${a.type}-${a.contractId}-${a.milestoneId || ''}`} className="app-list-item">
                <span>{a.label}</span>
                <Link to={actionLink(a)} className="app-btn app-btn--ghost">Open</Link>
              </div>
            ))
          ) : (
            <div className="app-empty">No pending actions.</div>
          )}
        </div>
      </div>
      <div className="app-grid-2">
        <div className="app-card">
          <div className="app-card__title">Recent payments</div>
          {data.payments.length ? (
            data.payments.map((p, i) => (
              <div key={i} className="app-list-item">
                <div>
                  <strong style={{ color: '#86efac' }}>+{fmtMoney(p.amount, p.asset)}</strong>
                  <br />
                  <span style={{ fontSize: 12, color: '#737373' }}>
                    {p.label}{p.simulated ? ' (simulated)' : ''}
                  </span>
                </div>
                <span style={{ fontSize: 12 }}>{p.status}</span>
              </div>
            ))
          ) : (
            <div className="app-empty">No settlement history yet.</div>
          )}
        </div>
        <div className="app-card">
          <div className="app-card__title">Settlement overview</div>
          <p>{data.settlementOverview.note}</p>
        </div>
      </div>
    </>
  );
}
