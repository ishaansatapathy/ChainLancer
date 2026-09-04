import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';

export default function FundEscrowPage() {
  const { id } = useParams();
  const { user, loading } = useAuth({ redirect: true });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !id) return;
    api(`/api/contracts/${id}/fund`).then(setData).catch((e) => setError(e.message));
  }, [user, id]);

  if (loading) return null;
  if (error && !data) return <div className="app-error">{error}</div>;
  if (!data) return null;

  const c = data.contract;

  async function attempt() {
    setError('');
    try {
      await api(`/api/contracts/${id}/fund`, { method: 'POST', body: '{}' });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Smart escrow</span>
        <h1>Fund Smart Escrow</h1>
        <p>Funds are locked by the smart contract and released according to the contract conditions.</p>
      </div>
      {error ? <div className="app-error">{error}</div> : null}
      <div className="app-card">
        <div className="app-card__title">Funding details</div>
        <p>Contract total: <strong>{fmtMoney(c.totalAmount, c.asset)}</strong></p>
        <p>Network: <strong>{c.network}</strong></p>
        <p>Escrow contract: <code style={{ fontSize: 12, color: '#a3a3a3' }}>{data.escrowAddress}</code></p>
        <p>Wallet: <code style={{ fontSize: 12, color: '#a3a3a3' }}>{data.walletAddress || 'Connect wallet first'}</code></p>
        <p className="app-note">{data.note}</p>
        <div className="app-actions">
          <button type="button" className="app-btn app-btn--ghost" onClick={attempt}>Approve USDC</button>
          <button type="button" className="app-btn app-btn--primary" onClick={attempt}>Fund Escrow</button>
        </div>
      </div>
      <div className="app-actions">
        <Link to={`/contracts/${id}`} className="app-btn app-btn--ghost">Back to Contract</Link>
      </div>
    </>
  );
}
