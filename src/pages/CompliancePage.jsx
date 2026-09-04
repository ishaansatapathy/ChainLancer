import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

function StatusLabel({ status }) {
  const ok = ['VERIFIED', 'CLEAR', 'APPROVED'].includes(status);
  return <span style={{ color: ok ? '#86efac' : '#737373' }}>{status.replace(/_/g, ' ')}</span>;
}

export default function CompliancePage() {
  const { user, loading } = useAuth({ redirect: true });
  if (loading || !user) return null;

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Trust & compliance</span>
        <h1>Compliance</h1>
        <p>Verification status for cross-border contract eligibility.</p>
      </div>
      <div className="app-grid-3">
        <div className="app-card">
          <div className="app-card__title">Identity (KYC)</div>
          <p><StatusLabel status={user.kycStatus} /></p>
        </div>
        <div className="app-card">
          <div className="app-card__title">Wallet</div>
          <p>{user.walletVerified ? <span style={{ color: '#86efac' }}>VERIFIED</span> : <span style={{ color: '#737373' }}>NOT VERIFIED</span>}</p>
          {!user.walletVerified ? (
            <Link to="/wallet" className="app-btn app-btn--ghost" style={{ marginTop: 12 }}>Connect Wallet</Link>
          ) : null}
        </div>
        <div className="app-card">
          <div className="app-card__title">AML screening</div>
          <p><StatusLabel status={user.amlStatus} /></p>
        </div>
      </div>
      <div className="app-card" style={{ marginTop: 20 }}>
        <div className="app-card__title">Overall compliance</div>
        <p><StatusLabel status={user.complianceStatus} /></p>
        <p className="app-note">{user.complianceReason || 'Complete onboarding to finalize compliance review.'}</p>
        {user.complianceStatus !== 'APPROVED' ? (
          <Link to="/onboarding" className="app-btn app-btn--ghost" style={{ marginTop: 12 }}>Continue Onboarding</Link>
        ) : null}
      </div>
    </>
  );
}
