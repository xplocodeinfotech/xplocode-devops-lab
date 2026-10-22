const localHosts = ['localhost', '127.0.0.1', '[::1]'];

export function validateConfig(config, pageProtocol = globalThis.location?.protocol, pageOrigin = globalThis.location?.origin) {
  if (!config || !['demo', 'api'].includes(config.mode)) {
    throw new Error('config.json must set mode to "demo" or "api".');
  }
  if (typeof config.apiBaseUrl !== 'string' || !config.apiBaseUrl.trim()) {
    throw new Error('config.json must include apiBaseUrl.');
  }
  const apiBaseUrl = config.apiBaseUrl.trim().replace(/\/+$/, '');
  let url;
  try {
    // A root-relative function path keeps a Web Client Hosting build on its own project origin.
    const sameOriginPath = apiBaseUrl.startsWith('/') && !apiBaseUrl.startsWith('//');
    url = new URL(apiBaseUrl, sameOriginPath ? pageOrigin : undefined);
    if (sameOriginPath && url.origin !== pageOrigin) throw new Error('Invalid same-origin path.');
  } catch {
    throw new Error('apiBaseUrl must be an absolute HTTP(S) URL or a root-relative path on the hosting origin.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password) {
    throw new Error('apiBaseUrl must be HTTP(S), without credentials, query strings, or fragments.');
  }
  if (pageProtocol === 'https:' && url.protocol === 'http:' && !localHosts.includes(url.hostname)) {
    throw new Error('This page uses HTTPS, so apiBaseUrl must also be HTTPS. Browsers block HTTP API calls from HTTPS pages.');
  }
  const requestTimeoutMs = config.requestTimeoutMs ?? 15000;
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 120000) {
    throw new Error('requestTimeoutMs must be an integer between 1000 and 120000.');
  }
  return { mode: config.mode, apiBaseUrl: url.href.replace(/\/+$/, ''), requestTimeoutMs };
}

export async function loadConfig(fetcher = fetch) {
  const response = await fetcher(`${import.meta.env?.BASE_URL ?? '/'}config.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load config.json. Check the static hosting configuration.');
  return validateConfig(await response.json());
}
