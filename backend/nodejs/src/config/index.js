// Reads environment variables. A local .env file is loaded if present (Node's built-in loader).
// Real environments (Cloud Run, Catalyst) set variables on the platform instead.
// The defaults below match docker-compose.yml, so the local demo runs with no .env file at all.
try { process.loadEnvFile(); } catch { /* no .env file: defaults are fine */ }

const list = (value) => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

export function getConfig(env = process.env) {
  // Catalyst reserves names starting with CATALYST_ for function settings, so the DATASTORE_ names are used there.
  // The old CATALYST_ names still work in a local .env.
  const store = (name) => env[`DATASTORE_${name}`] ?? env[`CATALYST_${name}`];
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
      projectId: store('PROJECT_ID'),
      clientId: store('CLIENT_ID'),
      clientSecret: store('CLIENT_SECRET'),
      refreshToken: store('REFRESH_TOKEN'),
      environment: store('ENVIRONMENT') ?? 'Development',
      apiDomain: (store('API_DOMAIN') ?? 'https://api.catalyst.zoho.in').replace(/\/+$/, ''),
      accountsDomain: (store('ACCOUNTS_DOMAIN') ?? 'https://accounts.zoho.in').replace(/\/+$/, ''),
      redirectUri: store('REDIRECT_URI'),
    },
  };
}
