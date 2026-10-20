# Node.js backend (Express + MySQL)

A small demo API for the shared contract in [`CONTRACT.md`](../../CONTRACT.md). It runs locally against MySQL.
Not built yet: Docker image, Catalyst entry point, Cloud Run, other databases.

## Quick start (local demo)
You need Node 22.12+ and Docker. From the repo root:

```powershell
docker compose up -d                 # 1. start MySQL (wait ~20 seconds the first time)
cd database\mysql
npm.cmd ci
npm.cmd run setup                    # 2. create tables + demo login + sample students
cd ..\..\backend\nodejs
npm.cmd ci
npm.cmd start                        # 3. start the API
```
Expected: `Database connected (localhost:3306/studentdb).` then `Student API listening on port 8080`.
No `.env` file is needed; the defaults match `docker-compose.yml`.

**Demo login:** username `learner`, password `learner123` (demo only; passwords are stored as plain text).

If you see a message instead, it says what to fix. For example `Cannot reach MySQL ... docker compose up -d` means
MySQL isn't running yet.

## Try the API
Keep the API running in one terminal. In a **second** terminal, from `backend
odejs`, run:
```powershell
npm.cmd run try
```
Expected: a list of `OK` lines (health, login, list, create, get, delete) ending with `All checks passed.`
If the API is not running it says so and how to start it. No pasting needed.

Want to make the calls by hand? In **Windows PowerShell** run them one line at a time (a pasted block can lose its line
breaks and fail with "Unexpected token"):
```powershell
$B = "http://localhost:8080"
$login = Invoke-RestMethod "$B/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"learner","password":"learner123"}'
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod "$B/api/students" -Headers $headers | Format-Table
```
(In PowerShell, `curl` is not the real curl; use `Invoke-RestMethod`.) On macOS, Linux or Git Bash:
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"learner","password":"learner123"}' | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/students
```
`npm run try` also works against a deployed API: set `API_BASE_URL` to its address first.

To use it from the React app, set `"mode": "api"` and `"apiBaseUrl": "http://localhost:8080"` in the frontend's
`public/config.json` and run the frontend on `http://localhost:5173` (or add your origin to `CORS_ORIGIN`).
Endpoints and errors are in [`api-contract/openapi.yaml`](../../api-contract/openapi.yaml).

## Settings (all optional locally)
Set them as environment variables or in a `.env` file (copy `.env.example`). They are never committed.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port (Cloud Run sets it itself) |
| `DB_HOST` `DB_PORT` `DB_NAME` | `localhost` `3306` `studentdb` | Database location |
| `DB_USER` `DB_PASSWORD` | `gp_user` `gp_pass` | Database login (demo values from `docker-compose.yml`) |
| `DB_SSL` | `false` | `true` verifies the server certificate. Needed for most managed databases |
| `DB_POOL_MAX` | `2` | Connections per instance. Keep small for serverless |
| `JWT_SECRET` | demo key locally | **Required when `NODE_ENV=production`**, 16+ random characters |
| `JWT_EXPIRES_IN` | `3600` | Token lifetime in seconds |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed browser origins |
| `DB_PROVIDER` | `mysql` | Database to use: `mysql` or `catalyst` (Zoho Data Store, extra `CATALYST_*` settings below) |

## Code map
- `src/app.js` builds the Express app and never calls `listen`, so other entry points can reuse it.
- `src/server.js` checks the database, then listens on `0.0.0.0:$PORT`.
- `src/routes/` HTTP only. `src/services/` validation, login and tokens. `src/repositories/` the only code that talks to a database.
- `src/config/` reads the settings above.

## Use the Zoho Catalyst Data Store (instead of MySQL)
The API can store students in your Catalyst project instead of MySQL by calling Catalyst's REST API with an OAuth token.
Nothing else changes: same endpoints, same login (`learner` / `learner123`). Status: tested end to end against a real Catalyst
project (India data centre, Development environment, 2026-10-20): login, list, create, get, edit, duplicate emails, delete. Not tested:
the Production environment and other data centres.

1. **Create and fill the tables** in your Catalyst project: follow [`database/catalyst/README.md`](../../database/catalyst/README.md)
   (tables `Students` and `Users`, then the INSERT statements in `seed.zcql`, one per run).
2. **Project ID:** Catalyst console, Settings (top right) > Project Settings > General.
3. **Get OAuth credentials** (once). Open <https://api-console.zoho.in> (use `.com` or `.eu` for other regions) and choose **Self Client**.
   - In **Generate Code**, enter this scope, pick a time duration, and click Create. Copy the grant code (shown once, short-lived):
     `ZohoCatalyst.zcql.CREATE,ZohoCatalyst.tables.rows.CREATE,ZohoCatalyst.tables.rows.READ,ZohoCatalyst.tables.rows.UPDATE,ZohoCatalyst.tables.rows.DELETE`
   - In the **Client Secret** tab, copy the Client ID and Client Secret.
   - Exchange the grant code for a refresh token (PowerShell, one command, replace the three capitals):
     ```powershell
     Invoke-RestMethod -Method Post "https://accounts.zoho.in/oauth/v2/token" -Body @{ grant_type="authorization_code"; code="GRANT_CODE"; client_id="CLIENT_ID"; client_secret="CLIENT_SECRET" }
     ```
     Copy `refresh_token` from the result. It stays valid until you revoke it, so treat it like a password. If Zoho asks for a
     `redirect_uri`, add it to the command and set `CATALYST_REDIRECT_URI` (it was not needed on the tested project).
4. **Settings:** put these in `backend/nodejs/.env` (never commit it):
   ```
   DB_PROVIDER=catalyst
   CATALYST_PROJECT_ID=your project id
   CATALYST_CLIENT_ID=...
   CATALYST_CLIENT_SECRET=...
   CATALYST_REFRESH_TOKEN=...
   ```
   Defaults: environment `Development`, India data centre (`accounts.zoho.in`, `api.catalyst.zoho.in`). For another region also set
   `CATALYST_API_DOMAIN` and `CATALYST_ACCOUNTS_DOMAIN`.
5. **Start** with `npm.cmd start`. Expected: `Database connected: Zoho Catalyst Data Store (project ..., Development).`
   If something is wrong it prints one line saying what (bad token, wrong project, table missing, no internet). Then `npm.cmd run try`.

Behaviour differences from MySQL, forced by Catalyst's query language (ZCQL):
- One statement per call and one column per UPDATE, so an edit sends a few small requests (not atomic; email is changed first).
- Names and emails containing `'` or `\` are rejected with a 400, because escaping is undocumented. (`O'Neil` cannot be saved.)
- Student IDs are the current maximum plus one; two students created at the same instant may need a retry.
- The first request after a pause is slower (token refresh), and Catalyst development limits apply (5,000 rows per table).
Switch back with `DB_PROVIDER=mysql` (or remove the line).

## Troubleshooting
- API exits with a message: read it, it names the setting to fix (MySQL not running, wrong user or password, missing database).
- Login says "Invalid username or password": use `learner` / `learner123`. With MySQL run `npm run setup` in `database/mysql` again; with Catalyst check the `Users` row.
- Browser shows a CORS error: the frontend's address is not in `CORS_ORIGIN`.
- Port 8080 or 3306 already in use: stop the other program, or change `PORT` / the compose port.
