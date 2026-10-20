import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockServer } from '../../../api-contract/mock/server.mjs';
import { validateConfig } from '../src/config.js';
import { createApi } from '../src/api.js';

// Real HTTP round trips between the frontend API service and the contract mock.
const origin = 'http://localhost:5173';
let base; let credentials; let server;
test.before(async () => {
  ({ server, credentials } = createMockServer({ allowedOrigins: [origin] }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const student = { name: 'Test Student', email: 'integration@example.com', year: 2 };
const api = (onUnauthorized) => createApi(validateConfig({ mode: 'api', apiBaseUrl: `${base}/`, requestTimeoutMs: 5000 }), { onUnauthorized });

test('health is public and CORS allows only the configured origin', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' });
  const allowed = await fetch(`${base}/api/students`, { method: 'OPTIONS', headers: { Origin: origin } });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), origin);
  const blocked = await fetch(`${base}/api/students`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});

test('unauthenticated and bad-credential requests are rejected', async () => {
  let expired = 0;
  const client = api(() => { expired++; });
  await assert.rejects(client.list(), /token/i);
  assert.equal(expired, 1);
  await assert.rejects(client.login(credentials.username, 'wrong-password'), /Invalid username or password/);
  assert.equal(expired, 1, 'a failed login is not an expired session');
});

test('full CRUD flow over HTTP with validation and duplicate handling', async () => {
  const client = api();
  const account = await client.login(credentials.username, credentials.password);
  assert.equal(account.username, credentials.username);
  const before = (await client.list()).length;
  const created = await client.create(student);
  assert.ok(Number.isInteger(created.id));
  assert.deepEqual(await client.get(created.id), { id: created.id, ...student });
  await assert.rejects(client.create({ ...student, email: 'INTEGRATION@example.com' }), (e) => e.status === 409);
  await assert.rejects(client.create({ ...student, email: 'not-an-email' }), (e) => e.status === 400);
  await assert.rejects(client.create({ ...student, email: 'other@example.com', year: 9 }), (e) => e.status === 400);
  const updated = await client.update(created.id, { ...student, year: 3 });
  assert.equal(updated.year, 3);
  await client.remove(created.id);
  await assert.rejects(client.get(created.id), (e) => e.status === 404);
  assert.equal((await client.list()).length, before);
});
