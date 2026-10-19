# React frontend

React + Vite, independently buildable. Run commands from this directory.
Use `npm.cmd` on Windows PowerShell if script execution blocks `npm`.

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

`npm.cmd run preview` serves the existing production build, normally at
http://127.0.0.1:4173. It is a local review server, not production hosting.
The build output is `dist/`.

## Runtime configuration

Edit `public/config.json`, then refresh the development app:

```json
{
  "mode": "demo",
  "apiBaseUrl": "http://localhost:8080",
  "requestTimeoutMs": 15000
}
```

- `demo`: labelled, in-memory sample records; the login form accepts any non-blank username and password; no API requests.
- `api`: username/password form and real HTTP requests to a conforming backend.
  No real backend exists yet. Use the contract mock below, or expect connection errors.
- `apiBaseUrl`: absolute HTTP(S) URL, optionally including a function prefix.
  The API service preserves the prefix and appends `/api/...`.
- `requestTimeoutMs`: 1000–120000; default 15000. Mutations are never retried.

On a built application, edit `dist/config.json` and refresh. There is no source
rebuild required for that change. A later `npm.cmd run build` copies the source
`public/config.json` again, so maintain the appropriate deployment configuration.
Static hosting must serve config.json with `Cache-Control: no-store` or equivalent.
The frontend also requests it with `cache: 'no-store'`.

The token is kept in memory and cleared on logout or protected 401 responses.
Refreshing requires login again. Never put secrets into runtime configuration.
Routing uses `HashRouter` (`#/login`, `#/students`, `#/students/new`, `#/students/:id`,
`#/students/:id/edit`, `#/students/:id/delete`), so static hosts need no SPA rewrite rules.
An `https://` page must use an `https://` API URL (localhost is exempt); the app reports this clearly.

## Try API mode without a backend

```powershell
# terminal 1 (repo root): prints a generated password for user "learner"
$env:CORS_ORIGIN='http://127.0.0.1:5173'; node api-contract/mock/server.mjs
# terminal 2: set "mode": "api" in public/config.json, then
npm.cmd run dev
```

The mock is in-memory and dev-only. Restore `"mode": "demo"` afterwards.

## Code map

- `src/main.jsx`: load runtime config before rendering the application.
- `src/config.js`: configuration validation.
- `src/api.js`: centralized HTTP service and in-memory JWT handling.
- `src/demo.js`: isolated frontend demo service.
- `src/App.jsx`: routes, login, directory, and the details/add/edit/delete dialogs.
- `public/brand/`: XploCode logo and fonts (dagger wordmark, Neue Montreal) copied from xplocode.com.
- `src/styles.css`: responsive layout and shared visual styling.
- `tests/services.test.js`: service and runtime configuration checks, using Node's built-in test runner.
- `tests/mock-integration.test.js`: real HTTP tests of the API service against `api-contract/mock/server.mjs`.

See [the manual checklist](../../docs/frontend-checkpoint.md) for the user checkpoint.
