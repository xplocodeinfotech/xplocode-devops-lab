# XploCode Student Management workshop

A phased college workshop project. **Current checkpoint: React frontend + Node.js/MySQL backend (local).**
There is no cloud deployment, Angular implementation, other backend or database, or CI/CD yet.

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
Sign in with any username and password (demo mode accepts any non-blank values).

- [Current progress and next checkpoint](STATUS.md)
- [Shared API baseline](CONTRACT.md)
- [OpenAPI specification](api-contract/openapi.yaml)
- [React frontend details](frontend/react/README.md)

The frontend loads `frontend/react/public/config.json` before startup. The checked-in
configuration explicitly selects demo mode. To exercise real API mode without a backend, run the
dev-only contract mock: `node api-contract/mock/server.mjs` (see [frontend/react/README.md](frontend/react/README.md)). Demo records live in memory and reset
on refresh. Demo mode does not authenticate users or connect to a database.

Do not start the next implementation phase until this frontend checkpoint has
been reviewed and confirmed by the user. Cloud deployment always requires explicit authorization.
