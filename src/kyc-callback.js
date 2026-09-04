const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const error = params.get('error');
const msg = document.getElementById('msg');

async function finish() {
  if (error) {
    msg.textContent = `Verification failed: ${error}`;
    if (window.opener) window.opener.postMessage({ type: 'kyc-error', error }, window.location.origin);
    return;
  }
  if (!code) {
    msg.textContent = 'Missing verification code.';
    return;
  }

  try {
    const res = await fetch('/api/kyc/complete', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not complete KYC');

    msg.textContent = 'Identity verified. You can close this window.';
    if (window.opener) {
      window.opener.postMessage({ type: 'kyc-complete', user: data.user }, window.location.origin);
      setTimeout(() => window.close(), 800);
    } else {
      window.location.href = '/onboarding.html';
    }
  } catch (e) {
    msg.textContent = e.message;
    if (window.opener) window.opener.postMessage({ type: 'kyc-error', error: e.message }, window.location.origin);
  }
}

finish();
