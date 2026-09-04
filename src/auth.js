/**
 * Google sign-in — same flow as Corsair / Thread
 */

function firstName(user) {
  return (user.fullName || user.email || 'Account').split(' ')[0];
}

function showAuthError() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (!error) return;

  const banner = document.getElementById('floating-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.childNodes[0].textContent = error + ' ';
  }

  params.delete('error');
  params.delete('hero');
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', next);
}

async function fetchMe() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user || null;
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/';
}

function openAuthPage() {
  window.location.href = '/auth.html';
}

function wireGuestButtons() {
  const targets = [
    document.getElementById('get-started-btn'),
    document.getElementById('launch-app-btn'),
    document.querySelector('.floating-banner__btn')
  ];
  targets.forEach((btn) => {
    if (!btn) return;
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      openAuthPage();
    });
  });
}

function paintSignedIn(user) {
  const getStarted = document.getElementById('get-started-btn');
  if (getStarted) {
    getStarted.textContent = firstName(user);
    getStarted.addEventListener('click', (event) => {
      event.preventDefault();
      logout();
    });
  }
}

export async function initAuth() {
  showAuthError();

  try {
    const user = await fetchMe();
    if (user) {
      paintSignedIn(user);
      return;
    }
  } catch {
    // API not ready — keep guest buttons
  }

  wireGuestButtons();
}
