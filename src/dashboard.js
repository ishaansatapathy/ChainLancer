import { initApp, api, greeting, fmtMoney } from './lib/shell.js';

const root = document.getElementById('dashboard-root');

function contractCard(c) {
  const activeMs = c.milestones.find((m) => ['IN_PROGRESS', 'SUBMITTED', 'PENDING'].includes(m.status));
  const msIdx = activeMs ? c.milestones.indexOf(activeMs) + 1 : 0;
  return `
    <div class="app-card">
      <h3>${c.title || 'Untitled contract'}</h3>
      <p>Counterparty: ${c.counterpartyName || '—'}</p>
      <p>${fmtMoney(c.totalAmount, c.asset)} · Milestone ${msIdx || '—'} of ${c.milestones.length || '—'}</p>
      <p style="margin-top:8px;color:var(--accent-gold)">${c.status.replace(/_/g, ' ')}</p>
      <div class="app-actions"><a class="app-btn app-btn--ghost" href="/contract.html?id=${c.id}">Open Contract</a></div>
    </div>`;
}

async function bootstrap() {
  const user = await initApp('dashboard');
  if (!user) return;
  const data = await api('/api/dashboard');

  const createBtn = user.role === 'client'
    ? `<a href="/create-contract.html" class="app-btn app-btn--primary">Create Contract</a>`
    : '';

  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Workspace</span>
      <h1>${greeting(user.fullName)}</h1>
      <div class="app-status-row">
        <span>KYC ${data.user.kycStatus === 'VERIFIED' ? '✓' : '○'}</span>
        <span>Wallet ${data.user.walletVerified ? '✓' : '○'}</span>
        <span>AML ${data.user.amlStatus === 'CLEAR' ? '✓' : '○'}</span>
      </div>
      <div class="app-actions">${createBtn}</div>
    </div>

    <div class="app-grid-2" style="margin-bottom:24px">
      <div class="app-card" id="contracts">
        <div class="app-card__title">Active contracts</div>
        ${data.contracts.length
          ? data.contracts.map(contractCard).join('')
          : '<div class="app-empty">No active contracts yet.</div>'}
      </div>
      <div class="app-card">
        <div class="app-card__title">Pending actions</div>
        ${data.pendingActions.length
          ? data.pendingActions.map((a) => {
              let href = '#';
              if (a.type === 'fund') href = `/fund-escrow.html?id=${a.contractId}`;
              if (a.type === 'approval') href = `/milestone-review.html?contractId=${a.contractId}&milestoneId=${a.milestoneId}`;
              if (a.type === 'deliverable') href = `/milestone.html?contractId=${a.contractId}&milestoneId=${a.milestoneId}`;
              return `<div class="app-list-item"><span>${a.label}</span><a class="app-btn app-btn--ghost" href="${href}">Open</a></div>`;
            }).join('')
          : '<div class="app-empty">No pending actions.</div>'}
      </div>
    </div>

    <div class="app-grid-2">
      <div class="app-card">
        <div class="app-card__title">Recent payments</div>
        ${data.payments.length
          ? data.payments.map((p) => `<div class="app-list-item"><div><strong style="color:#86efac">+${fmtMoney(p.amount, p.asset)}</strong><br><span style="font-size:12px;color:#737373">${p.label}${p.simulated ? ' (simulated)' : ''}</span></div><span style="font-size:12px">${p.status}</span></div>`).join('')
          : '<div class="app-empty">No settlement history yet.</div>'}
      </div>
      <div class="app-card">
        <div class="app-card__title">Settlement overview</div>
        <p>${data.settlementOverview.note}</p>
      </div>
    </div>`;
}

bootstrap();
