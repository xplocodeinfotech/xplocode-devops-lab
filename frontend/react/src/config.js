export function validateConfig(config) {
  if (!config || !['demo', 'api'].includes(config.mode)) {
    throw new Error('config.json must set mode to "demo" or "api".');
  }
  if (typeof config.apiBaseUrl !== 'string' || !config.apiBaseUrl.trim()) {
    throw new Error('config.json must include apiBaseUrl.');
  }
  const apiBaseUrl = config.apiBaseUrl.trim().replace(/\/+$/, '');
  let url;
  try { url = new URL(apiBaseUrl); } catch {
    throw new Error('apiBaseUrl must be an absolute HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password) {
    throw new Error('apiBaseUrl must be HTTP(S), without credentials, query strings, or fragments.');
  }
  const requestTimeoutMs = config.requestTimeoutMs ?? 15000;
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 120000) {
    throw new Error('requestTimeoutMs must be an integer between 1000 and 120000.');
  }
  return { mode: config.mode, apiBaseUrl, requestTimeoutMs };
}

export async function loadConfig(fetcher = fetch) {
  const response = await fetcher(`${import.meta.env?.BASE_URL ?? '/'}config.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load config.json. Check the static hosting configuration.');
  return validateConfig(await response.json());
}
