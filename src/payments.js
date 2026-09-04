import { initApp, api, fmtMoney } from './lib/shell.js';

const root = document.getElementById('payments-root');

async function bootstrap() {
  await initApp('payments');
  const data = await api('/api/dashboard');

  root.innerHTML = `
    <div class="app-hero">
      <span class="app-hero__eyebrow">Settlement history</span>
      <h1>Payments</h1>
      <p>Recent milestone releases and settlement activity on your account.</p>
    </div>
    <div class="app-card">
      ${data.payments.length
        ? data.payments.map((p) => `
          <div class="app-list-item">
            <div>
              <strong style="color:#86efac">+${fmtMoney(p.amount, p.asset)}</strong>
              <br><span style="font-size:12px;color:#737373">${p.label}${p.simulated ? ' · simulated' : ''}</span>
            </div>
            <span style="font-size:12px;color:#a3a3a3">${p.status}</span>
          </div>`).join('')
        : '<div class="app-empty">No settlement history yet.</div>'}
    </div>`;
}

bootstrap();
