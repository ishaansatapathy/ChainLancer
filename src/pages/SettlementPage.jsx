import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';

export default function SettlementPage() {
  const { contractId, milestoneId } = useParams();
  const { user, loading } = useAuth({ redirect: true });
  const [step, setStep] = useState('optimizer'); // 'optimizer' | 'confirm' | 'complete'
  const [settlementMode, setSettlementMode] = useState('fiat'); // 'fiat' | 'onchain'
  const [options, setOptions] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(120);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (!user) return;
    api(`/api/contracts/${contractId}/milestones/${milestoneId}/settlement/options`)
      .then((data) => {
        setOptions(data);
        if (data.recommended) setSelectedId(data.recommended.id);
        if (data.netting?.windowSecondsRemaining) {
          setCountdown(data.netting.windowSecondsRemaining);
        }
      })
      .catch((e) => setError(e.message));
  }, [user, contractId, milestoneId]);

  // Netting 120s countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 120));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return null;
  if (error && !options) {
    return (
      <>
        <div className="app-error">{error}</div>
        <Link to={`/contracts/${contractId}`} className="app-btn app-btn--ghost">Back to Contract</Link>
      </>
    );
  }
  if (!options) return null;

  const currentRoute = settlementMode === 'onchain'
    ? options.onChainRoute
    : (options.routes?.find((r) => r.id === selectedId) || options.recommended);

  async function executeSettlement() {
    setExecuting(true);
    setError('');
    try {
      const res = await api(
        `/api/contracts/${contractId}/milestones/${milestoneId}/settlement/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({
            routeId: currentRoute.id,
            isDirectOnChain: settlementMode === 'onchain'
          })
        }
      );
      setResult(res);
      setStep('complete');
    } catch (e) {
      setError(e.message);
    } finally {
      setExecuting(false);
    }
  }

  // ── Step 3: Complete Screen ──
  if (step === 'complete' && result) {
    const s = result.settlement;
    const isAmoy = s.isDirectOnChain;
    return (
      <>
        <div className="app-hero">
          <span className="app-hero__eyebrow">Settlement Orchestration · Success</span>
          <h1>Settlement Complete</h1>
          <p>
            {isAmoy
              ? 'USDC released directly to your self-custody wallet on Polygon Amoy.'
              : `Funds settled via ${s.provider} to your destination fiat rail.`}
          </p>
        </div>

        <div className="app-card" style={{ borderColor: 'rgba(134,239,172,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 24, color: '#86efac' }}>✓</span>
            <div>
              <strong style={{ fontSize: 16, color: '#86efac' }}>
                {isAmoy ? 'On-Chain USDC Release Confirmed' : `${s.fiatSymbol}${s.estimatedFiat.toLocaleString()} Settlement Executed`}
              </strong>
              <p className="app-note" style={{ margin: 0 }}>Reference: <code>{s.reference}</code></p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Released USDC</span>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700 }}>{fmtMoney(s.netUsdc)}</p>
            </div>
            <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated Net Payout</span>
              <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>
                {s.fiatSymbol}{s.estimatedFiat.toLocaleString()}
              </p>
            </div>
            <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Settlement Rail</span>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600 }}>{s.routeType}</p>
            </div>
          </div>

          {s.txHash ? (
            <div style={{ padding: '12px 14px', background: 'rgba(56,189,248,0.1)', borderRadius: 8, border: '1px solid rgba(56,189,248,0.25)', marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600 }}>Polygon Amoy Transaction Hash:</span>
              <p style={{ margin: '4px 0', fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{s.txHash}</p>
              <a
                href={`https://amoy.polygonscan.com/tx/${s.txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: 'var(--accent-cyan)', textDecoration: 'underline' }}
              >
                View on PolygonScan Amoy Explorer →
              </a>
            </div>
          ) : (
            <p className="app-note app-note--sim" style={{ marginBottom: 20 }}>
              Demo / Sandbox Settlement: Off-ramp payout simulated with real Onramper staging rules.
            </p>
          )}

          <div className="app-actions">
            <Link to={`/contracts/${contractId}`} className="app-btn app-btn--primary">View Contract</Link>
            <Link to="/payments" className="app-btn app-btn--ghost">View Payments History</Link>
          </div>
        </div>
      </>
    );
  }

  // ── Step 2: Confirm Screen ──
  if (step === 'confirm') {
    return (
      <>
        <div className="app-hero">
          <span className="app-hero__eyebrow">Settlement Confirmation</span>
          <h1>Authorize Settlement Execution</h1>
          <p>Verify payout parameters and fee breakdown before triggering settlement.</p>
        </div>

        {error ? <div className="app-error">{error}</div> : null}

        <div className="app-card">
          <div className="app-card__title">Order Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gross Milestone</span>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 600 }}>{fmtMoney(options.releasedAmount)}</p>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Settlement Method</span>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 600 }}>{currentRoute.type}</p>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rail / Channel</span>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 600 }}>{currentRoute.channel}</p>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Estimated Payout</span>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--accent-gold)' }}>
                {currentRoute.fiatSymbol}{currentRoute.estimatedFiat.toLocaleString()}
              </p>
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.25)', borderRadius: 8, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Route Cost & Fees:</span>
              <span>{fmtMoney(currentRoute.cost)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Net USDC Disbursed:</span>
              <span>{fmtMoney(currentRoute.netUsdc)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Estimated Arrival Time:</span>
              <span>~{currentRoute.settlementMinutes} minutes</span>
            </div>
          </div>

          <div className="app-actions">
            <button
              type="button"
              className="app-btn app-btn--primary"
              onClick={executeSettlement}
              disabled={executing}
            >
              {executing ? 'Executing Settlement...' : 'Confirm & Disburse Payout'}
            </button>
            <button
              type="button"
              className="app-btn app-btn--ghost"
              onClick={() => setStep('optimizer')}
              disabled={executing}
            >
              Back to Optimizer
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Step 1: Optimizer Screen ──
  const netting = options.netting || {};

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Settlement Orchestration Engine</span>
        <h1>Optimize Milestone Settlement</h1>
        <p>
          Compare self-custody USDC release on Polygon Amoy against automated fiat off-ramps optimized via Netting & Onramper.
        </p>
      </div>

      {error ? <div className="app-error">{error}</div> : null}

      {/* ── Mode Switcher ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          className={`app-btn ${settlementMode === 'fiat' ? 'app-btn--primary' : 'app-btn--ghost'}`}
          onClick={() => setSettlementMode('fiat')}
          style={{ flex: 1, padding: '12px 16px' }}
        >
          🏦 Optimized Fiat Rail (Netting + Onramper)
        </button>
        <button
          type="button"
          className={`app-btn ${settlementMode === 'onchain' ? 'app-btn--primary' : 'app-btn--ghost'}`}
          onClick={() => setSettlementMode('onchain')}
          style={{ flex: 1, padding: '12px 16px' }}
        >
          ⚡ Direct USDC Release (Polygon Amoy)
        </button>
      </div>

      {settlementMode === 'fiat' ? (
        <>
          {/* ── Netting Engine Batch Card ── */}
          <div className="app-card" style={{ marginBottom: 20, borderColor: netting.matchedAmount > 0 ? 'rgba(217,119,6,0.4)' : 'var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'var(--accent-gold)',
                    color: '#0a0a0f'
                  }}>
                    NETTING ENGINE (120s BATCH)
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--accent-cyan)' }}>
                    ⏱ Window closes in: <strong>{countdown}s</strong>
                  </span>
                </div>
                <p className="app-note" style={{ margin: '0 0 10px' }}>
                  Candidate Key: <code>{netting.candidateKey || `${options.destination}_${options.preferredFiat}_USDC_APPROVED`}</code>
                </p>
              </div>

              {netting.savings?.usdc > 0 ? (
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'rgba(134,239,172,0.15)',
                  border: '1px solid rgba(134,239,172,0.3)',
                  color: '#86efac',
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  ✓ Saves ${netting.savings.usdc} in FX spread & gas
                </div>
              ) : null}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 8 }}>
              <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gross Obligation</span>
                <p style={{ margin: '3px 0 0', fontWeight: 600, fontSize: 15 }}>{fmtMoney(options.releasedAmount)}</p>
              </div>
              <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Peer Matched Offset</span>
                <p style={{ margin: '3px 0 0', fontWeight: 600, fontSize: 15, color: '#86efac' }}>
                  {fmtMoney(netting.matchedAmount || 0)}
                </p>
              </div>
              <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Residual Settlement</span>
                <p style={{ margin: '3px 0 0', fontWeight: 600, fontSize: 15, color: 'var(--accent-gold)' }}>
                  {fmtMoney(netting.residualAmount || options.releasedAmount)}
                </p>
              </div>
            </div>

            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              {netting.savings?.description || 'Matching obligations in corridor pool.'}
            </p>
          </div>

          {/* ── Route Optimizer Comparison ── */}
          <div className="app-card" style={{ marginBottom: 20 }}>
            <div className="app-card__title">Compare Ranked Settlement Routes</div>
            <p className="app-note" style={{ marginBottom: 14 }}>
              Routes dynamically ranked by highest net recipient payout and settlement velocity.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {options.routes.map((r) => {
                const isSelected = r.id === selectedId;
                return (
                  <div
                    key={r.id}
                    className={`app-route-card${isSelected ? ' is-recommended' : ''}`}
                    onClick={() => setSelectedId(r.id)}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer', padding: '16px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <strong style={{ fontSize: 15 }}>{r.type}</strong>
                          {r.isRecommended ? (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              background: 'var(--accent-gold)',
                              color: '#0a0a0f',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}>
                              RECOMMENDED
                            </span>
                          ) : null}
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                          Channel: {r.channel} · ETA: ~{r.settlementMinutes}m
                        </p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                          {r.fiatSymbol}{r.estimatedFiat.toLocaleString()}
                        </span>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                          Cost: {fmtMoney(r.cost)} (Net {fmtMoney(r.netUsdc)})
                        </p>
                      </div>
                    </div>

                    {r.isRecommended && r.reason ? (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'var(--accent-gold)' }}>
                        ★ {r.reason}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* ── Direct On-Chain Polygon Amoy Route Card ── */
        <div className="app-card" style={{ marginBottom: 20 }}>
          <div className="app-card__title">Direct USDC Release (Polygon Amoy Testnet)</div>
          <p className="app-note" style={{ marginBottom: 16 }}>
            Bypass all third-party off-ramps. Release Circle USDC tokens directly to the recipient's MetaMask wallet address.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Network</span>
              <p style={{ margin: '4px 0 0', fontWeight: 600 }}>Polygon Amoy (80002)</p>
            </div>
            <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Circle USDC Contract</span>
              <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: 12 }}>0x41E9...7582</p>
            </div>
            <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net USDC Payout</span>
              <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 18, color: '#86efac' }}>
                {fmtMoney(options.releasedAmount)}
              </p>
            </div>
          </div>

          <div style={{ padding: '12px 14px', background: 'rgba(56,189,248,0.08)', borderRadius: 8, border: '1px solid rgba(56,189,248,0.2)', marginBottom: 20 }}>
            <strong style={{ color: 'var(--accent-cyan)', fontSize: 13 }}>Non-Custodial Guarantee:</strong>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Execution interacts directly with ChainLancerEscrow smart contract. ChainLancer never holds custody of private keys or funds.
            </p>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="app-actions">
        <button
          type="button"
          className="app-btn app-btn--primary"
          onClick={() => setStep('confirm')}
        >
          Proceed with Selected Route ({currentRoute.type})
        </button>
        <Link to={`/contracts/${contractId}`} className="app-btn app-btn--ghost">
          Back to Contract
        </Link>
      </div>
    </>
  );
}
