import { initApp, api, qs, fmtMoney } from './lib/shell.js';

const root = document.getElementById('contract-root');
const id = qs('id');

const LIFECYCLE = [
  'DRAFT', 'COMPLIANCE', 'FUNDED', 'IN_PROGRESS', 'SUBMITTED',
  'APPROVED', 'DISPUTED', 'RELEASED', 'SETTLED'
];

function timeline(status) {
  const idx = LIFECYCLE.indexOf(status);
  const relevant = LIFECYCLE.slice(0, Math.max(idx + 1, 2));
  if (status === 'DISPUTED') relevant.push('DISPUTED');
  return relevant.map((s, i) => {
    const done = i < idx;
    const active = s === status;
    return `<span class="app-timeline__step${done ? ' is-done' : ''}${active ? ' is-active' : ''}">${s.replace(/_/g, ' ')}</span>`;
  }).join('');
}

function milestoneCard(c, ms, user) {
  const href = `/milestone.html?contractId=${c.id}&milestoneId=${ms.id}`;
  const reviewHref = `/milestone-review.html?contractId=${c.id}&milestoneId=${ms.id}`;
  let action = '';
  if (c.isClient && ms.status === 'SUBMITTED') {
    action = `<a class="app-btn app-btn--primary" href="${reviewHref}">Review Submission</a>`;
  } else if (c.isClient && c.status === 'COMPLIANCE') {
    action = `<a class="app-btn app-btn--ghost" href="/fund-escrow.html?id=${c.id}">Fund Escrow</a>`;
  } else if (c.isFreelancer && ['PENDING', 'IN_PROGRESS'].includes(ms.status) && c.status === 'IN_PROGRESS') {
    action = `<a class="app-btn app-btn--primary" href="${href}">Submit Deliverable</a>`;
  } else if (c.isFreelancer || c.isClient) {
    action = `<a class="app-btn app-btn--ghost" href="${href}">View Requirements</a>`;
  }
  if (ms.status === 'APPROVED' && c.isFreelancer) {
    action = `<a class="app-btn app-btn--gold" href="/settlement.html?contractId=${c.id}&milestoneId=${ms.id}">Optimize Settlement</a>`;
  }
  return `
    <div class="app-milestone-row">
      <strong>${ms.title}</strong>
      <p>${ms.description || '—'}</p>
      <p>${fmtMoney(ms.amount, c.asset)} · Status: ${ms.status.replace(/_/g, ' ')}</p>
      <div class="app-actions">${action}</div>
    </div>`;
}

function render(c, user) {
  let topActions = '';
  if (c.isClient && c.status === 'DRAFT') {
    topActions = `<button class="app-btn app-btn--ghost" id="advance-compliance">Submit for Compliance</button>`;
  }
  if (c.isClient && c.status === 'COMPLIANCE') {
    topActions = `<a class="app-btn app-btn--primary" href="/fund-escrow.html?id=${c.id}">Fund Escrow</a>`;
  }
  if (user.role === 'freelancer' && !c.freelancerId) {
    topActions = `<button class="app-btn app-btn--gold" id="participate-btn">Accept Contract</button>`;
  }

  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Contract</span>
      <h1>${c.title}</h1>
      <p>Client: ${c.counterpartyName || '—'} · ${fmtMoney(c.totalAmount, c.asset)} · ${c.network}</p>
      <p class="app-note">Created ${new Date(c.createdAt).toLocaleDateString()} · ${c.status.replace(/_/g, ' ')}</p>
      <div class="app-actions">${topActions}</div>
    </div>
    <div id="contract-error" class="app-error" hidden></div>
    <div class="app-card" style="margin-bottom:20px">
      <div class="app-card__title">Contract lifecycle</div>
      <div class="app-timeline">${timeline(c.status)}</div>
    </div>
    <div class="app-card">
      <div class="app-card__title">Milestones</div>
      ${c.milestones.length
        ? c.milestones.map((ms) => milestoneCard(c, ms, user)).join('')
        : '<div class="app-empty">No milestones defined.</div>'}
    </div>
    <div class="app-actions"><a href="/dashboard.html" class="app-btn app-btn--ghost">Back to Dashboard</a></div>`;

  document.getElementById('advance-compliance')?.addEventListener('click', async () => {
    try {
      const { contract } = await api(`/api/contracts/${c.id}/compliance`, { method: 'POST' });
      render(contract, user);
    } catch (err) {
      const el = document.getElementById('contract-error');
      el.hidden = false;
      el.textContent = err.message;
    }
  });

  document.getElementById('participate-btn')?.addEventListener('click', async () => {
    try {
      const { contract } = await api(`/api/contracts/${c.id}/participate`, { method: 'POST' });
      render(contract, user);
    } catch (err) {
      const el = document.getElementById('contract-error');
      el.hidden = false;
      el.textContent = err.message;
    }
  });
}

async function bootstrap() {
  const user = await initApp('contracts');
  if (!user || !id) {
    window.location.href = '/dashboard.html';
    return;
  }
  const { contract } = await api(`/api/contracts/${id}`);
  render(contract, user);
}

bootstrap();
