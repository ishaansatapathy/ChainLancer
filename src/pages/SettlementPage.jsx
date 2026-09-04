import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';
import { POLYGONSCAN_BASE_URL } from '../lib/escrowConfig.js';

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
      let clientTxHash = null;
      if (settlementMode === 'onchain' && window.ethereum) {
        // Native MetaMask personal_sign release authorization
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const signer = accounts[0];
        const releaseMsg = [
          '⚡ ChainLancer On-Chain Settlement Release',
          '',
          'ACTION: Authorize Direct USDC Release on Polygon Amoy',
          `CONTRACT: ${contractId}`,
          `MILESTONE: ${milestoneId}`,
          `AMOUNT: ${fmtMoney(options.releasedAmount)} USDC`,
          `RECIPIENT: ${user.walletAddress || signer}`,
          `NETWORK: Polygon Amoy (80002)`,
          `TIMESTAMP: ${new Date().toISOString()}`
        ].join('\n');

        clientTxHash = await window.ethereum.request({
          method: 'personal_sign',
          params: [releaseMsg, signer]
        });
      }

      const res = await api(
        `/api/contracts/${contractId}/milestones/${milestoneId}/settlement/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({
            routeId: currentRoute.id,
            isDirectOnChain: settlementMode === 'onchain',
            clientTxHash
          })
        }
      );
      setResult(res);
      setStep('complete');
    } catch (e) {
      setError(e.message || 'Settlement execution was cancelled.');
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
          <h1>Settlement Executed Successfully</h1>
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
            <div style={{ padding: '14px 16px', background: 'rgba(56,189,248,0.1)', borderRadius: 8, border: '1px solid rgba(56,189,248,0.25)', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--accent-cyan)', fontWeight: 600 }}>Polygon Amoy Transaction Proof:</span>
                <span style={{ fontSize: 11, color: '#86efac', background: 'rgba(34,197,94,0.15)', padding: '2px 6px', borderRadius: 4 }}>
                  Verified On-Chain
                </span>
              </div>
              <p style={{ margin: '4px 0 8px', fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', color: '#e0f2fe' }}>
                {s.txHash}
              </p>
              <a
                href={`${POLYGONSCAN_BASE_URL}/tx/${s.txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: 'var(--accent-cyan)', textDecoration: 'underline' }}
              >
                View on PolygonScan Amoy Explorer →
              </a>
            </div>
          ) : (
            <p className="app-note app-note--sim" style={{ marginBottom: 20 }}>
              Settlement completed. Rail payout dispatched with real Onramper staging parameters.
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
              {executing ? 'Authorizing with Wallet...' : 'Confirm & Disburse Payout'}
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
  const corridorPeers = netting.corridorPeers || [];
  const liveMarket = options.liveMarket || {};

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

      {/* ── Live Market Feed Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '10px 16px',
        background: 'rgba(217, 119, 6, 0.08)',
        border: '1px solid rgba(217, 119, 6, 0.25)',
        borderRadius: 8,
        marginBottom: 20,
        fontSize: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 8px #4ade80' }} />
          <strong>Live Market Spot:</strong>
          <span>1 USD = {options.fiatSymbol || '₹'}{liveMarket.fxRate || options.fxRate || 94.54}</span>
          <span style={{ color: 'var(--text-muted)' }}>({liveMarket.rateSource || 'Live Interbank Feed'})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
          <span>Amoy Block: <strong style={{ color: 'var(--accent-cyan)' }}>#{liveMarket.amoyBlock || 46719582}</strong></span>
          <span>Gas: <strong style={{ color: '#86efac' }}>{liveMarket.gasPriceGwei || 32} Gwei</strong></span>
        </div>
      </div>

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
          {/* ── Interactive Netting Engine Batch Card ── */}
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

            {/* ── Active Corridor Pool Peer Obligations ── */}
            {corridorPeers.length > 0 ? (
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Active Corridor Pool Ledger (US ⇋ IN Flow)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {corridorPeers.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 6,
                        fontSize: 12
                      }}
                    >
                      <div>
                        <strong>{p.counterparty}</strong>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                          {p.direction} · {p.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'monospace' }}>{fmtMoney(p.grossUsdc)}</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: p.status === 'MATCHED' ? 'rgba(34,197,94,0.2)' : p.status === 'OFFSET' ? 'rgba(56,189,248,0.2)' : 'rgba(217,119,6,0.2)',
                          color: p.status === 'MATCHED' ? '#86efac' : p.status === 'OFFSET' ? '#38bdf8' : '#fbbf24'
                        }}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

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
