import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { apiMiddleware } from './server/middleware/api.js';

const SPA_ROUTES = [
  '/auth',
  '/onboarding',
  '/wallet',
  '/profile',
  '/dashboard',
  '/payments',
  '/compliance',
  '/kyc-callback',
  '/contracts'
];

const LEGACY_HTML = {
  '/auth.html': '/auth',
  '/onboarding.html': '/onboarding',
  '/wallet.html': '/wallet',
  '/profile.html': '/profile',
  '/dashboard.html': '/dashboard',
  '/payments.html': '/payments',
  '/compliance.html': '/compliance',
  '/kyc-callback.html': '/kyc-callback',
  '/create-contract.html': '/contracts/create',
  '/fund-escrow.html': '/contracts',
  '/contract.html': '/contracts',
  '/milestone.html': '/contracts',
  '/milestone-review.html': '/contracts',
  '/settlement.html': '/contracts'
};

function spaFallback() {
  return (req, res, next) => {
    const url = req.url?.split('?')[0] || '';
    const qs = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

    if (LEGACY_HTML[url]) {
      res.writeHead(302, { Location: LEGACY_HTML[url] + qs });
      res.end();
      return;
    }

    const isSpa =
      SPA_ROUTES.some((r) => url === r || url.startsWith(`${r}/`)) &&
      !url.includes('.');
    if (isSpa) {
      req.url = '/app.html' + (req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    }
    next();
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: 'chainlancer-server',
        configureServer(server) {
          server.middlewares.use(spaFallback());
          server.middlewares.use(apiMiddleware());
        },
        configurePreviewServer(server) {
          server.middlewares.use(spaFallback());
          server.middlewares.use(apiMiddleware());
        }
      }
    ],
    build: {
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), 'index.html'),
          app: resolve(process.cwd(), 'app.html')
        }
      }
    },
    server: {
      port: 3000,
      strictPort: true
    }
  };
});
