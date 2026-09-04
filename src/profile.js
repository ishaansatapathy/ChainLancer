import { initApp, api, initials } from './lib/shell.js';

const root = document.getElementById('profile-content');
const errorEl = document.getElementById('profile-error');

function showError(msg) {
  errorEl.hidden = !msg;
  errorEl.textContent = msg || '';
}

function trustBadge(ok, label) {
  return `<span class="${ok ? '' : 'pending'}">${ok ? '✓' : '○'} ${label}</span>`;
}

function renderForm(p) {
  root.innerHTML = `
    <div class="app-profile-header">
      <div class="app-avatar">${initials(p.fullName)}</div>
      <div>
        <h2 style="font-family:var(--font-serif);color:#fff;font-size:1.5rem">${p.fullName || 'Your name'}</h2>
        <p style="color:var(--accent-gold);margin:4px 0">${p.headline || 'Professional headline'}</p>
        <p style="color:#737373;font-size:13px">${p.country || '—'} · ${p.availability || 'Available for work'}</p>
        <div class="app-trust">
          ${trustBadge(p.trust.kyc, 'Identity Verified')}
          ${trustBadge(p.trust.wallet, 'Wallet Verified')}
          ${trustBadge(p.trust.aml, 'AML Screening Cleared')}
        </div>
      </div>
    </div>

    <form id="profile-form" class="app-grid-2">
      <div class="app-card">
        <div class="app-card__title">Profile information</div>
        <label class="app-field"><span>Full Name</span><input name="fullName" value="${p.fullName || ''}" /></label>
        <label class="app-field"><span>Professional Headline</span><input name="headline" value="${p.headline || ''}" placeholder="Blockchain Developer" /></label>
        <label class="app-field"><span>Country / Region</span><input name="country" value="${p.country || ''}" maxlength="2" placeholder="IN" /></label>
        <label class="app-field"><span>About</span><textarea name="about">${p.about || ''}</textarea></label>
        <label class="app-field"><span>Skills (comma separated)</span><input name="skills" value="${(p.skills || []).join(', ')}" placeholder="Solidity, React, Polygon" /></label>
        <label class="app-field"><span>Experience</span><textarea name="experience">${p.experience || ''}</textarea></label>
        <label class="app-field"><span>Portfolio URL</span><input name="portfolio" value="${p.portfolio || ''}" placeholder="https://" /></label>
        ${p.skills?.length ? `<div class="app-tags">${p.skills.map((s) => `<span class="app-tag">${s}</span>`).join('')}</div>` : ''}
      </div>

      <div>
        <div class="app-card" style="margin-bottom:16px">
          <div class="app-card__title">Work preferences</div>
          <label class="app-field"><span>Hourly Rate</span><input name="hourlyRate" value="${p.hourlyRate || ''}" placeholder="$80/hr" /></label>
          <label class="app-field"><span>Availability</span><input name="availability" value="${p.availability || 'Available for work'}" /></label>
          <label class="app-field"><span>Preferred Contract Type</span><input name="preferredContractType" value="${p.preferredContractType || ''}" /></label>
          <label class="app-field"><span>Preferred Milestone Structure</span><input name="preferredMilestoneStructure" value="${p.preferredMilestoneStructure || ''}" /></label>
        </div>
        <div class="app-card">
          <div class="app-card__title">Settlement preferences</div>
          <label class="app-field"><span>Preferred Settlement Asset</span><input name="settlementAsset" value="${p.settlementAsset || 'USDC'}" /></label>
          <label class="app-field"><span>Preferred Network</span><input name="settlementNetwork" value="${p.settlementNetwork || 'Polygon'}" /></label>
          <label class="app-field"><span>Preferred Fiat Currency</span><input name="preferredFiat" value="${p.preferredFiat || 'INR'}" /></label>
          <label class="app-field"><span>Preferred Payout Method</span><select name="preferredPayoutMethod"><option ${p.preferredPayoutMethod === 'Wallet' ? 'selected' : ''}>Wallet</option><option ${p.preferredPayoutMethod === 'Bank' ? 'selected' : ''}>Bank</option></select></label>
        </div>
      </div>
    </form>

    <div class="app-actions">
      <button type="submit" form="profile-form" class="app-btn app-btn--primary" id="save-btn">Save Profile</button>
      <a href="/dashboard.html" class="app-btn app-btn--ghost">Continue to Dashboard</a>
    </div>`;

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.skills = body.skills.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const updated = await api('/api/profile', { method: 'PUT', body: JSON.stringify(body) });
      renderForm(updated);
    } catch (err) {
      showError(err.message);
    }
  });
}

async function bootstrap() {
  await initApp('profile');
  const profile = await api('/api/profile');
  renderForm(profile);
}

bootstrap();
