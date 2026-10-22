// Throwaway mock of the shared API contract (CONTRACT.md) for frontend development.
// In-memory only. It is NOT a backend: no database, no real user store. Do not deploy it.
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const b64 = (value) => Buffer.from(value).toString('base64url');

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

export function createMockServer({
  allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4200'],
  username = 'learner',
  password = crypto.randomBytes(9).toString('base64url'),
  expiresIn = 3600,
} = {}) {
  const secret = crypto.randomBytes(32);
  let students = [
    { id: 1, name: 'Arun Kumar', email: 'arun@example.com', year: 3 },
    { id: 2, name: 'Priya Sharma', email: 'priya@example.com', year: 2 },
  ];
  let nextId = 3;

  const sign = (payload) => {
    const body = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify(payload))}`;
    return `${body}.${crypto.createHmac('sha256', secret).update(body).digest('base64url')}`;
  };
  const verify = (token) => {
    const [h, p, s] = String(token).split('.');
    if (!s) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest();
    const given = Buffer.from(s, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
    return JSON.parse(Buffer.from(p, 'base64url').toString()).exp > Date.now() / 1000;
  };

  const validate = (body) => {
    const text = (value, field) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (!trimmed || trimmed.length > 100) throw new HttpError(400, 'VALIDATION_ERROR', `${field} must be 1-100 characters.`);
      return trimmed;
    };
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new HttpError(400, 'VALIDATION_ERROR', 'email must be a valid address.');
    if (!Number.isInteger(body?.year) || body.year < 1 || body.year > 4) throw new HttpError(400, 'VALIDATION_ERROR', 'year must be an integer from 1 to 4.');
    return { name: text(body.name, 'name'), email, year: body.year };
  };
  const assertUnique = (email, id) => {
    if (students.some((s) => s.id !== id && s.email.toLowerCase() === email.toLowerCase())) {
      throw new HttpError(409, 'DUPLICATE_EMAIL', 'A student with this email already exists.');
    }
  };
  const find = (id) => {
    const found = students.find((s) => s.id === id);
    if (!found) throw new HttpError(404, 'NOT_FOUND', 'Student not found.');
    return found;
  };

  async function readJson(req) {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 10_000) throw new HttpError(400, 'VALIDATION_ERROR', 'Request body too large.');
    }
    try { return raw ? JSON.parse(raw) : {}; } catch { throw new HttpError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.'); }
  }

  async function route(req, send) {
    const { pathname } = new URL(req.url, 'http://mock');
    const path = pathname.replace(/\/+$/, '');
    if (req.method === 'GET' && path === '/api/health') return send(200, { status: 'ok' });
    if (req.method === 'POST' && path === '/api/auth/login') {
      const body = await readJson(req);
      if (typeof body.username !== 'string' || !body.username || typeof body.password !== 'string' || !body.password) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'username and password are required.');
      }
      if (body.username !== username || body.password !== password) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid username or password.');
      return send(200, { token: sign({ sub: username, exp: Math.floor(Date.now() / 1000) + expiresIn }), expiresIn, user: { username } });
    }
    const match = path.match(/^\/api\/students(?:\/([^/]+))?$/);
    if (!match) throw new HttpError(404, 'NOT_FOUND', 'Route not found.');
    const header = req.headers.authorization ?? '';
    const token = req.headers['x-access-token'] ?? (header.startsWith('Bearer ') ? header.slice(7) : '');
    if (!token || !verify(token)) throw new HttpError(401, 'UNAUTHORIZED', 'Missing, invalid or expired token.');
    const id = match[1] === undefined ? undefined : /^\d+$/.test(match[1]) ? Number(match[1]) : 0;
    if (id === undefined) {
      if (req.method === 'GET') return send(200, students);
      if (req.method === 'POST') {
        const data = validate(await readJson(req));
        assertUnique(data.email);
        const created = { id: nextId++, ...data };
        students.push(created);
        return send(201, created);
      }
    } else {
      if (req.method === 'GET') return send(200, find(id));
      if (req.method === 'PUT') {
        find(id);
        const data = validate(await readJson(req));
        assertUnique(data.email, id);
        const updated = { id, ...data };
        students = students.map((s) => (s.id === id ? updated : s));
        return send(200, updated);
      }
      if (req.method === 'DELETE') {
        find(id);
        students = students.filter((s) => s.id !== id);
        return send(204);
      }
    }
    throw new HttpError(404, 'NOT_FOUND', 'Route not found.');
  }

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Access-Token');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const send = (status, data) => {
      res.writeHead(status, data === undefined ? {} : { 'Content-Type': 'application/json' });
      res.end(data === undefined ? undefined : JSON.stringify(data));
    };
    try { await route(req, send); } catch (error) {
      if (error instanceof HttpError) return send(error.status, { error: { code: error.code, message: error.message } });
      send(500, { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } });
    }
  });
  return { server, credentials: { username, password } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const port = Number(process.env.PORT ?? 8080);
  const origins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  const { server, credentials } = createMockServer({
    ...(origins ? { allowedOrigins: origins } : {}),
    ...(process.env.MOCK_PASSWORD ? { password: process.env.MOCK_PASSWORD } : {}),
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Mock API listening on http://127.0.0.1:${port}`);
    console.log(`Login with username "${credentials.username}" and password "${credentials.password}" (generated for this run).`);
  });
}
