// Zoho Catalyst Data Store repository. It calls Catalyst's REST API directly (no SDK) with an OAuth refresh token,
// and runs ZCQL queries: POST {api}/baas/v1/project/{projectId}/query with body {"query": "..."}.
// Tables and columns must already exist (see database/catalyst/README.md). Not verified against a live project yet.
//
// ZCQL limits found while testing and in the docs, which shape this file:
//  - one statement per call (several statements, or a multi-row INSERT, fail);
//  - UPDATE is documented with one "column=value" per statement, so an update sends one statement per changed column;
//  - the docs do not describe escaping, so text values containing a quote or backslash are rejected instead of guessed at.
import { HttpError } from '../errors.js';

const STUDENTS = 'Students';
const USERS = 'Users';
const COUNTERS = 'Counters';
const STUDENT_COUNTER = 'student_id';
const PAGE = 300; // a ZCQL SELECT returns at most 300 rows

export function createCatalystRepository(config) {
  const c = config.catalyst;
  let token;
  let tokenExpiresAt = 0;

  function assertConfigured() {
    const missing = [['DATASTORE_PROJECT_ID', c.projectId], ['DATASTORE_CLIENT_ID', c.clientId],
      ['DATASTORE_CLIENT_SECRET', c.clientSecret], ['DATASTORE_REFRESH_TOKEN', c.refreshToken]].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) throw new Error(`DB_PROVIDER=catalyst needs these settings: ${missing.join(', ')}. See backend/nodejs/README.md.`);
  }

  async function accessToken() {
    if (token && Date.now() < tokenExpiresAt - 60_000) return token;
    const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: c.refreshToken, client_id: c.clientId, client_secret: c.clientSecret });
    if (c.redirectUri) form.set('redirect_uri', c.redirectUri);
    let response;
    try {
      response = await fetch(`${c.accountsDomain}/oauth/v2/token`, { method: 'POST', body: form, signal: AbortSignal.timeout(15000) });
    } catch {
      throw new Error(`Cannot reach Zoho at ${c.accountsDomain}. Check your internet connection and DATASTORE_ACCOUNTS_DOMAIN.`);
    }
    const data = await response.json().catch(() => ({}));
    if (!data.access_token) throw new Error(`Zoho refused the refresh token (${data.error ?? `HTTP ${response.status}`}). Check DATASTORE_CLIENT_ID, DATASTORE_CLIENT_SECRET, DATASTORE_REFRESH_TOKEN and that DATASTORE_ACCOUNTS_DOMAIN matches your data centre.`);
    token = data.access_token;
    tokenExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
    return token;
  }

  async function zcql(query, retry = true) {
    const authorization = `Zoho-oauthtoken ${await accessToken()}`;
    let response;
    try {
      response = await fetch(`${c.apiDomain}/baas/v1/project/${c.projectId}/query`, {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json', Environment: c.environment },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new Error(`Cannot reach the Catalyst API at ${c.apiDomain}. Check your internet connection and DATASTORE_API_DOMAIN.`);
    }
    if (response.status === 401 && retry) { token = undefined; return zcql(query, false); } // token expired early: refresh once
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`Catalyst ${body?.data?.error_code ?? body?.code ?? response.status}: ${body?.data?.message ?? body?.message ?? 'request failed'}`);
      error.code = body?.data?.error_code ?? body?.code ?? `HTTP_${response.status}`;
      error.catalystMessage = String(body?.data?.message ?? body?.message ?? '');
      throw error;
    }
    // Rows normally arrive wrapped by table name: [{ "Students": { ... } }]. Accept flat rows too.
    return (body.data ?? []).map((row) => {
      const values = Object.values(row);
      return values.length === 1 && typeof values[0] === 'object' && values[0] !== null ? values[0] : row;
    });
  }

  const isDuplicate = (error) => /DUPLICATE|CONFLICT|already exists|unique/i.test(`${error.code} ${error.catalystMessage}`);
  const toStudent = (row) => ({ id: Number(row.student_id), name: row.name, email: row.email, year: Number(row.year) });
  const COLUMNS = 'student_id, name, email, year';

  // ZCQL escaping is undocumented, so refuse characters that could end the string early rather than guess.
  function text(value, field) {
    if (/['\\\u0000-\u001f]/.test(value)) {
      throw new HttpError(400, 'VALIDATION_ERROR', `${field} cannot contain quotes, backslashes or control characters when the Zoho Data Store is used.`);
    }
    return `'${value}'`;
  }
  const int = (value) => {
    if (!Number.isInteger(value)) throw new Error('Expected an integer.');
    return String(value);
  };

  const get = async (id) => {
    const rows = await zcql(`SELECT ${COLUMNS} FROM ${STUDENTS} WHERE student_id=${int(id)}`);
    return rows[0] ? toStudent(rows[0]) : null;
  };
  const emailTaken = async (email, exceptId) => {
    const rows = await zcql(`SELECT student_id FROM ${STUDENTS} WHERE email=${text(email, 'email')}`);
    return rows.some((row) => Number(row.student_id) !== exceptId);
  };
  // Every student ID is reserved by inserting a row into Counters (counter_name 'student_id:<n>', last_id <n>) BEFORE the
  // student is created. counter_name is unique, so exactly one request can reserve a given number, and reservation rows are
  // never deleted: an ID is therefore never issued twice, even after its student is deleted. A request that loses the race
  // simply tries the next number. At startup the current highest student ID is reserved too (before any delete can happen).
  const topReservedId = async () => Number((await zcql(`SELECT last_id FROM ${COUNTERS} ORDER BY last_id DESC LIMIT 1`))[0]?.last_id ?? 0);
  const topStudentId = async () => Number((await zcql(`SELECT student_id FROM ${STUDENTS} ORDER BY student_id DESC LIMIT 1`))[0]?.student_id ?? 0);
  async function reserve(id) {
    try { await zcql(`INSERT INTO ${COUNTERS} (counter_name, last_id) VALUES ('${STUDENT_COUNTER}:${int(id)}', ${int(id)})`); } catch (error) {
      if (isDuplicate(error)) return false; // someone else owns this number
      throw error;
    }
    return true;
  }
  const nextId = async () => {
    let id = Math.max(await topReservedId(), await topStudentId()) + 1;
    while (!(await reserve(id))) id += 1;
    return id;
  };
  const duplicateEmail = () => new HttpError(409, 'DUPLICATE_EMAIL', 'A student with this email already exists.');

  return {
    label: `Zoho Catalyst Data Store (project ${c.projectId}, ${c.environment})`,
    async check() {
      assertConfigured();
      await accessToken(); // fails with its own clear message if the OAuth settings are wrong
      for (const [table, column] of [[STUDENTS, 'student_id'], [COUNTERS, 'last_id']]) {
        try { await zcql(`SELECT ${column} FROM ${table} LIMIT 1`); } catch (error) {
          throw new Error(`Cannot read the "${table}" table in Zoho Catalyst (${error.message}). Check DATASTORE_PROJECT_ID and DATASTORE_ENVIRONMENT, that the table exists with the columns in database/catalyst/README.md, and that the token has the ZohoCatalyst.zcql.CREATE scope.`);
        }
      }
      const top = await topStudentId();
      if (top) await reserve(top); // an already-reserved number is fine
    },
    close: async () => {},

    async list() {
      const students = [];
      for (let offset = 0; ; offset += PAGE) {
        const rows = await zcql(`SELECT ${COLUMNS} FROM ${STUDENTS} ORDER BY student_id LIMIT ${offset},${PAGE}`);
        students.push(...rows.map(toStudent));
        if (rows.length < PAGE) return students;
      }
    },
    get,
    async create({ name, email, year }) {
      const values = (id) => `INSERT INTO ${STUDENTS} (student_id, name, email, year) VALUES (${int(id)}, ${text(name, 'name')}, ${text(email, 'email')}, ${int(year)})`;
      if (await emailTaken(email)) throw duplicateEmail();
      for (let attempt = 0; ; attempt++) {
        const id = await nextId();
        try {
          await zcql(values(id));
          return get(id);
        } catch (error) {
          if (!isDuplicate(error)) throw error;
          if (await emailTaken(email)) throw duplicateEmail();
          if (attempt >= 1) throw error; // two students were created at the same moment; give up after one retry
        }
      }
    },
    async update(id, { name, email, year }) {
      const current = await get(id);
      if (!current) return null;
      if (email !== current.email && await emailTaken(email, id)) throw duplicateEmail();
      // One statement per changed column (email first, so a unique-value failure happens before anything else changes).
      const changes = [['email', email !== current.email && text(email, 'email')], ['name', name !== current.name && text(name, 'name')], ['year', year !== current.year && int(year)]];
      for (const [column, value] of changes) {
        if (!value) continue;
        try { await zcql(`UPDATE ${STUDENTS} SET ${column}=${value} WHERE student_id=${int(id)}`); } catch (error) {
          if (isDuplicate(error)) throw duplicateEmail();
          throw error;
        }
      }
      return get(id);
    },
    async remove(id) {
      if (!(await get(id))) return false;
      await zcql(`DELETE FROM ${STUDENTS} WHERE student_id=${int(id)}`);
      return true;
    },
    async findUser(username) {
      if (/['\\\u0000-\u001f]/.test(username)) return null; // cannot be a real username; avoid building a query from it
      const rows = await zcql(`SELECT username, password FROM ${USERS} WHERE username=${text(username, 'username')}`);
      return rows[0] ? { username: rows[0].username, password: rows[0].password } : null;
    },
  };
}
