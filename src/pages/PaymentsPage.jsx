import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';

export default function PaymentsPage() {
  const { user, loading } = useAuth({ redirect: true });
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user) return;
    api('/api/dashboard').then(setData);
  }, [user]);

  if (loading || !data) return null;

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Settlement history & ledger</span>
        <h1>Settlement & Payments</h1>
        <p>Executed milestone releases, Netting offsets, and fiat off-ramp transactions.</p>
      </div>

      <div className="app-card">
        <div className="app-card__title">Completed Transactions</div>
        {data.payments.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
            {data.payments.map((p, i) => {
              const s = p.settlement || {};
              const isAmoy = s.isDirectOnChain;
              return (
                <div
                  key={i}
                  style={{
                    padding: '16px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 16, color: '#86efac' }}>
                        +{fmtMoney(p.amount, p.asset)}
                      </strong>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: isAmoy ? 'rgba(56,189,248,0.15)' : 'rgba(217,119,6,0.15)',
                        color: isAmoy ? 'var(--accent-cyan)' : 'var(--accent-gold)'
                      }}>
                        {isAmoy ? 'POLYGON AMOY (80002)' : (s.provider || 'FIAT OFFRAMP')}
                      </span>
                    </div>

                    <p style={{ margin: '2px 0 6px', fontSize: 13, fontWeight: 500 }}>{p.label}</p>

                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {s.routeType ? <span>Method: {s.routeType} · </span> : null}
                      {s.reference ? <span>Ref: <code>{s.reference}</code> · </span> : null}
                      {s.completedAt ? <span>{new Date(s.completedAt).toLocaleString()}</span> : null}
                    </div>

                    {s.txHash ? (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={`https://amoy.polygonscan.com/tx/${s.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, color: 'var(--accent-cyan)', textDecoration: 'underline' }}
                        >
                          View on PolygonScan: {s.txHash.slice(0, 18)}... →
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {s.estimatedFiat ? (
                      <strong style={{ fontSize: 15, color: 'var(--accent-gold)' }}>
                        ≈ {s.fiatSymbol}{s.estimatedFiat.toLocaleString()}
                      </strong>
                    ) : null}
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: 'rgba(134,239,172,0.15)',
                        color: '#86efac',
                        fontWeight: 600
                      }}>
                        ✓ {p.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="app-empty">No settlement history yet. Approved milestones will appear here after release.</div>
        )}
      </div>
    </>
  );
}
