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
  Use the Node backend locally or the deployed Catalyst function; the contract mock below is for development only.
- `apiBaseUrl`: absolute HTTP(S) URL, optionally including a function prefix, or a root-relative path for an API on the page's own origin.
  The API service preserves the prefix and appends `/api/...`.
- `requestTimeoutMs`: 1000–120000; default 15000. Mutations are never retried.

## Call a deployed (cloud) API from the local app
Set `apiBaseUrl` in `public/config.json` to the deployed address (for example `https://<project domain>/server/student_api`
for a Zoho Catalyst function) and run `npm.cmd run dev`. Direct browser calls require successful CORS preflight responses from the deployed host.
The deployed backend must list the page's address in `CORS_ORIGIN` (`http://localhost:5173` and `http://127.0.0.1:5173` are the defaults).

### Workshop: local React with a deployed Catalyst API

Use the Vite development proxy for this workshop setup. A headless Edge check on 2026-10-21 reproduced
`PreflightMissingAllowOriginHeader` when calling the deployed function directly from `http://127.0.0.1:5173`.
Its OPTIONS response lacked CORS headers even though real requests included them. The proxy forwards browser requests
through the local dev server to the real cloud backend: browser -> local Vite `/cloud-api` -> Catalyst `/server/student_api/api/...`.
This is API mode with real authentication and data, not the in-memory demo.

Students need Node 22.12+, npm, internet access to the deployed API, and the function base URL and demo login from the instructor.
The backend must already be deployed and configured using [the backend guide](../../backend/nodejs/README.md).

1. From the cloned repository, open a terminal in `frontend/react` and run:

   ```powershell
   npm.cmd ci
   Copy-Item .env.example .env.local
   ```

2. Edit `frontend/react/.env.local`, replacing the example URL with the instructor's function base URL or your own deployed function:

   ```dotenv
   API_PROXY_TARGET=https://<your-project-domain>/server/student_api
   ```

   Keep `/server/student_api`; do not append `/api`, `/api/health`, or a hash route. This file contains a public URL, no backend credentials.
   Vite serves runtime `config.json` with `mode: "api"` and a local `/cloud-api` base URL while the proxy is enabled.
   The cloud URL in `public/config.json` stays unchanged on disk.

3. Start the frontend (stop and restart it if it was already running):

   ```powershell
   npm.cmd run dev
   ```

4. Open the Local URL printed by Vite. At that same origin, open `/config.json`: `apiBaseUrl` should end in `/cloud-api`.
   Open `/cloud-api/api/health`: expect `{"status":"ok"}`. Then sign in using the backend's demo account
   (`learner` / `learner123` for the provided seed) and check that the student list loads.

The `.env.local` file is ignored by Git, so **each student must create it once**. Restart after changing its URL.
The example file and `vite.config.js` must be included in the repository distributed to students.
An instructor's `.env.local` is not included in a clone. Students using the same function share its student records.

If `/config.json` still points directly at Catalyst, check the file location, the `API_PROXY_TARGET` spelling, and restart Vite.
A value set in the terminal takes precedence over `.env.local`; clear or update it if it points to another API.
If the proxied health request fails, check the function base URL, internet access and backend availability; an HTML response often indicates a wrong path.

This proxy runs only with `npm.cmd run dev`. It is not included in `dist/` or enabled by `npm.cmd run preview`.
For a deployed Catalyst frontend, use the same-project Web Client Hosting procedure below.
For local MySQL or explicit demo mode, remove/comment `API_PROXY_TARGET` in `.env.local` and unset it in the terminal, then restart;
Vite will use `public/config.json` unchanged. There is no automatic fallback to demo mode.

## Deploy React with Catalyst Web Client Hosting

Use **Web Client Hosting in the same Catalyst project and environment as the `student_api` function**.
The browser then loads React at `/app/` and calls `/server/student_api/api/...` on the same origin.
No local Vite proxy is needed on the deployed site. The function must already be deployed, configured and reachable.

1. From `frontend/react`, run:

   ```powershell
   npm.cmd ci
   npm.cmd run build:catalyst
   ```

   This writes `dist-catalyst/`, separate from the ordinary `dist/` build. It includes `/app/` asset paths,
   `client-package.json` at the root, and runtime `config.json` with `mode: "api"` and `apiBaseUrl: "/server/student_api"`.
   The root-relative URL resolves to the deployed page's own origin. The source `public/config.json` and `.env.local` are not edited.
   `API_PROXY_TARGET` is development-only and is not used in the generated runtime config.

2. For the first upload, use the name and version in `public/client-package.json`. For updates, keep the existing hosted name
   and increase its version, then rebuild. This file contains hosting metadata, not credentials.

3. In File Explorer, open `dist-catalyst`, select **the files inside it** and create a ZIP. Check that `index.html`,
   `config.json`, `client-package.json`, `assets/` and `brand/` are at the ZIP root; do not zip the enclosing directory.
   Do not upload the ordinary `dist/` build for this procedure.

4. When authorized to deploy, open Catalyst console -> the same project/environment -> **Web Client Hosting** and upload the ZIP.
   Running `build:catalyst` only creates local files; it does not upload them or change cloud resources.

5. Verify the deployed site's `/app/config.json` and `/server/student_api/api/health`. Open `/app/index.html#/login`,
   sign in, and check the student list. In browser Network tools, login and student requests must use the same scheme, host and port
   as the page, with the `/server/student_api/api/...` prefix. Verify a deep link redirects to login after refresh.

The build layout and same-origin configuration are checked locally. A real Web Client Hosting upload and its browser behavior
still require verification after an authorized deployment; successful local checks do not establish that the hosted app works.

Catalyst requires the manifest at the ZIP root and serves the client under `/app/`:
[hosting requirements](https://docs.catalyst.zoho.com/en/cloud-scale/help/web-client-hosting/key-concepts/),
[client URL](https://docs.catalyst.zoho.com/en/cli/v1/deploy-resources/deploy-client/).

### Slate or another frontend origin

Do not use the current Catalyst function URL directly from a separate Slate origin for this workshop.
Its observed OPTIONS response lacks CORS headers; setting the Express `CORS_ORIGIN` alone did not fix that gateway response.
The Vite development proxy is not shipped in a static build.

To use Slate with this API, first provide a production same-origin reverse proxy on that host, or configure the gateway to return
successful cross-origin preflight responses. No such production proxy or verified gateway configuration is supplied here.
Until that is verified, use the Web Client Hosting procedure above; a successful Slate build alone is not API integration.

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
