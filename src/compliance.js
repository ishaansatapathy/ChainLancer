import { initApp, api } from './lib/shell.js';

const root = document.getElementById('compliance-root');

function statusLabel(status) {
  const ok = ['VERIFIED', 'CLEAR', 'APPROVED'].includes(status);
  return `<span style="color:${ok ? '#86efac' : '#737373'}">${status.replace(/_/g, ' ')}</span>`;
}

async function bootstrap() {
  const user = await initApp('compliance');
  if (!user) return;

  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Trust & compliance</span>
      <h1>Compliance</h1>
      <p>Verification status for cross-border contract eligibility. KYC documents are not displayed here.</p>
    </div>
    <div class="app-grid-3">
      <div class="app-card">
        <div class="app-card__title">Identity (KYC)</div>
        <p>${statusLabel(user.kycStatus)}</p>
        <p class="app-note">Identity verification for regulated work.</p>
      </div>
      <div class="app-card">
        <div class="app-card__title">Wallet</div>
        <p>${user.walletVerified ? '<span style="color:#86efac">VERIFIED</span>' : '<span style="color:#737373">NOT VERIFIED</span>'}</p>
        <p class="app-note">${user.walletAddress ? `${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}` : 'No wallet linked'}</p>
        ${!user.walletVerified ? '<a href="/wallet.html" class="app-btn app-btn--ghost" style="margin-top:12px">Connect Wallet</a>' : ''}
      </div>
      <div class="app-card">
        <div class="app-card__title">AML screening</div>
        <p>${statusLabel(user.amlStatus)}</p>
        <p class="app-note">Sanctions and risk screening.</p>
      </div>
    </div>
    <div class="app-card" style="margin-top:20px">
      <div class="app-card__title">Overall compliance</div>
      <p>${statusLabel(user.complianceStatus)}</p>
      <p class="app-note">${user.complianceReason || 'Complete onboarding to finalize compliance review.'}</p>
      ${user.complianceStatus !== 'APPROVED' ? '<a href="/onboarding.html" class="app-btn app-btn--ghost" style="margin-top:12px">Continue Onboarding</a>' : ''}
    </div>`;
}

bootstrap();
