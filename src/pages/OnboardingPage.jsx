import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';

const TITLES = {
  role: ['Choose your role', 'How will you use ChainLancer?'],
  country: ['Your jurisdiction', 'Select the country where you operate.'],
  kyc: ['Identity verification', 'Verify identity before compliance screening.'],
  wallet: ['Connect wallet', 'Link your non-custodial wallet address.']
};

export default function OnboardingPage() {
  const { user, loading } = useAuth({ redirect: true });
  const navigate = useNavigate();
  const [step, setStep] = useState('role');
  const [error, setError] = useState('');
  const [statusUser, setStatusUser] = useState(null);
  const [showFinish, setShowFinish] = useState(false);

  useEffect(() => {
    if (!user) return;
    api('/api/onboarding/status').then((state) => {
      setStatusUser(state.user);
      const s = state.nextStep === 'complete' ? 'wallet' : state.nextStep;
      setStep(s);
      setShowFinish(
        state.nextStep === 'complete' ||
          (state.nextStep === 'wallet' && state.user.walletVerified)
      );
    });
  }, [user]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'kyc-complete') {
        setError('');
        setStatusUser(event.data.user);
        if (event.data.user.complianceStatus === 'APPROVED') setStep('wallet');
      }
      if (event.data?.type === 'kyc-error') setError(event.data.error);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (loading) return null;

  const [title, sub] = TITLES[step] || TITLES.role;
  const u = statusUser || user;

  return (
    <AuthLayout
      story={
        <>
          <span className="auth-story__eyebrow">Compliance-aware onboarding</span>
          <h2>
            Identity, screening, <em>then access.</em>
          </h2>
          <p>
            ChainLancer separates application login from identity verification, AML screening, and
            compliance approval before financial actions.
          </p>
          <div className="auth-story__rule" />
          <ul className="auth-story__features">
            <li><span>01</span> Role-based access control</li>
            <li><span>02</span> Open-source KYC adapter</li>
            <li><span>03</span> OpenSanctions / yente AML screening</li>
          </ul>
        </>
      }
    >
      <Link to="/" className="auth-logo">
        <img src="/logo.png" alt="" />
        <span>ChainLancer</span>
      </Link>
      <div className="auth-pane__inner onboarding-inner">
        <h1 className="auth-title">{title}</h1>
        <p className="auth-lede">{sub}</p>
        {error ? <p className="auth-error">{error}</p> : null}

        {step === 'role' ? (
          <div className="role-grid">
            {['client', 'freelancer', 'arbitrator'].map((role) => (
              <button
                key={role}
                type="button"
                className="role-card"
                onClick={async () => {
                  setError('');
                  try {
                    await api('/api/onboarding/role', {
                      method: 'POST',
                      body: JSON.stringify({ role })
                    });
                    setStep('country');
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        ) : null}

        {step === 'country' ? (
          <>
            <label className="auth-field">
              <span>Country</span>
              <select
                id="country-select"
                className="auth-select"
                defaultValue="IN"
                onChange={(e) => (window.__country = e.target.value)}
              >
                {['IN', 'US', 'GB', 'DE', 'SG', 'AE'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="auth-primary"
              onClick={async () => {
                setError('');
                try {
                  const country = window.__country || 'IN';
                  const data = await api('/api/onboarding/country', {
                    method: 'POST',
                    body: JSON.stringify({ country })
                  });
                  setStatusUser(data.user);
                  setStep('kyc');
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Continue
            </button>
          </>
        ) : null}

        {step === 'kyc' && u ? (
          <>
            <div className="status-grid">
              {[
                ['Role', u.role || 'Pending'],
                ['KYC', u.kycStatus],
                ['AML', u.amlStatus],
                ['Compliance', u.complianceStatus]
              ].map(([k, v]) => (
                <div key={k} className="status-pill">
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="auth-primary"
              onClick={async () => {
                setError('');
                try {
                  const data = await api('/api/kyc/start', { method: 'POST', body: '{}' });
                  if (data.user) setStatusUser(data.user);
                  if (data.session?.redirectUrl) {
                    window.open(data.session.redirectUrl, 'chainlancer-kyc', 'width=480,height=720');
                    setError('Complete verification in the popup window.');
                  }
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Verify Identity
            </button>
            {u.kycStatus !== 'VERIFIED' ? (
              <button
                type="button"
                className="auth-google"
                onClick={async () => {
                  setError('');
                  try {
                    const data = await api('/api/kyc/mock/complete', {
                      method: 'POST',
                      body: JSON.stringify({ outcome: 'VERIFIED' })
                    });
                    setStatusUser(data.user);
                    if (data.user.complianceStatus === 'APPROVED') setStep('wallet');
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Complete mock verification
              </button>
            ) : null}
          </>
        ) : null}

        {step === 'wallet' ? (
          <>
            <p className="auth-lede">
              Connect MetaMask on Polygon Amoy and verify wallet ownership.
            </p>
            <Link className="auth-primary wallet-link-btn" to="/wallet?return=/profile">
              Connect Wallet
            </Link>
            <Link to="/profile" className="auth-google wallet-link-btn">
              Continue to Profile
            </Link>
            {showFinish ? (
              <button type="button" className="auth-google" onClick={() => navigate('/profile')}>
                Go to Profile
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </AuthLayout>
  );
}
