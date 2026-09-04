import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { api } from '../lib/api.js';

export default function AuthPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'login' ? 'signin' : 'signin');
  const [error, setError] = useState(params.get('error') || '');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });

  useEffect(() => {
    if (params.get('error')) {
      setParams({}, { replace: true });
    }
    api('/api/auth/me')
      .catch(() => null)
      .then(async (data) => {
        if (!data?.user) return;
        try {
          const res = await api('/api/onboarding/status');
          navigate(res?.nextStep === 'complete' ? '/dashboard' : '/onboarding', { replace: true });
        } catch {
          navigate('/onboarding', { replace: true });
        }
      });
  }, [navigate, params, setParams]);

  const signup = mode === 'signup';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(signup ? '/api/auth/signup' : '/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      navigate('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const returnParam = params.get('return') || '/onboarding';
  const googleHref = `/api-auth/google?state=${encodeURIComponent(returnParam)}`;

  return (
    <AuthLayout
      story={
        <>
          <span className="auth-story__eyebrow">Programmable freelance payments</span>
          <h2>
            Agreements that <em>execute.</em>
          </h2>
          <p>
            Turn project terms into milestone-based payment workflows with evidence, approval,
            disputes, and auditable settlement.
          </p>
          <div className="auth-story__rule" />
          <ul className="auth-story__features">
            <li><span>01</span> Non-custodial escrow</li>
            <li><span>02</span> Human-in-the-loop disputes</li>
            <li><span>03</span> Polygon + USDC settlement</li>
          </ul>
        </>
      }
    >
      <Link to="/" className="auth-logo">
        <img src="/logo.png" alt="ChainLancer" />
        <span>ChainLancer</span>
      </Link>
      <div className="auth-pane__inner">
        <h1 className="auth-title">{signup ? 'Welcome to ChainLancer' : 'Welcome back'}</h1>
        <p className="auth-lede">
          {signup ? 'Have an account?' : 'New to ChainLancer?'}{' '}
          <button type="button" className="auth-link" onClick={() => setMode(signup ? 'signin' : 'signup')}>
            {signup ? 'Log in' : 'Create an account'}
          </button>
        </p>
        {error ? <p className="auth-error">{error}</p> : null}
        <form className="auth-form" onSubmit={onSubmit}>
          {signup ? (
            <label className="auth-field">
              <span>Full name</span>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                autoComplete="name"
                placeholder="Your name"
                required
              />
            </label>
          ) : null}
          <label className="auth-field">
            <span>Work Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              placeholder="name@company.com"
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete={signup ? 'new-password' : 'current-password'}
              placeholder={signup ? 'At least 8 characters' : 'Your password'}
              minLength={8}
              required
            />
          </label>
          <button type="submit" className="auth-primary" disabled={busy}>
            {busy ? (signup ? 'Creating…' : 'Signing in…') : signup ? 'Sign up' : 'Log in'}
          </button>
        </form>
        <div className="auth-or"><span>or</span></div>
        <a className="auth-google" href={googleHref}>
          <span>{signup ? 'Sign up with Google' : 'Sign in with Google'}</span>
        </a>
        <p className="auth-legal">
          By continuing you agree to the <a href="#">Terms</a> and <a href="#">Privacy Notice</a>.
        </p>
      </div>
    </AuthLayout>
  );
}
