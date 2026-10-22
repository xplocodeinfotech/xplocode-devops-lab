export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

export function createApi(config, { fetcher = fetch, onUnauthorized = () => {} } = {}) {
  let token = null;
  async function request(path, { method = 'GET', body, authenticated = true } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    try {
      const response = await fetcher(`${config.apiBaseUrl.replace(/\/+$/, '')}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(authenticated && token ? { 'X-Access-Token': token } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
        cache: 'no-store',
      });
      if (response.status === 401 && authenticated) { token = null; onUnauthorized(); }
      if (response.status === 204) return undefined;
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new ApiError(data?.error?.message || `Request failed (HTTP ${response.status}).`, response.status);
      }
      if (data === null) throw new ApiError('The API returned an invalid JSON response.', response.status);
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.name === 'AbortError'
        ? 'The request timed out. Check the records before repeating a change.'
        : 'Cannot reach the API. Check its URL, network connection, HTTPS, and CORS settings.');
    } finally { clearTimeout(timeout); }
  }
  return {
    async login(username, password) {
      const data = await request('/api/auth/login', { method: 'POST', body: { username, password }, authenticated: false });
      if (typeof data.token !== 'string' || !data.token) throw new ApiError('The login response is missing its token.');
      token = data.token;
      return data.user || { username };
    },
    logout() { token = null; },
    list: () => request('/api/students'),
    get: (id) => request(`/api/students/${id}`),
    create: (student) => request('/api/students', { method: 'POST', body: student }),
    update: (id, student) => request(`/api/students/${id}`, { method: 'PUT', body: student }),
    remove: (id) => request(`/api/students/${id}`, { method: 'DELETE' }),
  };
}
