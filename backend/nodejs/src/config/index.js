// Reads environment variables. A local .env file is loaded if present (Node's built-in loader).
// Real environments (Cloud Run, Catalyst) set variables on the platform instead.
// The defaults below match docker-compose.yml, so the local demo runs with no .env file at all.
try { process.loadEnvFile(); } catch { /* no .env file: defaults are fine */ }

const list = (value) => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

export function getConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  // Demo-only signing key for local runs. In production a real JWT_SECRET must be set.
  const jwtSecret = env.JWT_SECRET ?? (production ? undefined : 'local-demo-secret-not-for-production');
  return {
    port: Number(env.PORT ?? 8080),
    corsOrigins: list(env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173'),
    jwtSecret,
    jwtExpiresIn: Number(env.JWT_EXPIRES_IN ?? 3600),
    db: {
      host: env.DB_HOST ?? 'localhost',
      port: Number(env.DB_PORT ?? 3306),
      name: env.DB_NAME ?? 'studentdb',
      user: env.DB_USER ?? 'gp_user',
      password: env.DB_PASSWORD ?? 'gp_pass',
      ssl: env.DB_SSL === 'true',
      poolMax: Number(env.DB_POOL_MAX ?? 2),
    },
    // Only used when DB_PROVIDER=catalyst (Zoho Catalyst Data Store over its REST API). Defaults are the India data centre.
    catalyst: {
      projectId: env.CATALYST_PROJECT_ID,
      clientId: env.CATALYST_CLIENT_ID,
      clientSecret: env.CATALYST_CLIENT_SECRET,
      refreshToken: env.CATALYST_REFRESH_TOKEN,
      environment: env.CATALYST_ENVIRONMENT ?? 'Development',
      apiDomain: (env.CATALYST_API_DOMAIN ?? 'https://api.catalyst.zoho.in').replace(/\/+$/, ''),
      accountsDomain: (env.CATALYST_ACCOUNTS_DOMAIN ?? 'https://accounts.zoho.in').replace(/\/+$/, ''),
      redirectUri: env.CATALYST_REDIRECT_URI,
    },
  };
}
