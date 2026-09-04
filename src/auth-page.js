import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/auth.css';

const form = document.getElementById('auth-form');
const title = document.getElementById('auth-title');
const errorEl = document.getElementById('auth-error');
const submitBtn = document.getElementById('auth-submit');
const switchBtn = document.getElementById('switch-btn');
const switchCopy = document.getElementById('switch-copy');
const nameField = document.getElementById('name-field');
const passwordInput = form.querySelector('input[name="password"]');
const googleCopy = document.getElementById('google-copy');

let mode = 'signin';

function showError(message) {
  if (!message) {
    errorEl.hidden = true;
    errorEl.textContent = '';
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function setMode(next) {
  mode = next;
  const signup = mode === 'signup';
  title.textContent = signup ? 'Welcome to ChainLancer' : 'Welcome back';
  nameField.hidden = !signup;
  nameField.querySelector('input').required = signup;
  passwordInput.autocomplete = signup ? 'new-password' : 'current-password';
  passwordInput.placeholder = signup ? 'At least 8 characters' : 'Your password';
  submitBtn.textContent = signup ? 'Sign up' : 'Log in';
  switchCopy.textContent = signup ? 'Have an account?' : 'New to ChainLancer?';
  switchBtn.textContent = signup ? 'Log in' : 'Create an account';
  googleCopy.textContent = signup ? 'Sign up with Google' : 'Sign in with Google';
  showError('');
}

function paintQueryError() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (error) showError(error);
  if (params.get('mode') === 'login') setMode('signin');
  params.delete('error');
  params.delete('hero');
  params.delete('mode');
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
  window.history.replaceState({}, '', next);
}

async function fetchMe() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user || null;
}

switchBtn.addEventListener('click', () => {
  setMode(mode === 'signin' ? 'signup' : 'signin');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');
  const data = Object.fromEntries(new FormData(form).entries());
  submitBtn.disabled = true;
  const busy = mode === 'signup' ? 'Creating…' : 'Signing in…';
  const idle = mode === 'signup' ? 'Sign up' : 'Log in';
  submitBtn.textContent = busy;

  try {
    const res = await fetch(mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Authentication failed');
    window.location.href = '/';
  } catch (error) {
    showError(error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = idle;
  }
});

setMode('signin');
paintQueryError();

fetchMe()
  .then((user) => {
    if (user) window.location.replace('/');
  })
  .catch(() => {});
