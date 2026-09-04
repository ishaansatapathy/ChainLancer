import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';

export default function SettlementPage() {
  const { contractId, milestoneId } = useParams();
  const { user, loading } = useAuth({ redirect: true });
  const [step, setStep] = useState('optimizer');
  const [options, setOptions] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api(`/api/contracts/${contractId}/milestones/${milestoneId}/settlement/options`)
      .then((data) => {
        setOptions(data);
        setSelectedId(data.recommended.id);
      })
      .catch((e) => setError(e.message));
  }, [user, contractId, milestoneId]);

  if (loading) return null;
  if (error && !options) {
    return (
      <>
        <div className="app-error">{error}</div>
        <Link to={`/contracts/${contractId}`} className="app-btn app-btn--ghost">Back</Link>
      </>
    );
  }
  if (!options) return null;

  const route = options.routes.find((r) => r.id === selectedId) || options.recommended;

  async function confirm() {
    setError('');
    try {
      const res = await api(
        `/api/contracts/${contractId}/milestones/${milestoneId}/settlement/confirm`,
        { method: 'POST', body: JSON.stringify({ routeId: route.id }) }
      );
      setResult(res);
      setStep('complete');
    } catch (e) {
      setError(e.message);
    }
  }

  if (step === 'complete' && result) {
    const s = result.settlement;
    return (
      <>
        <div className="app-hero">
          <span className="app-hero__eyebrow">Complete</span>
          <h1>Settlement Complete</h1>
        </div>
        <div className="app-card">
          <p style={{ color: '#86efac' }}>✓ Escrow released</p>
          <p style={{ color: '#86efac' }}>✓ Settlement route selected</p>
          <p style={{ color: '#86efac' }}>✓ Payout processed (simulated)</p>
          <p className="app-note">Reference: {s.reference} · Demo settlement — not a real fiat transfer</p>
          <p>Net USDC: {fmtMoney(s.netUsdc)} · Est. {s.fiatSymbol}{s.estimatedFiat.toLocaleString()}</p>
          <div className="app-actions">
            <Link to={`/contracts/${contractId}`} className="app-btn app-btn--primary">View Contract</Link>
            <Link to="/payments" className="app-btn app-btn--ghost">View Payments</Link>
          </div>
        </div>
      </>
    );
  }

  if (step === 'confirm') {
    return (
      <>
        <div className="app-hero">
          <span className="app-hero__eyebrow">Settlement confirmation</span>
          <h1>Confirm Settlement</h1>
          <p className="app-note app-note--sim">Simulation / Demo Settlement — no fiat payout will occur.</p>
        </div>
        {error ? <div className="app-error">{error}</div> : null}
        <div className="app-card">
          <p>Original amount: <strong>{fmtMoney(options.releasedAmount)}</strong></p>
          <p>Settlement strategy: <strong>{route.type}</strong></p>
          <p>Settlement cost: <strong>{fmtMoney(route.cost)}</strong></p>
          <p>Estimated net payout: <strong>{route.fiatSymbol}{route.estimatedFiat.toLocaleString()}</strong></p>
          <p style={{ color: 'var(--accent-gold)', marginTop: 12 }}>READY FOR SETTLEMENT</p>
          <div className="app-actions">
            <button type="button" className="app-btn app-btn--primary" onClick={confirm}>Confirm Settlement</button>
            <button type="button" className="app-btn app-btn--ghost" onClick={() => setStep('optimizer')}>Back to Optimizer</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Settlement optimizer</span>
        <h1>Optimize Settlement</h1>
        <p>We compare eligible settlement strategies to maximize the recipient's net payout.</p>
        <p className="app-note app-note--sim">Route comparison uses simulated demo data until live provider integrations are connected.</p>
      </div>
      {error ? <div className="app-error">{error}</div> : null}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <p>Released amount: <strong>{fmtMoney(options.releasedAmount)}</strong></p>
        <p>Destination: <strong>{options.destination}</strong> · Preferred fiat: <strong>{options.preferredFiat}</strong></p>
      </div>
      <div className="app-card" style={{ marginBottom: 16 }}>
        <div className="app-card__title">Step 01 — Netting check</div>
        {options.netting.available ? (
          <>
            <p style={{ color: 'var(--accent-gold)' }}>NETTING AVAILABLE</p>
            <p>Before: {fmtMoney(options.netting.amountBefore)} · After: {fmtMoney(options.netting.amountAfter)}</p>
          </>
        ) : (
          <p>NETTING NOT AVAILABLE</p>
        )}
      </div>
      <div className="app-card" style={{ marginBottom: 16 }}>
        <div className="app-card__title">Step 02 — Compare settlement routes</div>
        {options.routes.map((r) => (
          <div
            key={r.id}
            className={`app-route-card${r.id === selectedId ? ' is-recommended' : ''}`}
            onClick={() => setSelectedId(r.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedId(r.id)}
          >
            <strong>{r.type}</strong>
            <p>Net: {fmtMoney(r.netUsdc)} · Cost: {fmtMoney(r.cost)} · ~{r.settlementMinutes} min</p>
            <p className="app-note">Est. {r.fiatSymbol}{r.estimatedFiat.toLocaleString()} · Simulated demo data</p>
          </div>
        ))}
      </div>
      <div className="app-card" style={{ marginBottom: 16, borderColor: 'var(--accent-gold)' }}>
        <div className="app-card__title">Recommended route</div>
        <p><strong>{options.recommended.type}</strong></p>
        <p className="app-note">Why: {options.recommended.reason}</p>
      </div>
      <div className="app-actions">
        <button type="button" className="app-btn app-btn--primary" onClick={() => setStep('confirm')}>Continue to Confirmation</button>
        <Link to={`/contracts/${contractId}`} className="app-btn app-btn--ghost">Back</Link>
      </div>
    </>
  );
}
