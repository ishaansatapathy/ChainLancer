import { initApp, api, qs, fmtMoney } from './lib/shell.js';

const root = document.getElementById('fund-root');
const id = qs('id');

async function bootstrap() {
  const user = await initApp('contracts');
  if (!user || !id) {
    window.location.href = '/dashboard.html';
    return;
  }
  let data;
  try {
    data = await api(`/api/contracts/${id}/fund`);
  } catch (err) {
    root.innerHTML = `<div class="app-error">${err.message}</div>`;
    return;
  }
  const c = data.contract;
  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Smart escrow</span>
      <h1>Fund Smart Escrow</h1>
      <p>Funds are locked by the smart contract and released according to the contract conditions.</p>
    </div>
    <div id="fund-error" class="app-error" hidden></div>
    <div id="fund-success" class="app-card" hidden style="border-color:rgba(134,239,172,0.4)">
      <p style="color:#86efac">✓ Escrow funded</p>
      <p class="app-note" id="fund-tx"></p>
      <a class="app-btn app-btn--ghost" id="explorer-link" target="_blank" rel="noopener">View on Polygon Explorer</a>
    </div>
    <div class="app-card" id="fund-form">
      <div class="app-card__title">Funding details</div>
      <p>Contract total: <strong>${fmtMoney(c.totalAmount, c.asset)}</strong></p>
      <p>Network: <strong>${c.network}</strong></p>
      <p>Escrow contract: <code style="font-size:12px;color:#a3a3a3">${data.escrowAddress}</code></p>
      <p>Wallet: <code style="font-size:12px;color:#a3a3a3">${data.walletAddress || 'Connect wallet first'}</code></p>
      <p class="app-note">${data.note}</p>
      <div class="app-actions">
        <button class="app-btn app-btn--ghost" id="approve-btn">Approve USDC</button>
        <button class="app-btn app-btn--primary" id="fund-btn">Fund Escrow</button>
      </div>
    </div>
    <div class="app-actions"><a href="/contract.html?id=${id}" class="app-btn app-btn--ghost">Back to Contract</a></div>`;

  const errEl = document.getElementById('fund-error');
  async function attempt(action) {
    errEl.hidden = true;
    try {
      await api(`/api/contracts/${id}/fund`, { method: 'POST', body: JSON.stringify({ action }) });
    } catch (err) {
      errEl.hidden = false;
      errEl.textContent = err.message;
    }
  }
  document.getElementById('approve-btn').addEventListener('click', () => attempt('approve'));
  document.getElementById('fund-btn').addEventListener('click', () => attempt('fund'));
}

bootstrap();
