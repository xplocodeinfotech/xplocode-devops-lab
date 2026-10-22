# Node.js backend (Express + MySQL)

A small demo API for the shared contract in [`CONTRACT.md`](../../CONTRACT.md). It runs locally against MySQL.
The Catalyst function is deployed in the workshop development project; local React login and student listing against it were verified.
Cloud Run deployment files exist but are not deployed (see "Files for Catalyst Functions and Cloud Run"). Not built yet: Firestore or other databases.

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
$headers = @{ "X-Access-Token" = $login.token }
Invoke-RestMethod "$B/api/students" -Headers $headers | Format-Table
```
(In PowerShell, `curl` is not the real curl; use `Invoke-RestMethod`.) On macOS, Linux or Git Bash:
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"learner","password":"learner123"}' | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")
curl -H "X-Access-Token: $TOKEN" http://localhost:8080/api/students
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
| `DB_PROVIDER` | `mysql` | Database to use: `mysql` or `catalyst` (Zoho Data Store, extra `DATASTORE_*` settings below) |

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

### Create the Students, Users and Counters tables in Catalyst
Follow [`database/catalyst/README.md`](../../database/catalyst/README.md): tables `Students`, `Users` and `Counters`, then the INSERT statements
in `seed.zcql`, one per run.

### Find your Catalyst Project ID
Catalyst console, Settings (top right) > Project Settings > General.

### Create a Zoho Self Client (Client ID and Client Secret)
Open <https://api-console.zoho.in> (use `.com` or `.eu` for other regions) and choose **Self Client**.
In the **Client Secret** tab, copy the Client ID and Client Secret.

### Generate the grant code
In the Self Client's **Generate Code** tab, enter this scope, pick a time duration, and click Create. Copy the grant code (shown once, short-lived):
`ZohoCatalyst.zcql.CREATE,ZohoCatalyst.tables.rows.CREATE,ZohoCatalyst.tables.rows.READ,ZohoCatalyst.tables.rows.UPDATE,ZohoCatalyst.tables.rows.DELETE`

### Exchange the grant code for a refresh token
PowerShell, one command, replace the three capitals:
```powershell
Invoke-RestMethod -Method Post "https://accounts.zoho.in/oauth/v2/token" -Body @{ grant_type="authorization_code"; code="GRANT_CODE"; client_id="CLIENT_ID"; client_secret="CLIENT_SECRET" }
```
Copy `refresh_token` from the result. It stays valid until you revoke it, so treat it like a password. If Zoho asks for a
`redirect_uri`, add it to the command and set `DATASTORE_REDIRECT_URI` (it was not needed on the tested project).

### Put the Catalyst settings in .env
In `backend/nodejs/.env` (never commit it):
```
DB_PROVIDER=catalyst
DATASTORE_PROJECT_ID=your project id
DATASTORE_CLIENT_ID=...
DATASTORE_CLIENT_SECRET=...
DATASTORE_REFRESH_TOKEN=...
```
Defaults: environment `Development`, India data centre (`accounts.zoho.in`, `api.catalyst.zoho.in`). For another region also set
`DATASTORE_API_DOMAIN` and `DATASTORE_ACCOUNTS_DOMAIN`.

### Start the API and check the Catalyst connection
Run `npm.cmd start`. Expected: `Database connected: Zoho Catalyst Data Store (project ..., Development).`
If something is wrong it prints one line saying what (bad token, wrong project, table missing, no internet). Then `npm.cmd run try`.

### Switch back to MySQL
Set `DB_PROVIDER=mysql` (or remove the line) and restart. Keep only one `DB_PROVIDER` line in `.env`.

### Catalyst vs MySQL behaviour differences
Forced by Catalyst's query language (ZCQL):
- One statement per call and one column per UPDATE, so an edit sends a few small requests (not atomic; email is changed first).
- Names and emails containing `'` or `\` are rejected with a 400, because escaping is undocumented. (`O'Neil` cannot be saved.)
- Student IDs are claimed through permanent unique rows in `Counters`; simultaneous claims retry with another number. Reservations also consume table capacity after a student is deleted or an insert fails.
- The first request after a pause is slower (token refresh), and Catalyst development limits apply (5,000 rows per table).

## Files for Catalyst Functions and Cloud Run
The same Express app (`src/app.js`) runs in three places. Only the entry file differs; routes, services and the API contract do not.

| Where | Entry file | Notes |
|---|---|---|
| Your PC | `src/server.js` (`npm.cmd start`) | Checks the database, then listens on `PORT` |
| Cloud Run (GCP) | `Dockerfile` runs `src/server.js` | Cloud Run sets `PORT`. Pass settings as environment variables, never in the image (`.env` is excluded) |
| Zoho Catalyst Advanced I/O function | `index.cjs` + `catalyst-config.json` | Exports the app instead of listening. The database check runs on the first request, and a failed check returns 503 and is retried |

### Deploy the Catalyst Function without the CLI (zip upload)
No Catalyst CLI is needed, only Node.js 22 (the same one you use to run the API). Get the code by forking this repository on GitHub and cloning it (or "Download ZIP" from GitHub), then:
1. In `backend/nodejs`, run `npm.cmd install` once if you have not, then `npm.cmd run package:catalyst`. This creates `catalyst-function.zip` (about 2 MB; `catalyst-config.json` at its root, production `node_modules` included). If the console offers a different Node stack than `node22`, run `npm.cmd run package:catalyst -- node20` with that name.
2. Catalyst console > your project > **Serverless > Functions > Create Function > File Upload**. Choose **Advanced I/O**, **Node.js**, the same stack, the name `student_api`, and upload the zip.
3. Open the function > **Configuration** > **Create Variable** for each setting listed below (Development values are used first).
4. Open the function URL `/server/student_api/api/health` in a browser. Expected: `{"status":"ok"}`.
The zip and the name must agree with the console (name `student_api`, same stack, correct function type), otherwise the upload fails.

### Build the Catalyst zip by hand (what `npm run package:catalyst` does)
`package:catalyst` is only a shortcut written for this repository; Catalyst does not need it. To understand it, or if you prefer, build the same zip yourself:
1. Copy these into a new empty folder: `index.cjs`, `src`, `catalyst-config.json`, `package.json`, `package-lock.json`. **Do not copy `.env`** (it holds your Catalyst secret), `node_modules`, `scripts`, `Dockerfile` or `.dockerignore`.
2. In the new folder's `package.json`, change `"name"` to `student_api`. In `catalyst-config.json`, make `deployment.name` `student_api` and `deployment.stack` the same stack you will pick in the console. The console requires the function name, the stack and the function type (Advanced I/O) to agree with these files.
3. In that folder run `npm.cmd ci --omit=dev`. This creates `node_modules`; it is included because the docs do not say whether the console installs dependencies.
4. Open the folder, select **everything inside it** (not the folder itself) and compress it, so `catalyst-config.json` sits at the root of the zip. In File Explorer use right-click > Send to > Compressed (zipped) folder. Avoid PowerShell 5.1 `Compress-Archive`, which can write backslashes in the paths.
5. Upload the zip as in the section above.

### Deploy the React frontend in the same Catalyst project
Follow the [Web Client Hosting procedure](../../frontend/react/README.md#deploy-react-with-catalyst-web-client-hosting).
Run `npm.cmd run build:catalyst` in `frontend/react` and zip the contents of `dist-catalyst`, which includes the required
`client-package.json`, `/app/` asset paths and a same-origin `/server/student_api` API setting. The frontend and function must
be hosted in the same project and environment. This command only builds local files; upload requires explicit deployment authorization.

The earlier Slate instructions were incomplete: the function's gateway preflight lacks CORS headers, so pointing a separate Slate
site at this function and changing `CORS_ORIGIN` is insufficient. A production reverse proxy or verified gateway CORS configuration
is required first; see [the Slate limitation](../../frontend/react/README.md#slate-or-another-frontend-origin). No working Slate/API integration is claimed.

### Catalyst Function: settings and address
- Set `NODE_ENV=production`, `JWT_SECRET`, `DB_PROVIDER=catalyst`, the four `DATASTORE_*` values and `CORS_ORIGIN` as the function's environment variables in the Catalyst console, not in files.
- A function is served under `/server/<function name>/`, so the API address is `https://<project domain>/server/student_api`. Put that (without `/api`) in the frontend's `config.json` `apiBaseUrl`; the frontend keeps the path prefix.
- Function limits: 30 seconds per request. The first request after a pause is slower.
- Verified in the development project: function ZIP acceptance, `node22`, `.cjs` entry, and local React login/list through the Vite proxy.
  Still unverified: Web Client Hosting upload and browser integration, Production environment, and a production Slate/API routing solution.

### Cloud Run: build and run
```bash
docker build -t student-api backend/nodejs
docker run --rm -p 8080:8080 -e DB_PROVIDER=mysql -e DB_HOST=host.docker.internal -e JWT_SECRET=<16+ random characters> student-api
```
`JWT_SECRET` is required because the image sets `NODE_ENV=production`. The Cloud Run database is not decided yet: the `mysql` and `catalyst` providers already work from any host, Firestore is not written.

## Troubleshooting
- API exits with a message: read it, it names the setting to fix (MySQL not running, wrong user or password, missing database).
- Login says "Invalid username or password": use `learner` / `learner123`. With MySQL run `npm run setup` in `database/mysql` again; with Catalyst check the `Users` row.
- Wrong database in use (for example Catalyst although you wanted MySQL): keep exactly one `DB_PROVIDER` line in `.env`. If the name appears twice, the last line wins, and a value already set in the terminal or Windows environment beats the file. Restart the API after editing; the startup line shows the active database.
- Browser shows a CORS error: check the allowed origin and the actual OPTIONS response. For the observed Catalyst gateway preflight failure, use the documented local Vite proxy or same-project Web Client Hosting; adding an Express origin alone does not repair a gateway response.
- Port 8080 or 3306 already in use: stop the other program, or change `PORT` / the compose port.
