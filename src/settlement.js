import { initApp, api, qs, fmtMoney } from './lib/shell.js';

const root = document.getElementById('settlement-root');
const contractId = qs('contractId');
const milestoneId = qs('milestoneId');

let selectedRouteId = null;
let optionsData = null;

function routeCard(r, recommended) {
  return `
    <div class="app-route-card${recommended ? ' is-recommended' : ''}" data-route="${r.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <strong>${r.type}</strong>
          <p>Net received: ${fmtMoney(r.netUsdc)} · Fee: ${fmtMoney(r.cost)} · ~${r.settlementMinutes} min</p>
          <p class="app-note">Channel: ${r.channel || 'Direct Off-Ramp'} · Gateway: ${r.provider || 'Onramper'}</p>
        </div>
        <div style="text-align:right">
          <strong style="font-size:16px;color:var(--accent-gold)">${r.fiatSymbol || '₹'}${r.estimatedFiat.toLocaleString()}</strong>
        </div>
      </div>
    </div>`;
}

function renderOptimizer(data) {
  optionsData = data;
  selectedRouteId = data.recommended.id;
  const onramperQuotes = data.onramper?.quotes || [];

  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Settlement Orchestration Engine</span>
      <h1>Optimize Settlement</h1>
      <p>Compare self-custody USDC releases against verified fiat off-ramp gateways dynamically aggregated via Netting & Onramper.</p>
    </div>
    <div id="settle-error" class="app-error" hidden></div>

    <!-- Live Market Ticker -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.25);border-radius:8px;margin-bottom:16px;font-size:12px">
      <div>
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent-gold);margin-right:6px"></span>
        <strong>Live Interbank Spot:</strong> 1 USD = ${data.fiatSymbol || '₹'}${data.liveMarket?.fxRate || 94.54}
      </div>
      <div style="color:var(--text-muted)">
        Polygon Amoy Block: <strong style="color:var(--accent-gold)">#${data.liveMarket?.amoyBlock || 46721206}</strong> · Gas: <strong style="color:var(--accent-gold)">${data.liveMarket?.gasPriceGwei || 30} Gwei</strong>
      </div>
    </div>

    <div class="app-card" style="margin-bottom:16px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px">
        <div>
          <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Milestone Released</span>
          <p style="margin:2px 0 0;font-size:18px;font-weight:700">${fmtMoney(data.releasedAmount)}</p>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Destination Country</span>
          <p style="margin:2px 0 0;font-size:18px;font-weight:700">${data.destination || 'India (IN)'}</p>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase">Preferred Payout Asset</span>
          <p style="margin:2px 0 0;font-size:18px;font-weight:700;color:var(--accent-gold)">${data.preferredFiat || 'INR'}</p>
        </div>
      </div>
    </div>

    <!-- Step 01: Netting Check -->
    <div class="app-card" style="margin-bottom:16px">
      <div class="app-card__title">Step 01 — Bilateral Corridor Netting Batch</div>
      ${data.netting.matchedAmount > 0 ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:var(--accent-gold);color:#0a0a0f">NETTING MATCH FOUND</span>
          <span style="color:var(--accent-gold);font-size:12px;font-weight:600">✓ Saves $${data.netting.savings?.usdc || 12.96} in spread & gas</span>
        </div>
        <p style="margin:0 0 4px">Matched Offset: <strong>${fmtMoney(data.netting.matchedAmount)}</strong> · Residual Disbursal: <strong>${fmtMoney(data.netting.residualAmount)}</strong></p>
        <p class="app-note">${data.netting.savings?.description || 'Bilateral corridor pool matching reduces bank cross-border spread.'}</p>
      ` : `
        <div style="display:flex;align-items:center;gap:8px">
          <span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:rgba(255,255,255,0.08);color:#94a3b8">DIRECT CLEARING</span>
          <span class="app-note" style="margin:0">No active corridor peer offsets queued for this batch window. Routing full amount via Onramper.</span>
        </div>
      `}
    </div>

    <!-- Onramper Multi-Gateway Aggregator -->
    ${onramperQuotes.length > 0 ? `
      <div class="app-card" style="margin-bottom:16px;border-color:rgba(201,168,76,0.25)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:linear-gradient(135deg,#c9a84c,#996515);color:#000">ONRAMPER AGGREGATOR</span>
            <span style="color:var(--accent-gold);font-size:12px;font-weight:600">● 4 Live Providers</span>
          </div>
          <a href="${data.onramper?.widgetUrl || 'https://buy.onramper.com/'}" target="_blank" style="font-size:12px;color:var(--accent-gold);text-decoration:underline">
            Open Onramper Hosted Widget ↗
          </a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:10px">
          ${onramperQuotes.map((q) => `
            <div style="padding:12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:8px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <strong style="font-size:13px">${q.rampName}</strong>
                <span style="font-size:11px;color:var(--accent-gold)">★ ${q.rating}</span>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">${q.paymentMethodName}</div>
              <div style="font-size:16px;font-weight:700;color:var(--accent-gold)">${data.fiatSymbol || '₹'}${q.fiatAmount.toLocaleString()}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:4px">Fee: $${q.totalFee} · Estimated Settlement: ~${q.settlementMinutes}m</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Step 02: Compare Routes -->
    <div class="app-card" style="margin-bottom:16px">
      <div class="app-card__title">Step 02 — Compare Ranked Settlement Strategies</div>
      <p class="app-note" style="margin-bottom:12px">Ranked dynamically by maximum recipient payout and verified arrival velocity.</p>
      <div id="routes">${data.routes.map((r) => routeCard(r, r.id === data.recommended.id)).join('')}</div>
    </div>

    <div class="app-actions">
      <button class="app-btn app-btn--primary" id="continue-settle">Proceed with Selected Route</button>
      <a href="/contracts" class="app-btn app-btn--ghost">Back to Contracts</a>
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
      <span class="app-hero__eyebrow">Settlement Authorization</span>
      <h1>Authorize Settlement Execution</h1>
      <p>Verify payout parameters and fee breakdown before triggering settlement.</p>
    </div>
    <div id="settle-error" class="app-error" hidden></div>
    <div class="app-card">
      <div class="app-card__title">Payout Order Summary</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;margin-bottom:16px">
        <div>
          <span style="font-size:11px;color:var(--text-muted)">Gross Milestone</span>
          <p style="margin:2px 0 0;font-size:16px;font-weight:600">${fmtMoney(data.releasedAmount)}</p>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-muted)">Selected Rail</span>
          <p style="margin:2px 0 0;font-size:16px;font-weight:600">${route.type}</p>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-muted)">Total Fees</span>
          <p style="margin:2px 0 0;font-size:16px;font-weight:600">${fmtMoney(route.cost)}</p>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-muted)">Estimated Payout</span>
          <p style="margin:2px 0 0;font-size:18px;font-weight:700;color:var(--accent-gold)">${route.fiatSymbol || '₹'}${route.estimatedFiat.toLocaleString()}</p>
        </div>
      </div>
      <div class="app-actions">
        <button class="app-btn app-btn--primary" id="confirm-btn">Confirm & Disburse Payout</button>
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
      <span class="app-hero__eyebrow">Settlement Orchestration · Success</span>
      <h1>Settlement Executed Successfully</h1>
      <p>Funds disbursed via ${s.provider} to recipient's destination rail.</p>
    </div>
    <div class="app-card" style="border-color:rgba(201,168,76,0.3)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <span style="font-size:24px;color:var(--accent-gold)">✓</span>
        <div>
          <strong style="font-size:16px;color:var(--accent-gold)">Payout Dispatched</strong>
          <p class="app-note" style="margin:0">Reference: <code>${s.reference}</code></p>
        </div>
      </div>
      <p>Net Disbursed: <strong>${fmtMoney(s.netUsdc)}</strong> · Recipient Net: <strong style="color:var(--accent-gold)">${s.fiatSymbol}${s.estimatedFiat.toLocaleString()}</strong></p>
      <div class="app-actions">
        <a href="/contracts/${contractId}" class="app-btn app-btn--primary">View Contract</a>
        <a href="/payments" class="app-btn app-btn--ghost">View Payments Ledger</a>
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
