const NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'contracts', label: 'Contracts', href: '/dashboard#contracts' },
  { id: 'payments', label: 'Payments', href: '/payments' },
  { id: 'profile', label: 'Profile', href: '/profile' },
  { id: 'wallet', label: 'Wallet', href: '/wallet' },
  { id: 'compliance', label: 'Compliance', href: '/compliance' }
];

export async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function requireAuth(redirect = '/auth') {
  const data = await api('/api/auth/me').catch(() => null);
  if (!data?.user) {
    window.location.href = `${redirect}?return=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }
  return data.user;
}

export function renderNav(activeId) {
  const el = document.getElementById('app-nav');
  if (!el) return;
  el.innerHTML = `
    <div class="app-nav__inner">
      <a href="/dashboard.html" class="app-nav__logo">
        <img src="/logo.png" alt="" /><span>ChainLancer</span>
      </a>
      <nav class="app-nav__links">
        ${NAV.map((n) => `<a class="app-nav__link${n.id === activeId ? ' is-active' : ''}" href="${n.href}">${n.label}</a>`).join('')}
      </nav>
    </div>`;
}

export function greeting(name) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const first = (name || 'there').split(' ')[0];
  return `${part}, ${first}`;
}

export function initials(name) {
  return (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function fmtMoney(n, asset = 'USDC') {
  const v = Number(n) || 0;
  return `$${v.toLocaleString()} ${asset}`;
}

export function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export async function initApp(activeId) {
  const user = await requireAuth();
  if (!user) return null;
  renderNav(activeId);
  return user;
}
