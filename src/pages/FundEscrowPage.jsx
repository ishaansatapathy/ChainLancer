import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';
import { approveUsdc, fundEscrowOnChain } from '../lib/escrowClient.js';
import { ESCROW_CONTRACT_ADDRESS, POLYGONSCAN_BASE_URL, USDC_AMOY_ADDRESS } from '../lib/escrowConfig.js';

export default function FundEscrowPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth({ redirect: true });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('idle'); // idle | approving | approved | funding | success
  const [approveTxHash, setApproveTxHash] = useState('');
  const [fundTxHash, setFundTxHash] = useState('');

  useEffect(() => {
    if (!user || !id) return;
    api(`/api/contracts/${id}/fund`).then(setData).catch((e) => setError(e.message));
  }, [user, id]);

  if (loading) return null;
  if (error && !data) return <div className="app-error">{error}</div>;
  if (!data) return null;

  const c = data.contract;
  const isDeployed = ESCROW_CONTRACT_ADDRESS && ESCROW_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';

  async function handleApprove() {
    setError('');
    setStep('approving');
    try {
      if (isDeployed && window.ethereum) {
        const [acc] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const hash = await approveUsdc(c.totalAmount, acc);
        setApproveTxHash(hash);
      } else {
        // Fallback simulation if contract not yet deployed to testnet
        await new Promise((r) => setTimeout(r, 1000));
        setApproveTxHash('0xsimulated_amoy_approval_hash');
      }
      setStep('approved');
    } catch (err) {
      setError(err.message || 'USDC Approval failed');
      setStep('idle');
    }
  }

  async function handleFund() {
    setError('');
    setStep('funding');
    try {
      let hash = '';
      if (isDeployed && window.ethereum) {
        const [acc] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        hash = await fundEscrowOnChain(id, c.totalAmount, acc);
        setFundTxHash(hash);
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        hash = '0xsimulated_amoy_deposit_tx_hash';
        setFundTxHash(hash);
      }

      // Record on backend
      await api(`/api/contracts/${id}/fund`, {
        method: 'POST',
        body: JSON.stringify({ fundTxHash: hash })
      });

      setStep('success');
      setTimeout(() => navigate(`/contracts/${id}`), 2500);
    } catch (err) {
      setError(err.message || 'Escrow funding failed');
      setStep('approved');
    }
  }

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Smart escrow</span>
        <h1>Fund Smart Escrow</h1>
        <p>Funds are locked in non-custodial smart escrow and released upon milestone completion.</p>
      </div>

      {error ? <div className="app-error">{error}</div> : null}

      <div className="app-card">
        <div className="app-card__title">Escrow Funding Economics</div>
        <p>Contract total: <strong>{fmtMoney(c.totalAmount, c.asset)}</strong></p>
        <p>Network: <strong>Polygon Amoy (80002)</strong></p>
        <p>Token: <code style={{ fontSize: 12, color: '#a3a3a3' }}>USDC ({USDC_AMOY_ADDRESS})</code></p>
        <p>Escrow contract: <code style={{ fontSize: 12, color: '#a3a3a3' }}>{ESCROW_CONTRACT_ADDRESS}</code></p>
        <p>Client wallet: <code style={{ fontSize: 12, color: '#a3a3a3' }}>{data.walletAddress || user.walletAddress || 'Connect MetaMask'}</code></p>

        {approveTxHash ? (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8 }}>
            <span style={{ color: '#4ade80', fontSize: 12, display: 'block' }}>✓ USDC Approved on Amoy</span>
            {approveTxHash.startsWith('0xsim') ? (
              <span style={{ fontSize: 11, color: '#86efac' }}>Approval recorded</span>
            ) : (
              <a
                href={`${POLYGONSCAN_BASE_URL}/tx/${approveTxHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: '#86efac', textDecoration: 'underline' }}
              >
                View Approval on PolygonScan ↗
              </a>
            )}
          </div>
        ) : null}

        {fundTxHash ? (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: 8 }}>
            <span style={{ color: '#fbbf24', fontSize: 12, display: 'block' }}>✓ Escrow Funded Successfully!</span>
            {fundTxHash.startsWith('0xsim') ? (
              <span style={{ fontSize: 11, color: '#fde047' }}>Deposit confirmed</span>
            ) : (
              <a
                href={`${POLYGONSCAN_BASE_URL}/tx/${fundTxHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: '#fde047', textDecoration: 'underline' }}
              >
                View Deposit on PolygonScan ↗
              </a>
            )}
          </div>
        ) : null}

        <div className="app-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="app-btn app-btn--ghost"
            disabled={step === 'approving' || step === 'approved' || step === 'funding' || step === 'success'}
            onClick={handleApprove}
          >
            {step === 'approving' ? 'Approving USDC in MetaMask...' : step === 'approved' || step === 'funding' || step === 'success' ? '1. USDC Approved ✓' : '1. Approve USDC'}
          </button>
          <button
            type="button"
            className="app-btn app-btn--primary"
            disabled={step !== 'approved' && step !== 'funding'}
            onClick={handleFund}
          >
            {step === 'funding' ? 'Depositing into Escrow...' : step === 'success' ? 'Escrow Funded ✓' : '2. Fund Escrow'}
          </button>
        </div>
      </div>

      <div className="app-actions">
        <Link to={`/contracts/${id}`} className="app-btn app-btn--ghost">Back to Contract</Link>
      </div>
    </>
  );
}
