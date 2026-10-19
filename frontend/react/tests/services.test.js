import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, validateConfig } from '../src/config.js';
import { createApi } from '../src/api.js';
import { createDemoApi } from '../src/demo.js';

const config = { mode: 'api', apiBaseUrl: 'https://example.com/functions/students/', requestTimeoutMs: 1000 };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

test('runtime configuration preserves cloud prefixes and removes trailing slashes', () => {
  assert.equal(validateConfig(config).apiBaseUrl, 'https://example.com/functions/students');
  assert.throws(() => validateConfig({ ...config, apiBaseUrl: 'javascript:alert(1)' }));
  assert.throws(() => validateConfig({ ...config, apiBaseUrl: 'https://user:secret@example.com' }));
  assert.throws(() => validateConfig({ ...config, mode: 'unknown' }));
  assert.throws(() => validateConfig({ ...config, requestTimeoutMs: -1 }));
});

test('an HTTPS page rejects a non-local HTTP API but allows localhost', () => {
  assert.throws(() => validateConfig({ ...config, apiBaseUrl: 'http://api.example.com' }, 'https:'), /must also be HTTPS/);
  assert.equal(validateConfig({ ...config, apiBaseUrl: 'http://localhost:8080' }, 'https:').apiBaseUrl, 'http://localhost:8080');
  assert.equal(validateConfig({ ...config, apiBaseUrl: 'http://api.example.com' }, 'http:').apiBaseUrl, 'http://api.example.com');
});

test('configuration loads without cached content and reports missing files', async () => {
  const loaded = await loadConfig(async (url, options) => {
    assert.equal(url, '/config.json'); assert.equal(options.cache, 'no-store');
    return json(config);
  });
  assert.equal(loaded.mode, 'api');
  await assert.rejects(loadConfig(async () => new Response('', { status: 404 })), /Unable to load/);
});

test('real API login sends credentials once and protects subsequent requests with JWT', async () => {
  const calls = [];
  const api = createApi(config, { fetcher: async (url, options) => {
    calls.push({ url, options });
    return url.endsWith('/login') ? json({ token: 'test-token', user: { username: 'learner' } }) : json([]);
  } });
  await api.login('learner', 'test-only-input');
  await api.list();
  assert.equal(calls[0].url, 'https://example.com/functions/students/api/auth/login');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].options.body), { username: 'learner', password: 'test-only-input' });
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token');
  api.logout(); await api.list();
  assert.equal(calls[2].options.headers.Authorization, undefined);
});

test('CRUD uses shared methods and handles the empty DELETE response', async () => {
  const calls = [];
  const api = createApi(config, { fetcher: async (url, options) => {
    calls.push([url, options]);
    return options.method === 'DELETE' ? new Response(null, { status: 204 }) : json({ id: 1 });
  } });
  const student = { name: 'Arun', email: 'arun@example.com', department: 'CSE', year: 3 };
  await api.get(1); await api.create(student); await api.update(1, student);
  assert.equal(await api.remove(1), undefined);
  assert.deepEqual(calls.map(([, options]) => options.method), ['GET', 'POST', 'PUT', 'DELETE']);
  assert.ok(calls[0][0].endsWith('/api/students/1'));
  assert.ok(calls[1][0].endsWith('/api/students'));
  assert.deepEqual(JSON.parse(calls[2][1].body), student);
});

test('failed login displays the API message without treating it as session expiration', async () => {
  let expired = false;
  const api = createApi(config, { onUnauthorized: () => { expired = true; }, fetcher: async () => json({ error: { message: 'Invalid credentials.' } }, 401) });
  await assert.rejects(api.login('bad', 'bad'), /Invalid credentials/);
  assert.equal(expired, false);
});

test('a protected 401 clears the token and signals the expired session', async () => {
  let expired = 0;
  let authorization;
  const api = createApi(config, { onUnauthorized: () => { expired++; }, fetcher: async (url, options) => {
    if (url.endsWith('/login')) return json({ token: 'test-token' });
    authorization = options.headers.Authorization;
    return json({ error: { message: 'Expired token.' } }, 401);
  } });
  await api.login('learner', 'test-only-input');
  await assert.rejects(api.list(), /Expired token/);
  assert.equal(authorization, 'Bearer test-token');
  await assert.rejects(api.list());
  assert.equal(authorization, undefined); assert.equal(expired, 2);
});

test('ambiguous mutation failures are not retried or replaced with demo data', async () => {
  let count = 0;
  const api = createApi(config, { fetcher: async () => { count++; throw new TypeError('Network failure'); } });
  await assert.rejects(api.create({}), /Cannot reach the API/);
  assert.equal(count, 1);
});

test('request timeout cancels the operation without retry', async () => {
  const api = createApi({ ...config, requestTimeoutMs: 10 }, { fetcher: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }) });
  await assert.rejects(api.list(), /timed out/);
});

test('invalid successful JSON and missing login tokens fail clearly', async () => {
  const api = createApi(config, { fetcher: async () => new Response('<html>Not an API</html>') });
  await assert.rejects(api.list(), /invalid JSON/);
  const missingToken = createApi(config, { fetcher: async () => json({}) });
  await assert.rejects(missingToken.login('learner', 'test-only-input'), /missing its token/);
});

test('demo supports details and CRUD, rejects duplicate emails, and resets on a new instance', async () => {
  const api = createDemoApi();
  await assert.rejects(api.list(), /Enter the demo/);
  await assert.rejects(api.login('', ''), /Enter a username/);
  await api.login('learner', 'any-demo-value');
  assert.equal((await api.list()).length, 4);
  const created = await api.create({ name: 'Test Student', email: 'test@example.com', department: 'CSE', year: 1 });
  assert.equal(typeof created.id, 'number');
  assert.equal((await api.get(created.id)).name, 'Test Student');
  await assert.rejects(api.create({ ...created, email: 'TEST@example.com' }), /already exists/);
  await api.update(created.id, { ...created, year: 2 });
  assert.equal((await api.get(created.id)).year, 2);
  await api.remove(created.id);
  await assert.rejects(api.get(created.id), /not found/);
  api.logout(); await assert.rejects(api.list(), /Enter the demo/);
  const fresh = createDemoApi(); await fresh.login('learner', 'any-demo-value');
  assert.equal((await fresh.list()).length, 4);
});
