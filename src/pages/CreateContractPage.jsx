import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';

const emptyMs = () => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  amount: '',
  dueDate: '',
  requirements: ''
});

export default function CreateContractPage() {
  const { user, loading } = useAuth({ redirect: true });
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [milestones, setMilestones] = useState([{ ...emptyMs(), title: 'Milestone 1' }]);
  const [form, setForm] = useState({
    counterpartyName: '',
    title: '',
    description: '',
    totalAmount: '',
    asset: 'USDC',
    network: 'Polygon'
  });

  useEffect(() => {
    if (user && user.role !== 'client') {
      setError('Only clients can create contracts. Switch to a client account to continue.');
    }
  }, [user]);

  if (loading) return null;

  const sum = milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const total = Number(form.totalAmount) || 0;
  const match = Math.abs(sum - total) < 0.01;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (milestones.length && !match) {
      setError('Sum of milestone amounts must equal total contract amount.');
      return;
    }
    try {
      const body = {
        ...form,
        totalAmount: total,
        milestones: milestones.map((m) => ({
          title: m.title.trim(),
          description: m.description.trim(),
          amount: Number(m.amount),
          dueDate: m.dueDate || null,
          requirements: m.requirements.trim()
        }))
      };
      const { contract } = await api('/api/contracts', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      navigate(`/contracts/${contract.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Programmable agreement</span>
        <h1>Create Contract</h1>
        <p>Turn a freelance agreement into a structured programmable contract with milestone-based escrow.</p>
      </div>
      {error ? <div className="app-error">{error}</div> : null}
      <form onSubmit={onSubmit}>
        <div className="app-grid-2">
          <div className="app-card">
            <div className="app-card__title">Contract details</div>
            <label className="app-field"><span>Client / Counterparty</span><input required value={form.counterpartyName} onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })} /></label>
            <label className="app-field"><span>Project Title</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className="app-field"><span>Project Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="app-field"><span>Total Amount</span><input type="number" min="0" step="0.01" required value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} /></label>
            <label className="app-field"><span>Asset</span><input value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} /></label>
            <label className="app-field"><span>Network</span><input value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} /></label>
          </div>
          <div className="app-card">
            <div className="app-card__title">Milestones</div>
            {milestones.map((m, i) => (
              <div key={m.id} className="app-milestone-row">
                <label className="app-field"><span>Title</span><input required value={m.title} onChange={(e) => { const n = [...milestones]; n[i] = { ...m, title: e.target.value }; setMilestones(n); }} /></label>
                <label className="app-field"><span>Description</span><textarea value={m.description} onChange={(e) => { const n = [...milestones]; n[i] = { ...m, description: e.target.value }; setMilestones(n); }} /></label>
                <label className="app-field"><span>Amount</span><input type="number" min="0" step="0.01" required value={m.amount} onChange={(e) => { const n = [...milestones]; n[i] = { ...m, amount: e.target.value }; setMilestones(n); }} /></label>
                <label className="app-field"><span>Due date</span><input type="date" value={m.dueDate} onChange={(e) => { const n = [...milestones]; n[i] = { ...m, dueDate: e.target.value }; setMilestones(n); }} /></label>
                <label className="app-field"><span>Deliverable requirements</span><textarea value={m.requirements} onChange={(e) => { const n = [...milestones]; n[i] = { ...m, requirements: e.target.value }; setMilestones(n); }} /></label>
                <button type="button" className="app-btn app-btn--ghost" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            <button type="button" className="app-btn app-btn--ghost" onClick={() => setMilestones([...milestones, emptyMs()])}>Add Milestone</button>
            <p className="app-note" style={{ color: match ? 'var(--accent-gold)' : '#f43f5e', fontWeight: 500 }}>
              Milestone total: {fmtMoney(sum)} — {match ? 'matches contract total' : 'must equal contract total'}
            </p>
          </div>
        </div>
        <div className="app-actions">
          <button type="submit" className="app-btn app-btn--primary" disabled={user?.role !== 'client'}>Generate Contract</button>
          <Link to="/dashboard" className="app-btn app-btn--ghost">Cancel</Link>
        </div>
      </form>
    </>
  );
}
