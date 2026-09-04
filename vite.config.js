import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';
import { googleAuthMiddleware } from './server/google-auth.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    build: {
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), 'index.html'),
          auth: resolve(process.cwd(), 'auth.html')
        }
      }
    },
    server: {
      port: 3000,
      strictPort: true
    },
    plugins: [
      {
        name: 'google-auth',
        configureServer(server) {
          server.middlewares.use(googleAuthMiddleware());
        },
        configurePreviewServer(server) {
          server.middlewares.use(googleAuthMiddleware());
        }
      }
    ]
  };
});
