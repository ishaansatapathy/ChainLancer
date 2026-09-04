import './styles/auth-pages.css';

const errorEl = document.getElementById('onboarding-error');
const steps = {
  role: document.getElementById('step-role'),
  country: document.getElementById('step-country'),
  kyc: document.getElementById('step-kyc'),
  wallet: document.getElementById('step-wallet')
};
const titles = {
  role: ['Choose your role', 'How will you use ChainLancer?'],
  country: ['Your jurisdiction', 'Select the country where you operate.'],
  kyc: ['Identity verification', 'Verify identity before compliance screening.'],
  wallet: ['Connect wallet', 'Link your non-custodial wallet address.']
};

function showError(msg) {
  if (!msg) {
    errorEl.hidden = true;
    errorEl.textContent = '';
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showStep(name) {
  Object.entries(steps).forEach(([key, el]) => {
    el.hidden = key !== name;
  });
  const [title, sub] = titles[name];
  document.getElementById('step-title').textContent = title;
  document.getElementById('step-sub').textContent = sub;
}

function renderStatus(user) {
  const grid = document.getElementById('status-grid');
  const rows = [
    ['Role', user.role || 'Pending'],
    ['KYC', user.kycStatus],
    ['AML', user.amlStatus],
    ['Compliance', user.complianceStatus]
  ];
  grid.innerHTML = rows.map(([k, v]) => `<div class="status-pill"><span>${k}</span><strong>${v}</strong></div>`).join('');
  document.getElementById('kyc-mock-btn').hidden = user.kycStatus === 'VERIFIED';
}

async function bootstrap() {
  const me = await api('/api/auth/me').catch(() => null);
  if (!me?.user) {
    window.location.href = '/auth.html';
    return;
  }

  const state = await api('/api/onboarding/status');
  renderStatus(state.user);

  const step = state.nextStep === 'complete' ? 'wallet' : state.nextStep;
  showStep(step);

  if (state.nextStep === 'complete' || (state.nextStep === 'wallet' && state.user.walletVerified)) {
    document.getElementById('finish-btn').hidden = false;
  }
}

document.querySelectorAll('.role-card').forEach((btn) => {
  btn.addEventListener('click', async () => {
    showError('');
    try {
      await api('/api/onboarding/role', { method: 'POST', body: JSON.stringify({ role: btn.dataset.role }) });
      showStep('country');
    } catch (e) {
      showError(e.message);
    }
  });
});

document.getElementById('country-btn').addEventListener('click', async () => {
  showError('');
  try {
    const country = document.getElementById('country-select').value;
    const data = await api('/api/onboarding/country', { method: 'POST', body: JSON.stringify({ country }) });
    renderStatus(data.user);
    showStep('kyc');
  } catch (e) {
    showError(e.message);
  }
});

document.getElementById('kyc-start-btn').addEventListener('click', async () => {
  showError('');
  try {
    const data = await api('/api/kyc/start', { method: 'POST', body: '{}' });
    renderStatus(data.user || (await api('/api/kyc/status')).user);

    const widgetUrl = data.session?.redirectUrl;
    if (widgetUrl) {
      window.open(widgetUrl, 'chainlancer-kyc', 'width=480,height=720');
      showError('Complete verification in the popup window.');
    }
    document.getElementById('kyc-mock-btn').hidden =
      (data.user?.kycStatus || '') === 'VERIFIED';
  } catch (e) {
    showError(e.message);
  }
});

window.addEventListener('message', async (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === 'kyc-complete') {
    showError('');
    renderStatus(event.data.user);
    if (event.data.user.complianceStatus === 'APPROVED') showStep('wallet');
  }
  if (event.data?.type === 'kyc-error') showError(event.data.error);
});

document.getElementById('kyc-mock-btn').addEventListener('click', async () => {
  showError('');
  try {
    const data = await api('/api/kyc/mock/complete', { method: 'POST', body: JSON.stringify({ outcome: 'VERIFIED' }) });
    renderStatus(data.user);
    if (data.user.complianceStatus === 'APPROVED') showStep('wallet');
  } catch (e) {
    showError(e.message);
  }
});

document.getElementById('finish-btn').addEventListener('click', () => {
  window.location.href = '/';
});

bootstrap();
