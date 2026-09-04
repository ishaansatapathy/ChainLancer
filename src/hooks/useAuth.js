import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export function useAuth({ redirect = false } = {}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    api('/api/auth/me')
      .catch(() => null)
      .then((data) => {
        if (!active) return;
        if (!data?.user && redirect) {
          const ret = encodeURIComponent(location.pathname + location.search);
          navigate(`/auth?return=${ret}`, { replace: true });
          return;
        }
        setUser(data?.user || null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [redirect, navigate, location.pathname, location.search]);

  return { user, loading, setUser };
}
