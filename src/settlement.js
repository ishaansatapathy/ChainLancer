import { initApp, api, qs, fmtMoney } from './lib/shell.js';

const root = document.getElementById('settlement-root');
const contractId = qs('contractId');
const milestoneId = qs('milestoneId');

let selectedRouteId = null;
let optionsData = null;

function routeCard(r, recommended) {
  return `
    <div class="app-route-card${recommended ? ' is-recommended' : ''}" data-route="${r.id}">
      <strong>${r.type}</strong>
      <p>Net received: ${fmtMoney(r.netUsdc)} · Cost: ${fmtMoney(r.cost)} · ~${r.settlementMinutes} min</p>
      <p class="app-note">Est. ${r.fiatSymbol}${r.estimatedFiat.toLocaleString()} ${optionsData.preferredFiat} · ${r.simulated ? 'Simulated demo data' : 'Live provider'}</p>
    </div>`;
}

function renderOptimizer(data) {
  optionsData = data;
  selectedRouteId = data.recommended.id;
  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Settlement optimizer</span>
      <h1>Optimize Settlement</h1>
      <p>We compare eligible settlement strategies to maximize the recipient's net payout.</p>
      <p class="app-note app-note--sim">Route comparison uses simulated demo data until live provider integrations are connected.</p>
    </div>
    <div id="settle-error" class="app-error" hidden></div>
    <div class="app-card" style="margin-bottom:16px">
      <p>Released amount: <strong>${fmtMoney(data.releasedAmount)}</strong></p>
      <p>Destination: <strong>${data.destination}</strong> · Preferred fiat: <strong>${data.preferredFiat}</strong></p>
    </div>
    <div class="app-card" style="margin-bottom:16px">
      <div class="app-card__title">Step 01 — Netting check</div>
      ${data.netting.available ? `
        <p style="color:var(--accent-gold)">NETTING AVAILABLE</p>
        <p>Before: ${fmtMoney(data.netting.amountBefore)} · After: ${fmtMoney(data.netting.amountAfter)}</p>
        <p class="app-note">Estimated reduction: ${fmtMoney(data.netting.reduction)}</p>
      ` : `<p>NETTING NOT AVAILABLE</p><p class="app-note">No eligible obligations to offset for this amount.</p>`}
    </div>
    <div class="app-card" style="margin-bottom:16px">
      <div class="app-card__title">Step 02 — Compare settlement routes</div>
      <p class="app-note">ChainLancer orchestrates route selection — it is not an OTC desk or off-ramp.</p>
      <div id="routes">${data.routes.map((r) => routeCard(r, r.id === data.recommended.id)).join('')}</div>
    </div>
    <div class="app-card" style="margin-bottom:16px;border-color:var(--accent-gold)">
      <div class="app-card__title">Recommended route</div>
      <p><strong>${data.recommended.type}</strong></p>
      <p class="app-note">Why: ${data.recommended.reason}</p>
      <p>Net: ${fmtMoney(data.recommended.netUsdc)} · Cost: ${fmtMoney(data.recommended.cost)}</p>
    </div>
    <div class="app-actions">
      <button class="app-btn app-btn--primary" id="continue-settle">Continue to Confirmation</button>
      <a href="/contract.html?id=${contractId}" class="app-btn app-btn--ghost">Back</a>
    </div>`;

  root.querySelectorAll('.app-route-card').forEach((el) => {
    el.addEventListener('click', () => {
      selectedRouteId = el.dataset.route;
      root.querySelectorAll('.app-route-card').forEach((c) => c.classList.remove('is-recommended'));
      el.classList.add('is-recommended');
    });
  });

  document.getElementById('continue-settle').addEventListener('click', () => {
    const route = data.routes.find((r) => r.id === selectedRouteId) || data.recommended;
    renderConfirmation(data, route);
  });
}

function renderConfirmation(data, route) {
  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Settlement confirmation</span>
      <h1>Confirm Settlement</h1>
      <p class="app-note app-note--sim">Simulation / Demo Settlement — no fiat payout will occur.</p>
    </div>
    <div id="settle-error" class="app-error" hidden></div>
    <div class="app-card">
      <p>Original amount: <strong>${fmtMoney(data.releasedAmount)}</strong></p>
      <p>Settlement strategy: <strong>${route.type}</strong></p>
      <p>Settlement cost: <strong>${fmtMoney(route.cost)}</strong></p>
      <p>Estimated net payout: <strong>${route.fiatSymbol}${route.estimatedFiat.toLocaleString()}</strong></p>
      <p>Destination: Freelancer wallet / bank (per profile preferences)</p>
      <p style="color:var(--accent-gold);margin-top:12px">READY FOR SETTLEMENT</p>
      <div class="app-actions">
        <button class="app-btn app-btn--primary" id="confirm-btn">Confirm Settlement</button>
        <button class="app-btn app-btn--ghost" id="back-opt">Back to Optimizer</button>
      </div>
    </div>`;

  document.getElementById('back-opt').addEventListener('click', () => renderOptimizer(optionsData));
  document.getElementById('confirm-btn').addEventListener('click', async () => {
    try {
      const result = await api(`/api/contracts/${contractId}/milestones/${milestoneId}/settlement/confirm`, {
        method: 'POST',
        body: JSON.stringify({ routeId: route.id })
      });
      renderComplete(result);
    } catch (err) {
      const el = document.getElementById('settle-error');
      el.hidden = false;
      el.textContent = err.message;
    }
  });
}

function renderComplete(result) {
  const s = result.settlement;
  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Complete</span>
      <h1>Settlement Complete</h1>
    </div>
    <div class="app-card">
      <p style="color:#86efac">✓ Escrow released</p>
      <p style="color:#86efac">✓ Settlement route selected</p>
      <p style="color:#86efac">✓ Payout processed (simulated)</p>
      <p class="app-note">Reference: ${s.reference} · ${s.simulated ? 'Demo settlement — not a real fiat transfer' : ''}</p>
      <p>Net USDC: ${fmtMoney(s.netUsdc)} · Est. ${s.fiatSymbol}${s.estimatedFiat.toLocaleString()}</p>
      <div class="app-actions">
        <a href="/contract.html?id=${contractId}" class="app-btn app-btn--primary">View Contract</a>
        <a href="/payments.html" class="app-btn app-btn--ghost">View Payments</a>
      </div>
    </div>`;
}

async function bootstrap() {
  const user = await initApp('payments');
  if (!user || !contractId || !milestoneId) {
    window.location.href = '/dashboard.html';
    return;
  }
  try {
    const data = await api(`/api/contracts/${contractId}/milestones/${milestoneId}/settlement/options`);
    renderOptimizer(data);
  } catch (err) {
    root.innerHTML = `<div class="app-error">${err.message}</div><a href="/contract.html?id=${contractId}" class="app-btn app-btn--ghost">Back</a>`;
  }
}

bootstrap();
