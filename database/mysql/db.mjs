// Shared connection helper for the setup scripts. Defaults match the repo's docker-compose.yml demo database.
// Override with DB_* environment variables or a local .env file.
import mysql from 'mysql2/promise';

try { process.loadEnvFile(); } catch { /* no .env file: defaults are fine */ }

export const dbName = process.env.DB_NAME ?? 'studentdb';

export async function connect(options = {}) {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = Number(process.env.DB_PORT ?? 3306);
  try {
    return await mysql.createConnection({
      host, port, database: dbName,
      user: process.env.DB_USER ?? 'gp_user',
      password: process.env.DB_PASSWORD ?? 'gp_pass',
      ssl: process.env.DB_SSL === 'true' ? {} : undefined, // verifies the server certificate; never disabled
      connectTimeout: 10000,
      ...options,
    });
  } catch (error) {
    const hints = {
      ECONNREFUSED: `Cannot reach MySQL at ${host}:${port}. Is it running? Start it with: docker compose up -d`,
      ER_ACCESS_DENIED_ERROR: 'MySQL refused the user name or password. Check DB_USER and DB_PASSWORD.',
      ER_BAD_DB_ERROR: `Database "${dbName}" does not exist. Check DB_NAME.`,
      ER_DBACCESS_DENIED_ERROR: `Database "${dbName}" does not exist or this user has no access to it. Check DB_NAME and DB_USER.`,
    };
    console.error(hints[error.code] ?? `Cannot connect to MySQL: ${error.message}`);
    process.exit(1);
  }
}
