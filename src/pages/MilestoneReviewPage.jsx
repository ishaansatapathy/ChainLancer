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

  useEffect(() => {
    if (!user) return;
    api(`/api/contracts/${contractId}`).then((d) => setContract(d.contract)).catch((e) => setError(e.message));
  }, [user, contractId]);

  if (loading) return null;
  if (!contract) return error ? <div className="app-error">{error}</div> : null;
  if (!contract.isClient) return <div className="app-error">Only the client can review milestone submissions.</div>;

  const ms = contract.milestones.find((m) => m.id === milestoneId);
  if (!ms) return <div className="app-empty">Milestone not found.</div>;

  const d = ms.deliverable || {};

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

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Client review</span>
        <h1>Milestone submitted</h1>
        <p>{ms.title} · {fmtMoney(ms.amount, contract.asset)}</p>
      </div>
      {error ? <div className="app-error">{error}</div> : null}
      <div className="app-card">
        <div className="app-card__title">Requirements</div>
        <p>{ms.requirements || '—'}</p>
      </div>
      <div className="app-card" style={{ marginTop: 16 }}>
        <div className="app-card__title">Submitted evidence</div>
        <p>Timestamp: {ms.submittedAt ? new Date(ms.submittedAt).toLocaleString() : '—'}</p>
        <p>Reference: <code>{d.evidenceHash || '—'}</code></p>
        {d.githubUrl ? <p>GitHub: {d.githubUrl}</p> : null}
        {d.figmaUrl ? <p>Figma: {d.figmaUrl}</p> : null}
        {d.fileRef ? <p>File: {d.fileRef}</p> : null}
        <p>{d.description || ''}</p>
      </div>
      {ms.status === 'SUBMITTED' ? (
        <>
          <div className="app-actions">
            <button type="button" className="app-btn app-btn--primary" onClick={() => review('approve')}>Approve Milestone</button>
            <button
              type="button"
              className="app-btn app-btn--ghost"
              onClick={() => {
                const reason = window.prompt('Brief reason for dispute (optional):') || '';
                review('dispute', reason);
              }}
            >
              Raise Dispute
            </button>
          </div>
          <p className="app-note">On approval, authorized release flows through the smart contract.</p>
        </>
      ) : null}
      {ms.status === 'DISPUTED' ? (
        <div className="app-card" style={{ marginTop: 16 }}>
          <div className="app-card__title">Dispute flow</div>
          <div className="app-timeline">
            {['Disputed', 'Funds Frozen', 'Evidence Review', 'Arbitration', 'Decision', 'Release / Refund / Split'].map((s, i) => (
              <span key={s} className={`app-timeline__step${i === 0 ? ' is-active' : ''}`}>{s}</span>
            ))}
          </div>
          <p className="app-note">{ms.disputeReason || 'Dispute under review.'}</p>
        </div>
      ) : null}
      {ms.status === 'APPROVED' ? (
        <div className="app-card" style={{ marginTop: 16, borderColor: 'rgba(134,239,172,0.3)' }}>
          <p style={{ color: '#86efac' }}>✓ Milestone approved</p>
          <Link to={`/contracts/${contractId}/milestones/${milestoneId}/settlement`} className="app-btn app-btn--gold">Continue to Settlement</Link>
        </div>
      ) : null}
      <div className="app-actions">
        <Link to={`/contracts/${contractId}`} className="app-btn app-btn--ghost">Back to Contract</Link>
      </div>
    </>
  );
}
