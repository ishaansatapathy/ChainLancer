import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';

export default function MilestonePage() {
  const { contractId, milestoneId } = useParams();
  const { user, loading } = useAuth({ redirect: true });
  const [contract, setContract] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    githubUrl: 'https://github.com/ishaansatapathy/Qship/pull/1',
    figmaUrl: '',
    fileRef: 'PRD-ESCROW-V1.md',
    description: 'Implemented smart contract escrow release with 95% unit test coverage, non-custodial authorization guards, and NatSpec error logging.'
  });

  useEffect(() => {
    if (!user) return;
    api(`/api/contracts/${contractId}`)
      .then((d) => setContract(d.contract))
      .catch((e) => setError(e.message));
  }, [user, contractId]);

  if (loading) return null;
  if (!contract) return error ? <div className="app-error">{error}</div> : null;

  const ms = contract.milestones.find((m) => m.id === milestoneId);
  if (!ms) return <div className="app-empty">Milestone not found.</div>;

  const canSubmit =
    contract.isFreelancer &&
    ['PENDING', 'IN_PROGRESS'].includes(ms.status) &&
    contract.status === 'IN_PROGRESS';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api(`/api/contracts/${contractId}/milestones/${milestoneId}/submit`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const { contract: c } = await api(`/api/contracts/${contractId}`);
      setContract(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const d = ms.deliverable;
  const val = d?.validation;

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Milestone · Deliverable submission</span>
        <h1>{ms.title}</h1>
        <p>{fmtMoney(ms.amount, contract.asset)} · Status: <strong>{ms.status.replace(/_/g, ' ')}</strong></p>
      </div>

      {error ? <div className="app-error">{error}</div> : null}

      <div className="app-grid-2">
        <div className="app-card">
          <div className="app-card__title">Milestone Requirements</div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{ms.requirements || ms.description || 'No specific requirements listed.'}</p>
          <p className="app-note">Deadline: {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : 'Flexible'}</p>
        </div>
        <div className="app-card">
          <div className="app-card__title">Contract Context</div>
          <p><strong>{contract.title}</strong></p>
          <p className="app-note">Lifecycle: {contract.status.replace(/_/g, ' ')}</p>
          {contract.status !== 'IN_PROGRESS' && !d ? (
            <p className="app-note app-note--sim">Escrow must be funded by the client before deliverables can be submitted.</p>
          ) : null}
        </div>
      </div>

      {/* ── Submitted Evidence & Qship Review Card ── */}
      {d ? (
        <div className="app-card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div className="app-card__title" style={{ margin: 0 }}>Submitted Deliverables & Verification Evidence</div>
            {val ? (
              <span style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                background: 'rgba(201,168,76,0.12)',
                color: 'var(--accent-gold)',
                border: '1px solid rgba(201,168,76,0.25)'
              }}>
                Qship AI: {val.reviewStatus} ({Math.round((val.confidence || 0.94) * 100)}%)
              </span>
            ) : null}
          </div>

          <p style={{ margin: '0 0 6px' }}><strong>Timestamp:</strong> {new Date(ms.submittedAt).toLocaleString()}</p>
          <p style={{ margin: '0 0 6px' }}><strong>Verification Reference:</strong> <code>{d.evidenceHash}</code></p>
          {d.githubUrl ? (
            <p style={{ margin: '0 0 6px' }}>
              <strong>GitHub PR:</strong> <a href={d.githubUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)' }}>{d.githubUrl}</a>
            </p>
          ) : null}
          {d.figmaUrl ? (
            <p style={{ margin: '0 0 6px' }}>
              <strong>Figma:</strong> <a href={d.figmaUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)' }}>{d.figmaUrl}</a>
            </p>
          ) : null}
          {d.fileRef ? (
            <p style={{ margin: '0 0 6px' }}><strong>Artifact Reference:</strong> <code>{d.fileRef}</code></p>
          ) : null}
          {d.description ? (
            <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              <em>"{d.description}"</em>
            </p>
          ) : null}

          {val?.summary ? (
            <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong style={{ fontSize: 12, color: 'var(--accent-gold)' }}>Qship Staff Review Summary:</strong>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-primary)' }}>{val.summary}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Submission Form for Freelancer ── */}
      {canSubmit ? (
        <form className="app-card" style={{ marginTop: 20 }} onSubmit={onSubmit}>
          <div className="app-card__title">Submit Deliverable for Automated Qship Review</div>
          <p className="app-note" style={{ marginBottom: 14 }}>
            Submitting triggers Qship's 9-dimension automated inspection (Requirements Fit, Security, Error Handling, Test Coverage).
          </p>

          <label className="app-field">
            <span>GitHub Pull Request or Repo URL</span>
            <input
              value={form.githubUrl}
              placeholder="https://github.com/owner/repo/pull/1"
              onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
            />
          </label>

          <label className="app-field">
            <span>Figma Design Specifications URL (Optional)</span>
            <input
              value={form.figmaUrl}
              placeholder="https://figma.com/file/..."
              onChange={(e) => setForm({ ...form, figmaUrl: e.target.value })}
            />
          </label>

          <label className="app-field">
            <span>Artifact / Document Reference</span>
            <input
              value={form.fileRef}
              placeholder="e.g. contracts/ChainLancerEscrow.sol or PRD reference"
              onChange={(e) => setForm({ ...form, fileRef: e.target.value })}
            />
          </label>

          <label className="app-field">
            <span>Deliverable Notes & Verification Summary</span>
            <textarea
              rows={3}
              value={form.description}
              placeholder="Describe what was built, testing performed, and security considerations..."
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <button type="submit" className="app-btn app-btn--primary" disabled={submitting}>
            {submitting ? 'Submitting & Running Qship AI...' : 'Submit Deliverable for Review'}
          </button>
        </form>
      ) : null}

      <div className="app-actions" style={{ marginTop: 20 }}>
        <Link to={`/contracts/${contractId}`} className="app-btn app-btn--ghost">Back to Contract</Link>
      </div>
    </>
  );
}
