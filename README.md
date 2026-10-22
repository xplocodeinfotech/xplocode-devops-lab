# XploCode Student Management workshop

A phased college workshop project. **Current checkpoint: React frontend + Node.js backend, with local MySQL and a Catalyst Data Store adapter.**
Local React login and student listing against the deployed Catalyst function have been verified. Angular and CI/CD are not implemented.

Backend quick start (Docker and Node 22.12+; no `.env` needed): `docker compose up -d`, then in `database/mysql` run `npm.cmd ci` and
`npm.cmd run setup`, then in `backend/nodejs` run `npm.cmd ci` and `npm.cmd start`. Demo login: `learner` / `learner123`.
Details: [backend/nodejs/README.md](backend/nodejs/README.md).
In the frontend `config.json` set `"mode": "api"` and `apiBaseUrl` to `http://localhost:8080`.

Start with [the frontend prerequisite and verification guide](docs/frontend-checkpoint.md).

```powershell
cd D:\GP\repo\github\xplocode-devops-lab\frontend\react
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173).
In API mode, sign in with the backend account (`learner` / `learner123` for the provided seed).
Only explicit demo mode accepts any non-blank username and password.

For the **local React -> deployed Catalyst workshop**, follow the
[student setup steps](frontend/react/README.md#workshop-local-react-with-a-deployed-catalyst-api).
Each student copies `frontend/react/.env.example` to `.env.local`, sets the instructor's function URL or their own function URL,
and starts Vite. `.env.local` is ignored by Git and is not included in a clone. The Vite proxy handles the local browser's
connection to Catalyst; production frontend hosting needs separate routing/CORS verification.

For a hosted frontend, use the [same-project Web Client Hosting build](frontend/react/README.md#deploy-react-with-catalyst-web-client-hosting).
`npm.cmd run build:catalyst` prepares the hosting manifest, `/app/` assets and same-origin API configuration in `dist-catalyst`.
It does not deploy anything. Slate remains conditional on a production proxy or verified gateway CORS configuration.

- [Current progress and next checkpoint](STATUS.md)
- [Shared API baseline](CONTRACT.md)
- [OpenAPI specification](api-contract/openapi.yaml)
- [React frontend details](frontend/react/README.md)

The frontend loads `frontend/react/public/config.json` before startup. The current file selects API mode and the deployed Catalyst function.
With `API_PROXY_TARGET` enabled locally, Vite serves a runtime configuration using its `/cloud-api` proxy instead.
Choose `mode: "demo"` explicitly with the proxy disabled to use in-memory records. To exercise real API mode without a backend, run the
dev-only contract mock: `node api-contract/mock/server.mjs` (see [frontend/react/README.md](frontend/react/README.md)). Demo records live in memory and reset
on refresh. Demo mode does not authenticate users or connect to a database.

Do not start the next implementation phase until this backend checkpoint has
been reviewed and confirmed by the user. Cloud deployment always requires explicit authorization.
