// Tries the running API end to end: health, login, list, create, get, delete. Usage: npm run try
// Optional: API_BASE_URL (default http://localhost:8080), DEMO_USER / DEMO_PASSWORD (default learner / learner123).
const base = (process.env.API_BASE_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
const username = process.env.DEMO_USER ?? 'learner';
const password = process.env.DEMO_PASSWORD ?? 'learner123';

async function call(label, method, path, { body, token, expect } = {}) {
  let response;
  try {
    response = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'X-Access-Token': token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    console.error(`FAIL  ${label}: cannot reach ${base}. Is the API running? Start it with: npm start`);
    process.exit(1);
  }
  const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  const ok = response.status === (expect ?? 200);
  console.log(`${ok ? 'OK   ' : 'FAIL '} ${label} -> HTTP ${response.status}`);
  if (!ok) {
    console.error(`      ${data?.error?.message ?? 'Unexpected response'}`);
    process.exit(1);
  }
  return data;
}

await call('health', 'GET', '/api/health');
await call('login with a wrong password is rejected', 'POST', '/api/auth/login', { body: { username, password: 'wrong' }, expect: 401 });
const { token } = await call(`login as ${username}`, 'POST', '/api/auth/login', { body: { username, password } });
await call('students without a token are rejected', 'GET', '/api/students', { expect: 401 });
const students = await call('list students', 'GET', '/api/students', { token });
console.log(`      ${students.length} students: ${students.map((s) => s.name).join(', ')}`);
const created = await call('create a student', 'POST', '/api/students', { token, expect: 201, body: { name: 'Try Api', email: `try-api-${Date.now()}@example.com`, year: 2 } });
console.log(`      created id ${created.id}`);
await call('get the student', 'GET', `/api/students/${created.id}`, { token });
await call('delete the student', 'DELETE', `/api/students/${created.id}`, { token, expect: 204 });
console.log('All checks passed.');
