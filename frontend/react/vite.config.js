import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';

// Development only. Zoho Catalyst answers the browser's CORS preflight (OPTIONS) request itself, without CORS headers, so the
// local app cannot call a Catalyst function directly. Set API_PROXY_TARGET to the deployed API address, for example
//   https://<project domain>/server/student_api
// either in the git-ignored file frontend/react/.env.local (API_PROXY_TARGET=...) or in the terminal that runs
// `npm.cmd run dev`. The dev server then forwards /cloud-api/* to it (same origin for the browser, so no preflight) and
// serves a config.json that points at /cloud-api. public/config.json and production builds are not affected.
export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, process.cwd(), '').API_PROXY_TARGET?.trim().replace(/\/+$/, '');
  if (!target) return {};
  return {
    server: {
      proxy: { '/cloud-api': { target, changeOrigin: true, rewrite: (path) => path.replace(/^\/cloud-api/, '') } },
    },
    plugins: [{
      name: 'cloud-api-config',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.split('?')[0] !== '/config.json') return next();
          const config = { ...JSON.parse(readFileSync('public/config.json', 'utf8')), mode: 'api', apiBaseUrl: `http://${req.headers.host}/cloud-api` };
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(config));
        });
      },
    }],
  };
});
