import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function KycCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('Processing verification…');

  useEffect(() => {
    const code = params.get('code');
    const error = params.get('error');

    async function finish() {
      if (error) {
        setMsg(`Verification failed: ${error}`);
        if (window.opener) {
          window.opener.postMessage({ type: 'kyc-error', error }, window.location.origin);
        }
        return;
      }
      if (!code) {
        setMsg('Missing verification code.');
        return;
      }
      try {
        const data = await api('/api/kyc/complete', {
          method: 'POST',
          body: JSON.stringify({ code })
        });
        setMsg('Identity verified. You can close this window.');
        if (window.opener) {
          window.opener.postMessage({ type: 'kyc-complete', user: data.user }, window.location.origin);
          setTimeout(() => window.close(), 800);
        } else {
          navigate('/onboarding');
        }
      } catch (e) {
        setMsg(e.message);
        if (window.opener) {
          window.opener.postMessage({ type: 'kyc-error', error: e.message }, window.location.origin);
        }
      }
    }

    finish();
  }, [params, navigate]);

  return (
    <div className="auth-body" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#d4d4d4', fontSize: 14 }}>{msg}</p>
    </div>
  );
}
