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
        <span className="app-hero__eyebrow">Settlement history</span>
        <h1>Payments</h1>
        <p>Recent milestone releases and settlement activity on your account.</p>
      </div>
      <div className="app-card">
        {data.payments.length ? (
          data.payments.map((p, i) => (
            <div key={i} className="app-list-item">
              <div>
                <strong style={{ color: '#86efac' }}>+{fmtMoney(p.amount, p.asset)}</strong>
                <br />
                <span style={{ fontSize: 12, color: '#737373' }}>
                  {p.label}{p.simulated ? ' · simulated' : ''}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#a3a3a3' }}>{p.status}</span>
            </div>
          ))
        ) : (
          <div className="app-empty">No settlement history yet.</div>
        )}
      </div>
    </>
  );
}
