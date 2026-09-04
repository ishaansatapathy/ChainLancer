import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';

const LIFECYCLE = [
  'DRAFT', 'COMPLIANCE', 'FUNDED', 'IN_PROGRESS', 'SUBMITTED',
  'APPROVED', 'DISPUTED', 'RELEASED', 'SETTLED'
];

function Timeline({ status }) {
  const idx = LIFECYCLE.indexOf(status);
  const relevant = LIFECYCLE.slice(0, Math.max(idx + 1, 2));
  return (
    <div className="app-timeline">
      {relevant.map((s, i) => (
        <span
          key={s}
          className={`app-timeline__step${i < idx ? ' is-done' : ''}${s === status ? ' is-active' : ''}`}
        >
          {s.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}

export default function ContractPage() {
  const { id } = useParams();
  const { user, loading } = useAuth({ redirect: true });
  const [contract, setContract] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !id) return;
    api(`/api/contracts/${id}`).then((d) => setContract(d.contract)).catch((e) => setError(e.message));
  }, [user, id]);

  if (loading) return null;
  if (!contract) return error ? <div className="app-error">{error}</div> : null;

  async function advanceCompliance() {
    try {
      const { contract: c } = await api(`/api/contracts/${id}/compliance`, { method: 'POST' });
      setContract(c);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function participate() {
    try {
      const { contract: c } = await api(`/api/contracts/${id}/participate`, { method: 'POST' });
      setContract(c);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  function milestoneAction(ms) {
    const base = `/contracts/${contract.id}/milestones/${ms.id}`;
    if (ms.status === 'SUBMITTED') {
      return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`${base}/review`} className="app-btn app-btn--primary">Review Submission (Qship AI)</Link>
          <Link to={base} className="app-btn app-btn--ghost">View Deliverable</Link>
        </div>
      );
    }
    if (ms.status === 'APPROVED') {
      return <Link to={`${base}/settlement`} className="app-btn app-btn--gold">Optimize Settlement →</Link>;
    }
    if (['PENDING', 'IN_PROGRESS'].includes(ms.status) && contract.status === 'IN_PROGRESS') {
      return <Link to={base} className="app-btn app-btn--primary">Submit Deliverable</Link>;
    }
    if (contract.status === 'COMPLIANCE') {
      return <Link to={`/contracts/${contract.id}/fund`} className="app-btn app-btn--primary">Fund Escrow</Link>;
    }
    return <Link to={base} className="app-btn app-btn--ghost">View Milestone</Link>;
  }

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Contract</span>
        <h1>{contract.title}</h1>
        <p>
          Client: {contract.counterpartyName || '—'} · {fmtMoney(contract.totalAmount, contract.asset)} ·{' '}
          {contract.network}
        </p>
        <p className="app-note">
          Created {new Date(contract.createdAt).toLocaleDateString()} · {contract.status.replace(/_/g, ' ')}
        </p>
        <div className="app-actions">
          {contract.isClient && contract.status === 'DRAFT' ? (
            <button type="button" className="app-btn app-btn--ghost" onClick={advanceCompliance}>
              Submit for Compliance
            </button>
          ) : null}
          {contract.isClient && contract.status === 'COMPLIANCE' ? (
            <Link to={`/contracts/${contract.id}/fund`} className="app-btn app-btn--primary">Fund Escrow</Link>
          ) : null}
          {user.role === 'freelancer' && !contract.freelancerId ? (
            <button type="button" className="app-btn app-btn--gold" onClick={participate}>Accept Contract</button>
          ) : null}
        </div>
      </div>
      {error ? <div className="app-error">{error}</div> : null}
      <div className="app-card" style={{ marginBottom: 20 }}>
        <div className="app-card__title">Contract lifecycle</div>
        <Timeline status={contract.status} />
      </div>
      <div className="app-card">
        <div className="app-card__title">Milestones</div>
        {contract.milestones.length ? (
          contract.milestones.map((ms) => (
            <div key={ms.id} className="app-milestone-row">
              <strong>{ms.title}</strong>
              <p>{ms.description || '—'}</p>
              <p>{fmtMoney(ms.amount, contract.asset)} · Status: {ms.status.replace(/_/g, ' ')}</p>
              <div className="app-actions">{milestoneAction(ms)}</div>
            </div>
          ))
        ) : (
          <div className="app-empty">No milestones defined.</div>
        )}
      </div>
      <div className="app-actions">
        <Link to="/dashboard" className="app-btn app-btn--ghost">Back to Dashboard</Link>
      </div>
    </>
  );
}
