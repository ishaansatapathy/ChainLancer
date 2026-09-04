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
  const [form, setForm] = useState({ githubUrl: '', figmaUrl: '', fileRef: '', description: '' });

  useEffect(() => {
    if (!user) return;
    api(`/api/contracts/${contractId}`).then((d) => setContract(d.contract)).catch((e) => setError(e.message));
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
    try {
      await api(`/api/contracts/${contractId}/milestones/${milestoneId}/submit`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const { contract: c } = await api(`/api/contracts/${contractId}`);
      setContract(c);
    } catch (err) {
      setError(err.message);
    }
  }

  const d = ms.deliverable;

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Milestone</span>
        <h1>{ms.title}</h1>
        <p>{fmtMoney(ms.amount, contract.asset)} · {ms.status.replace(/_/g, ' ')}</p>
      </div>
      {error ? <div className="app-error">{error}</div> : null}
      <div className="app-grid-2">
        <div className="app-card">
          <div className="app-card__title">Requirements</div>
          <p>{ms.requirements || ms.description || 'No specific requirements listed.'}</p>
          <p className="app-note">Deadline: {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : 'Not set'}</p>
        </div>
        <div className="app-card">
          <div className="app-card__title">Contract context</div>
          <p>{contract.title}</p>
          <p className="app-note">Status: {contract.status.replace(/_/g, ' ')}</p>
          {contract.status !== 'IN_PROGRESS' && !d ? (
            <p className="app-note app-note--sim">Escrow must be funded before deliverables can be submitted.</p>
          ) : null}
        </div>
      </div>
      {d ? (
        <div className="app-card" style={{ marginTop: 20 }}>
          <div className="app-card__title">Evidence submitted</div>
          <p>Timestamp: {new Date(ms.submittedAt).toLocaleString()}</p>
          <p>Evidence reference: <code>{d.evidenceHash}</code></p>
          {d.githubUrl ? <p>GitHub: {d.githubUrl}</p> : null}
          {d.figmaUrl ? <p>Figma: {d.figmaUrl}</p> : null}
          {d.fileRef ? <p>File: {d.fileRef}</p> : null}
          <p>{d.description || ''}</p>
        </div>
      ) : null}
      {canSubmit ? (
        <form className="app-card" style={{ marginTop: 20 }} onSubmit={onSubmit}>
          <div className="app-card__title">Submit deliverable</div>
          <p className="app-note">Evidence represents submitted work. Sensitive raw data is not stored on-chain.</p>
          <label className="app-field"><span>GitHub URL</span><input value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} /></label>
          <label className="app-field"><span>Figma URL</span><input value={form.figmaUrl} onChange={(e) => setForm({ ...form, figmaUrl: e.target.value })} /></label>
          <label className="app-field"><span>File / document reference</span><input value={form.fileRef} onChange={(e) => setForm({ ...form, fileRef: e.target.value })} /></label>
          <label className="app-field"><span>Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <button type="submit" className="app-btn app-btn--primary">Submit Deliverable</button>
        </form>
      ) : null}
      <div className="app-actions">
        <Link to={`/contracts/${contractId}`} className="app-btn app-btn--ghost">Back to Contract</Link>
      </div>
    </>
  );
}
