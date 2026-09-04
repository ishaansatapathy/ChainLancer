import { handleAuthRoutes } from '../routes/auth.js';
import { handleOnboardingRoutes } from '../routes/onboarding.js';
import { handleWalletRoutes } from '../routes/wallet.js';
import { handleAppRoutes } from '../routes/app.js';

export function apiMiddleware() {
  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/api-auth')
    ) {
      const authHandled = await handleAuthRoutes(req, res, url);
      if (authHandled !== false) return;

      const onboardingHandled = await handleOnboardingRoutes(req, res, url);
      if (onboardingHandled !== false) return;

      const walletHandled = await handleWalletRoutes(req, res, url);
      if (walletHandled !== false) return;

      const appHandled = await handleAppRoutes(req, res, url);
      if (appHandled !== false) return;

      if (!res.headersSent) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not found' }));
      }
      return;
    }
    next();
  };
}

// Backward compat for vite.config
export const googleAuthMiddleware = apiMiddleware;
