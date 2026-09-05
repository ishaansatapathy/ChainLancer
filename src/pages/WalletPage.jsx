import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useWallet } from '../hooks/useWallet.js';
import OnramperCheckoutModal from '../components/OnramperCheckoutModal.jsx';

export default function WalletPage() {
  const { loading } = useAuth({ redirect: true });
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = params.get('return');
  const w = useWallet();
  const [showOnramper, setShowOnramper] = useState(false);

  if (loading) return null;

  async function onVerify() {
    const ok = await w.verifyOwnership();
    if (ok) {
      setTimeout(() => navigate(returnTo || '/profile'), 1200);
    }
  }

  return (
    <AuthLayout
      story={
        <>
          <span className="auth-story__eyebrow">Non-custodial</span>
          <h2>
            Your wallet, <em>your keys.</em>
          </h2>
          <p>
            Connect MetaMask on Polygon Amoy and sign a message to prove ownership. No gas. No
            private keys stored.
          </p>
          <div className="auth-story__rule" />
          <ul className="auth-story__features">
            <li><span>01</span> Polygon Amoy testnet (80002)</li>
            <li><span>02</span> Cryptographic ownership proof</li>
            <li><span>03</span> Real POL balance from chain</li>
          </ul>
        </>
      }
    >
      <Link to="/" className="auth-logo">
        <img src="/logo.png" alt="" />
        <span>ChainLancer</span>
      </Link>
      <div className="auth-pane__inner onboarding-inner wallet-inner">
        <h1 className="auth-title">Wallet</h1>
        <p className="auth-lede">{w.statusText}</p>
        {w.error ? <p className="auth-error">{w.error}</p> : null}
        <div className="status-grid wallet-grid">
          <div className="status-pill"><span>Address</span><strong>{w.addressDisplay}</strong></div>
          <div className="status-pill"><span>Network</span><strong>{w.networkDisplay}</strong></div>
          <div className="status-pill"><span>USDC Balance</span><strong style={{ color: 'var(--accent-gold)' }}>{w.onAmoy && w.connected ? w.usdcBalance : '—'}</strong></div>
          <div className="status-pill"><span>Gas (POL)</span><strong>{w.onAmoy && w.connected ? w.balance : w.connected && !w.onAmoy ? 'Switch to Amoy' : '—'}</strong></div>
        </div>
        <div className="wallet-actions">
          {w.connected && w.onAmoy ? (
            <>
              <button
                type="button"
                className="auth-google"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(201, 168, 76, 0.08)', borderColor: 'rgba(201, 168, 76, 0.3)', color: 'var(--accent-gold)' }}
                onClick={w.addUsdcToMetaMask}
                title="Imports the USDC contract into MetaMask so your balance is visible"
              >
                Import USDC Token in MetaMask
              </button>
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noreferrer"
                className="auth-google"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.12)', color: 'var(--text-secondary)', textDecoration: 'none' }}
              >
                Get Free Testnet USDC (Circle Official Faucet)
              </a>
              <button
                type="button"
                className="auth-google"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #c9a84c, #996515)', borderColor: 'transparent', color: '#000', fontWeight: 700 }}
                onClick={() => setShowOnramper(true)}
              >
                Cash Out USDC to Bank (Onramper UPI / IMPS)
              </button>
            </>
          ) : null}
          {!w.hasProvider ? (
            <button type="button" className="auth-google" onClick={() => window.open('https://metamask.io/download/', '_blank')}>
              Install MetaMask
            </button>
          ) : null}
          {!w.connected && w.hasProvider ? (
            <button type="button" className="auth-primary" disabled={w.pending} onClick={w.connectWallet}>
              Connect Wallet
            </button>
          ) : null}
          {w.connected && w.onAmoy && !w.backendVerified ? (
            <button type="button" className="auth-primary" disabled={w.pending} onClick={onVerify}>
              Verify Wallet Ownership
            </button>
          ) : null}
          {w.connected && !w.onAmoy ? (
            <button type="button" className="auth-google" disabled={w.pending} onClick={w.switchNetwork}>
              Switch to Amoy
            </button>
          ) : null}
          {w.backendVerified ? (
            <Link to="/profile" className="auth-primary wallet-link-btn">
              Continue to Profile →
            </Link>
          ) : (
            <Link to="/profile" className="auth-google wallet-link-btn">
              Continue to Profile
            </Link>
          )}
          {w.connected ? (
            <button type="button" className="auth-google" disabled={w.pending} onClick={w.disconnectWallet}>
              Disconnect
            </button>
          ) : null}
        </div>
      </div>
      <OnramperCheckoutModal
        isOpen={showOnramper}
        onClose={() => setShowOnramper(false)}
        amountUsdc={20}
        preferredFiat="INR"
        fiatSymbol="₹"
        fxRate={94.54}
      />
    </AuthLayout>
  );
}
