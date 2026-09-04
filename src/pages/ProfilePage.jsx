import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { initials } from '../lib/format.js';

function TrustBadge({ ok, label }) {
  return <span className={ok ? '' : 'pending'}>{ok ? '✓' : '○'} {label}</span>;
}

export default function ProfilePage() {
  const { user, loading } = useAuth({ redirect: true });
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!user) return;
    api('/api/profile').then((p) => {
      setProfile(p);
      setForm({
        fullName: p.fullName || '',
        headline: p.headline || '',
        country: p.country || '',
        about: p.about || '',
        skills: (p.skills || []).join(', '),
        experience: p.experience || '',
        portfolio: p.portfolio || '',
        hourlyRate: p.hourlyRate || '',
        availability: p.availability || 'Available for work',
        preferredContractType: p.preferredContractType || '',
        preferredMilestoneStructure: p.preferredMilestoneStructure || '',
        settlementAsset: p.settlementAsset || 'USDC',
        settlementNetwork: p.settlementNetwork || 'Polygon',
        preferredFiat: p.preferredFiat || 'INR',
        preferredPayoutMethod: p.preferredPayoutMethod || 'Wallet'
      });
    });
  }, [user]);

  if (loading || !profile) return null;

  async function onSave(e) {
    e.preventDefault();
    setError('');
    try {
      const body = {
        ...form,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean)
      };
      const updated = await api('/api/profile', { method: 'PUT', body: JSON.stringify(body) });
      setProfile(updated);
      setForm({ ...form, skills: (updated.skills || []).join(', ') });
    } catch (err) {
      setError(err.message);
    }
  }

  function field(name) {
    return {
      value: form[name] ?? '',
      onChange: (e) => setForm({ ...form, [name]: e.target.value })
    };
  }

  return (
    <>
      <div className="app-hero">
        <span className="app-hero__eyebrow">Professional identity</span>
        <h1>Complete your profile</h1>
        <p>Build your professional identity for trusted cross-border work.</p>
      </div>
      {error ? <div className="app-error">{error}</div> : null}
      <div className="app-profile-header">
        <div className="app-avatar">{initials(profile.fullName)}</div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', color: '#fff', fontSize: '1.5rem' }}>
            {profile.fullName || 'Your name'}
          </h2>
          <p style={{ color: 'var(--accent-gold)', margin: '4px 0' }}>
            {profile.headline || 'Professional headline'}
          </p>
          <p style={{ color: '#737373', fontSize: 13 }}>
            {profile.country || '—'} · {profile.availability || 'Available for work'}
          </p>
          <div className="app-trust">
            <TrustBadge ok={profile.trust.kyc} label="Identity Verified" />
            <TrustBadge ok={profile.trust.wallet} label="Wallet Verified" />
            <TrustBadge ok={profile.trust.aml} label="AML Screening Cleared" />
          </div>
        </div>
      </div>
      <form className="app-grid-2" onSubmit={onSave}>
        <div className="app-card">
          <div className="app-card__title">Profile information</div>
          <label className="app-field"><span>Full Name</span><input {...field('fullName')} /></label>
          <label className="app-field"><span>Professional Headline</span><input {...field('headline')} placeholder="Blockchain Developer" /></label>
          <label className="app-field"><span>Country / Region</span><input {...field('country')} maxLength={2} placeholder="IN" /></label>
          <label className="app-field"><span>About</span><textarea {...field('about')} /></label>
          <label className="app-field"><span>Skills (comma separated)</span><input {...field('skills')} placeholder="Solidity, React, Polygon" /></label>
          <label className="app-field"><span>Experience</span><textarea {...field('experience')} /></label>
          <label className="app-field"><span>Portfolio URL</span><input {...field('portfolio')} placeholder="https://" /></label>
          {profile.skills?.length ? (
            <div className="app-tags">
              {profile.skills.map((s) => (
                <span key={s} className="app-tag">{s}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <div className="app-card" style={{ marginBottom: 16 }}>
            <div className="app-card__title">Work preferences</div>
            <label className="app-field"><span>Hourly Rate</span><input {...field('hourlyRate')} placeholder="$80/hr" /></label>
            <label className="app-field"><span>Availability</span><input {...field('availability')} /></label>
            <label className="app-field"><span>Preferred Contract Type</span><input {...field('preferredContractType')} /></label>
            <label className="app-field"><span>Preferred Milestone Structure</span><input {...field('preferredMilestoneStructure')} /></label>
          </div>
          <div className="app-card">
            <div className="app-card__title">Settlement preferences</div>
            <label className="app-field"><span>Preferred Settlement Asset</span><input {...field('settlementAsset')} /></label>
            <label className="app-field"><span>Preferred Network</span><input {...field('settlementNetwork')} /></label>
            <label className="app-field"><span>Preferred Fiat Currency</span><input {...field('preferredFiat')} /></label>
            <label className="app-field">
              <span>Preferred Payout Method</span>
              <select {...field('preferredPayoutMethod')}>
                <option>Wallet</option>
                <option>Bank</option>
              </select>
            </label>
          </div>
        </div>
        <div className="app-actions" style={{ gridColumn: '1 / -1' }}>
          <button type="submit" className="app-btn app-btn--primary">Save Profile</button>
          <Link to="/dashboard" className="app-btn app-btn--ghost">Continue to Dashboard</Link>
        </div>
      </form>
    </>
  );
}
