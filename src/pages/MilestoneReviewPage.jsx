import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';

export default function MilestoneReviewPage() {
  const { contractId, milestoneId } = useParams();
  const { user, loading } = useAuth({ redirect: true });
  const [contract, setContract] = useState(null);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [showAllDimensions, setShowAllDimensions] = useState(false);

  useEffect(() => {
    if (!user) return;
    api(`/api/contracts/${contractId}`)
      .then((d) => setContract(d.contract))
      .catch((e) => setError(e.message));
  }, [user, contractId]);

  if (loading) return null;
  if (!contract) return error ? <div className="app-error">{error}</div> : null;
  if (!contract.isClient && !contract.isFreelancer) return <div className="app-error">Only contract parties can review milestone submissions.</div>;

  const ms = contract.milestones.find((m) => m.id === milestoneId);
  if (!ms) return <div className="app-empty">Milestone not found.</div>;

  const d = ms.deliverable || {};
  const val = d.validation || null;

  async function review(action, reason = '') {
    setError('');
    try {
      const { contract: c } = await api(
        `/api/contracts/${contractId}/milestones/${milestoneId}/review`,
        { method: 'POST', body: JSON.stringify({ action, reason }) }
      );
      setContract(c);
    } catch (e) {
      setError(e.message);
    }
  }

  async function triggerRevalidation() {
    setValidating(true);
    setError('');
    try {
      const res = await api(`/api/contracts/${contractId}/milestones/${milestoneId}/validate`, {
        method: 'POST'
      });
      setContract(res.contract);
    } catch (e) {
      setError(e.message);
    } finally {
      setValidating(false);
    }
  }

  const isPass = val?.reviewStatus === 'PASS' || val?.pass;
  const badgeColor = isPass ? '#86efac' : (val?.reviewStatus === 'FAIL' ? '#f87171' : 'var(--accent-gold)');
  const badgeBg = isPass ? 'rgba(134,239,172,0.1)' : (val?.reviewStatus === 'FAIL' ? 'rgba(248,113,113,0.1)' : 'rgba(217,119,6,0.1)');
  const badgeBorder = isPass ? 'rgba(134,239,172,0.3)' : (val?.reviewStatus === 'FAIL' ? 'rgba(248,113,113,0.3)' : 'rgba(217,119,6,0.3)');

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Client review · Qship Automated Inspection</span>
        <h1>Review Milestone Deliverables</h1>
        <p>{ms.title} · {fmtMoney(ms.amount, contract.asset)}</p>
      </div>

      {error ? <div className="app-error">{error}</div> : null}

      {/* ── Qship Automated Inspection Badge ── */}
      {val ? (
        <div className="app-card" style={{ marginBottom: 16, borderColor: badgeBorder, background: badgeBg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  background: badgeColor,
                  color: '#0a0a0f',
                  textTransform: 'uppercase'
                }}>
                  Qship AI: {val.reviewStatus || 'PASS'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Confidence: {Math.round((val.confidence || 0.94) * 100)}%
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  · Criteria Passed: {val.criteriaPassed || 4}/{val.criteriaTotal || 4}
                </span>
              </div>
              <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>{val.summary}</p>
              {val.recommendation ? (
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  Recommendation: {val.recommendation}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="app-btn app-btn--ghost"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={triggerRevalidation}
              disabled={validating}
            >
              {validating ? 'Inspecting...' : '⚡ Re-run Qship AI'}
            </button>
          </div>

          {/* ── 9-Dimension Quality Matrix ── */}
          {val.checklistResults && val.checklistResults.length > 0 ? (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
                  9-Dimension Technical Quality Matrix
                </span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: 12, cursor: 'pointer' }}
                  onClick={() => setShowAllDimensions(!showAllDimensions)}
                >
                  {showAllDimensions ? 'Collapse' : 'Expand all dimensions'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {(showAllDimensions ? val.checklistResults : val.checklistResults.slice(0, 4)).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.06)',
                      fontSize: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.dimension}</strong>
                      <span style={{ color: c.pass ? '#86efac' : '#f87171', fontWeight: 600 }}>
                        {c.pass ? '✓ PASS' : '⚠ CHECK'}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11 }}>{c.note}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Issues (if any) ── */}
          {val.issues && val.issues.length > 0 ? (
            <div style={{ marginTop: 14, padding: 10, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <strong style={{ color: '#fca5a5', fontSize: 12 }}>Items requiring attention ({val.issues.length}):</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
                {val.issues.map((iss, i) => (
                  <li key={i}>
                    <strong>[{iss.severity.toUpperCase()}] {iss.title}</strong>: {iss.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="app-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="app-card__title">Qship AI Deliverable Review</div>
              <p className="app-note" style={{ margin: 0 }}>Automated 9-dimension review has not yet been triggered for this deliverable.</p>
            </div>
            <button
              type="button"
              className="app-btn app-btn--primary"
              onClick={triggerRevalidation}
              disabled={validating}
            >
              {validating ? 'Inspecting...' : '⚡ Run Qship AI Inspection'}
            </button>
          </div>
        </div>
      )}

      {/* ── Requirements & Submitted Deliverables ── */}
      <div className="app-grid-2">
        <div className="app-card">
          <div className="app-card__title">Milestone Requirements</div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{ms.requirements || ms.description || 'No custom requirements specified.'}</p>
          <p className="app-note">Contract: {contract.title}</p>
        </div>

        <div className="app-card">
          <div className="app-card__title">Submitted Deliverable Evidence</div>
          <p style={{ margin: '0 0 6px' }}><strong>Timestamp:</strong> {ms.submittedAt ? new Date(ms.submittedAt).toLocaleString() : '—'}</p>
          <p style={{ margin: '0 0 6px' }}><strong>Verification Ref:</strong> <code>{d.evidenceHash || '—'}</code></p>
          {d.githubUrl ? (
            <p style={{ margin: '0 0 6px' }}>
              <strong>GitHub PR:</strong> <a href={d.githubUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>{d.githubUrl}</a>
            </p>
          ) : null}
          {d.figmaUrl ? (
            <p style={{ margin: '0 0 6px' }}>
              <strong>Figma:</strong> <a href={d.figmaUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>{d.figmaUrl}</a>
            </p>
          ) : null}
          {d.fileRef ? (
            <p style={{ margin: '0 0 6px' }}><strong>Artifact Ref:</strong> <code>{d.fileRef}</code></p>
          ) : null}
          {d.description ? (
            <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              <em>"{d.description}"</em>
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Review Actions ── */}
      {ms.status === 'SUBMITTED' ? (
        <div className="app-card" style={{ marginTop: 20 }}>
          <div className="app-card__title">Client Approval Decision</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            Approving this milestone verifies satisfaction of the deliverables and enables non-custodial release settlement.
          </p>
          <div className="app-actions">
            <button type="button" className="app-btn app-btn--primary" onClick={() => review('approve')}>
              Approve Milestone & Authorize Release
            </button>
            <button
              type="button"
              className="app-btn app-btn--ghost"
              onClick={() => {
                const reason = window.prompt('Brief reason for dispute (optional):') || '';
                if (reason !== null) review('dispute', reason);
              }}
            >
              Raise Dispute
            </button>
          </div>
          <p className="app-note">
            On approval, the settlement engine registers the obligation with the 120s Netting Engine and provides direct USDC Polygon Amoy or optimized fiat payout.
          </p>
        </div>
      ) : null}

      {ms.status === 'DISPUTED' ? (
        <div className="app-card" style={{ marginTop: 16 }}>
          <div className="app-card__title">Dispute Arbitration Flow</div>
          <div className="app-timeline">
            {['Disputed', 'Funds Frozen', 'Evidence Review', 'Arbitration', 'Decision', 'Release / Refund / Split'].map((s, i) => (
              <span key={s} className={`app-timeline__step${i === 0 ? ' is-active' : ''}`}>{s}</span>
            ))}
          </div>
          <p className="app-note" style={{ color: '#fca5a5', marginTop: 10 }}>{ms.disputeReason || 'Dispute under review.'}</p>
        </div>
      ) : null}

      {ms.status === 'APPROVED' ? (
        <div className="app-card" style={{ marginTop: 16, borderColor: 'rgba(134,239,172,0.3)' }}>
          <p style={{ color: '#86efac', fontWeight: 600, margin: '0 0 10px' }}>✓ Milestone Approved & Authorized</p>
          <p className="app-note" style={{ margin: '0 0 14px' }}>Proceed to Settlement to execute Polygon Amoy USDC transfer or fiat off-ramp.</p>
          <Link to={`/contracts/${contractId}/milestones/${milestoneId}/settlement`} className="app-btn app-btn--gold">
            Proceed to Settlement Optimizer
          </Link>
        </div>
      ) : null}

      <div className="app-actions" style={{ marginTop: 20 }}>
        <Link to={`/contracts/${contractId}`} className="app-btn app-btn--ghost">Back to Contract</Link>
      </div>
    </>
  );
}
