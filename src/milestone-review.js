import { initApp, api, qs, fmtMoney } from './lib/shell.js';

const root = document.getElementById('review-root');
const contractId = qs('contractId');
const milestoneId = qs('milestoneId');

function render(c, ms) {
  const d = ms.deliverable || {};
  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Client review</span>
      <h1>Milestone submitted</h1>
      <p>${ms.title} · ${fmtMoney(ms.amount, c.asset)}</p>
    </div>
    <div id="review-error" class="app-error" hidden></div>
    <div class="app-card">
      <div class="app-card__title">Requirements</div>
      <p>${ms.requirements || '—'}</p>
    </div>
    <div class="app-card" style="margin-top:16px">
      <div class="app-card__title">Submitted evidence</div>
      <p>Timestamp: ${ms.submittedAt ? new Date(ms.submittedAt).toLocaleString() : '—'}</p>
      <p>Reference: <code>${d.evidenceHash || '—'}</code></p>
      ${d.githubUrl ? `<p>GitHub: ${d.githubUrl}</p>` : ''}
      ${d.figmaUrl ? `<p>Figma: ${d.figmaUrl}</p>` : ''}
      ${d.fileRef ? `<p>File: ${d.fileRef}</p>` : ''}
      <p>${d.description || ''}</p>
    </div>
    ${ms.status === 'SUBMITTED' ? `
      <div class="app-actions">
        <button class="app-btn app-btn--primary" id="approve-btn">Approve Milestone</button>
        <button class="app-btn app-btn--ghost" id="dispute-btn">Raise Dispute</button>
      </div>
      <p class="app-note">On approval, authorized release flows through the smart contract. The blockchain enforces the decision — it does not judge work quality.</p>` : ''}
    ${ms.status === 'DISPUTED' ? `
      <div class="app-card" style="margin-top:16px">
        <div class="app-card__title">Dispute flow</div>
        <div class="app-timeline">
          <span class="app-timeline__step is-active">Disputed</span>
          <span class="app-timeline__step">Funds Frozen</span>
          <span class="app-timeline__step">Evidence Review</span>
          <span class="app-timeline__step">Arbitration</span>
          <span class="app-timeline__step">Decision</span>
          <span class="app-timeline__step">Release / Refund / Split</span>
        </div>
        <p class="app-note">${ms.disputeReason || 'Dispute under review.'}</p>
      </div>` : ''}
    ${ms.status === 'APPROVED' ? `
      <div class="app-card" style="margin-top:16px;border-color:rgba(134,239,172,0.3)">
        <p style="color:#86efac">✓ Milestone approved</p>
        <p class="app-note">Client approval → smart contract → USDC released (when on-chain integration is active).</p>
        <a class="app-btn app-btn--gold" href="/settlement.html?contractId=${contractId}&milestoneId=${milestoneId}">Continue to Settlement</a>
      </div>` : ''}
    <div class="app-actions"><a href="/contract.html?id=${contractId}" class="app-btn app-btn--ghost">Back to Contract</a></div>`;

  document.getElementById('approve-btn')?.addEventListener('click', async () => {
    try {
      const { contract } = await api(`/api/contracts/${contractId}/milestones/${milestoneId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' })
      });
      const updated = contract.milestones.find((m) => m.id === milestoneId);
      render(contract, updated);
    } catch (err) {
      showErr(err.message);
    }
  });

  document.getElementById('dispute-btn')?.addEventListener('click', async () => {
    const reason = window.prompt('Brief reason for dispute (optional):') || '';
    try {
      const { contract } = await api(`/api/contracts/${contractId}/milestones/${milestoneId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'dispute', reason })
      });
      const updated = contract.milestones.find((m) => m.id === milestoneId);
      render(contract, updated);
    } catch (err) {
      showErr(err.message);
    }
  });
}

function showErr(msg) {
  const el = document.getElementById('review-error');
  el.hidden = false;
  el.textContent = msg;
}

async function bootstrap() {
  const user = await initApp('contracts');
  if (!user || !contractId || !milestoneId) {
    window.location.href = '/dashboard.html';
    return;
  }
  const { contract } = await api(`/api/contracts/${contractId}`);
  if (!contract.isClient) {
    root.innerHTML = '<div class="app-error">Only the client can review milestone submissions.</div>';
    return;
  }
  const ms = contract.milestones.find((m) => m.id === milestoneId);
  if (!ms) {
    root.innerHTML = '<div class="app-empty">Milestone not found.</div>';
    return;
  }
  render(contract, ms);
}

bootstrap();
