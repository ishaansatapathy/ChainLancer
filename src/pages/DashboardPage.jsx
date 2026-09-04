import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney, greeting } from '../lib/format.js';

export default function DashboardPage() {
  const { user, loading } = useAuth({ redirect: true });
  const [data, setData] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  async function loadDashboard() {
    try {
      const res = await api('/api/dashboard');
      setData(res);
    } catch {
      // ignore
    }
  }

  async function handleSeedDemo() {
    setSeeding(true);
    try {
      await api('/api/contracts/seed-demo', { method: 'POST' });
      await loadDashboard();
    } catch {
      // ignore
    } finally {
      setSeeding(false);
    }
  }

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
        <span className="app-hero__eyebrow">Workspace · {user.role ? user.role.toUpperCase() : 'USER'}</span>
        <h1>{greeting(user.fullName)}</h1>
        <div className="app-status-row">
          <span>KYC {data.user.kycStatus === 'VERIFIED' ? '✓' : '○'}</span>
          <span>Wallet {data.user.walletVerified ? '✓' : '○'}</span>
          <span>AML {data.user.amlStatus === 'CLEAR' ? '✓' : '○'}</span>
          <span>Compliance {data.user.complianceStatus === 'APPROVED' ? '✓' : '○'}</span>
        </div>

        <div className="app-actions" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="app-btn app-btn--gold"
            onClick={handleSeedDemo}
            disabled={seeding}
          >
            {seeding ? 'Initializing Demo Escrow...' : '⚡ Initialize Hackathon Demo Contract'}
          </button>
          <Link to="/contracts/create" className="app-btn app-btn--primary">
            + New Contract Agreement
          </Link>
          <Link to="/wallet" className="app-btn app-btn--ghost">
            View Web3 Wallet
          </Link>
        </div>
      </div>

      {/* ── Active Contracts & Pending Actions Grid ── */}
      <div className="app-grid-2" style={{ marginBottom: 24 }}>
        <div className="app-card" id="contracts">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="app-card__title" style={{ margin: 0 }}>Active Contracts & Escrows</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.contracts.length} active</span>
          </div>

          {data.contracts.length ? (
            data.contracts.map((c) => {
              const activeMs = c.milestones.find((m) =>
                ['IN_PROGRESS', 'SUBMITTED', 'PENDING'].includes(m.status)
              );
              const msIdx = activeMs ? c.milestones.indexOf(activeMs) + 1 : 1;
              const firstMs = c.milestones[0];

              return (
                <div key={c.id} className="app-card" style={{ marginTop: 12, padding: 16, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{c.title || 'Untitled Contract'}</h3>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                        Counterparty: <strong>{c.counterpartyName || '—'}</strong> · Network: {c.network || 'Polygon Amoy'}
                      </p>
                    </div>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      background: 'rgba(217,119,6,0.15)',
                      color: 'var(--accent-gold)',
                      border: '1px solid rgba(217,119,6,0.3)'
                    }}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p style={{ margin: '10px 0 12px', fontSize: 14 }}>
                    <strong>{fmtMoney(c.totalAmount, c.asset)}</strong> escrow · {c.milestones.length} milestones
                  </p>

                  <div className="app-actions" style={{ marginTop: 8 }}>
                    <Link to={`/contracts/${c.id}`} className="app-btn app-btn--primary">
                      Open Contract Hub →
                    </Link>
                    {firstMs ? (
                      <Link to={`/contracts/${c.id}/milestones/${firstMs.id}`} className="app-btn app-btn--ghost">
                        Deliverable & Qship AI Review
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                No active escrow contracts yet. Click below to load the complete Polygon Amoy hackathon demo project.
              </p>
              <button
                type="button"
                className="app-btn app-btn--gold"
                onClick={handleSeedDemo}
                disabled={seeding}
              >
                {seeding ? 'Setting up...' : '⚡ Quick-Launch Demo Project'}
              </button>
            </div>
          )}
        </div>

        <div className="app-card">
          <div className="app-card__title">Pending Actions & Review Queue</div>
          {data.pendingActions.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {data.pendingActions.map((a) => (
                <div key={`${a.type}-${a.contractId}-${a.milestoneId || ''}`} className="app-list-item" style={{ padding: '12px 14px' }}>
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.label}</strong>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Action type: {a.type}</p>
                  </div>
                  <Link to={actionLink(a)} className="app-btn app-btn--primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                    Open →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="app-empty">No pending actions required right now.</div>
          )}
        </div>
      </div>

      {/* ── Settlement Ledger & Overview ── */}
      <div className="app-grid-2">
        <div className="app-card">
          <div className="app-card__title">Recent Settlements & Payments</div>
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
            <div className="app-empty">No settlement history yet. Releases appear here automatically.</div>
          )}
          <div style={{ marginTop: 14 }}>
            <Link to="/payments" className="app-btn app-btn--ghost" style={{ fontSize: 12 }}>
              View Full Settlement Ledger →
            </Link>
          </div>
        </div>

        <div className="app-card">
          <div className="app-card__title">Cross-Border Settlement Architecture</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div>
              <strong style={{ color: 'var(--accent-cyan)' }}>1. Polygon Amoy Smart Contract:</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12 }}>Circle USDC held in non-custodial milestone vaults with payer approval gates.</p>
            </div>
            <div>
              <strong style={{ color: '#86efac' }}>2. Qship AI Deliverable Inspector:</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12 }}>Automated 9-dimension review against acceptance criteria before approval.</p>
            </div>
            <div>
              <strong style={{ color: 'var(--accent-gold)' }}>3. 120s Netting Engine:</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12 }}>Offsets corridor obligations off-chain, cutting FX conversion spreads by 60–80%.</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>4. Onramper Route Optimizer:</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12 }}>Ranks live fiat payout routes (Transak UPI, MoonPay, Banxa) by highest net payout.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
