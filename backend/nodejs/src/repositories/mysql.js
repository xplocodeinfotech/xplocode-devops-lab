// The only file that knows about MySQL. Another database means another file with the same functions.
import mysql from 'mysql2/promise';
import { HttpError } from '../errors.js';

let pool; // created on first use and reused while the process (or serverless instance) stays warm

export function getPool({ db }) {
  pool ??= mysql.createPool({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.name,
    ssl: db.ssl ? {} : undefined, // verifies the server certificate; never disabled
    connectionLimit: db.poolMax,
    connectTimeout: 10000,
    waitForConnections: true,
  });
  return pool;
}

// Called once at startup so a wrong setting produces a clear message instead of a vague 500 on the first login.
export async function checkDatabase(config) {
  try {
    await getPool(config).query('SELECT 1');
  } catch (error) {
    const { host, port, name } = config.db;
    const hints = {
      ECONNREFUSED: `Cannot reach MySQL at ${host}:${port}. Is it running? Start it with: docker compose up -d`,
      ETIMEDOUT: `Timed out reaching MySQL at ${host}:${port}. Check DB_HOST and DB_PORT.`,
      ER_ACCESS_DENIED_ERROR: 'MySQL refused the user name or password. Check DB_USER and DB_PASSWORD.',
      ER_BAD_DB_ERROR: `Database "${name}" does not exist. Check DB_NAME, or run: npm run setup (in database/mysql)`,
      ER_DBACCESS_DENIED_ERROR: `Database "${name}" does not exist or this user has no access to it. Check DB_NAME and DB_USER.`,
    };
    throw new Error(hints[error.code] ?? `Cannot connect to MySQL: ${error.message}`);
  }
}

export function closePool() {
  const closing = pool?.end();
  pool = undefined;
  return closing;
}

export function createMysqlRepository(config) {
  const query = (sql, params) => getPool(config).execute(sql, params).then(([rows]) => rows);
  const get = async (id) => (await query('SELECT id, name, email, year FROM students WHERE id = ?', [id]))[0] ?? null;
  const duplicateAware = async (action) => {
    try { return await action(); } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'DUPLICATE_EMAIL', 'A student with this email already exists.');
      throw error;
    }
  };

  return {
    label: `MySQL ${config.db.host}:${config.db.port}/${config.db.name}`,
    check: () => checkDatabase(config),
    close: closePool,
    list: () => query('SELECT id, name, email, year FROM students ORDER BY id'),
    get,
    create: ({ name, email, year }) => duplicateAware(async () => {
      const result = await query('INSERT INTO students (name, email, year) VALUES (?, ?, ?)', [name, email, year]);
      return get(result.insertId);
    }),
    update: (id, { name, email, year }) => duplicateAware(async () => {
      await query('UPDATE students SET name = ?, email = ?, year = ? WHERE id = ?', [name, email, year, id]);
      return get(id); // null when the student does not exist
    }),
    remove: async (id) => (await query('DELETE FROM students WHERE id = ?', [id])).affectedRows > 0,
    findUser: async (username) => (await query('SELECT username, password FROM users WHERE username = ?', [username]))[0] ?? null,
  };
}
