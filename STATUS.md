# Project status

Updated: 2026-10-18 (Asia/Calcutta).

## Current checkpoint

React frontend (reviewed) + minimal Node.js/MySQL backend (Step 2). See the Backend section below. Frontend revision 2 notes follow. Repository was initially empty, with no API contract,
tests, or existing implementations to preserve. Do not begin the next implementation phase before the
user confirms this checkpoint.

## Implemented

- React/Vite application styled after xplocode.com: logo image plus the "XploCode" wordmark in the
  site's own `dagger` font, Neue Montreal text, navy `#00003e` / cyan `#00d3f2` palette on a `#f0f0f0` page.
  Brand assets are in `frontend/react/public/brand/` (copied from xplocode.com).
- Client-side routing with `HashRouter` (works on any static host with no rewrite rules):
  `#/login`, `#/students`, `#/students/new`, `#/students/:id`, `#/students/:id/edit`, `#/students/:id/delete`.
  Unauthenticated deep links redirect to login and return to the requested page afterwards.
- Login page always shows username and password fields, in both modes. Demo mode accepts any non-blank values.
- Runtime `config.json` loaded before startup (uncached), prefix-preserving API base URL, timeouts,
  centralized API service, memory-only JWT, protected 401 handling, no automatic mutation retries,
  and an HTTPS-page / HTTP-API mixed-content check with a readable message.
- Student year select keeps an out-of-range value from the API visible instead of showing a blank.
- Shared contract in `CONTRACT.md` and `api-contract/openapi.yaml` (now with 500 responses, summaries,
  a servers entry and a CORS note; Redocly lint passes with 3 style warnings and no errors).
- `api-contract/mock/server.mjs`: dev-only in-memory mock of the contract (JWT, validation, 409/404/401,
  CORS allowlist). Not a backend; generates a random password per run.
- `AGENTS.md` for repository guidance, `CLAUDE.md` importing it, frontend prerequisite/review guide.

## Verification (executed 2026-10-18)

- Prerequisites observed: Node v24.20.0, npm 11.19.0, Git 2.55, Docker 29.7, Java 21, Maven 3.10, Python 3.15.
  Not installed: gh, firebase, gcloud, catalyst CLIs (not needed yet).
- `npm view` confirmed react 19.3.1, vite 8.3.4 and react-router-dom 7.18.4 exist. `npm install` reported 0 vulnerabilities.
- `npm.cmd test`: 14 of 14 PASS. Covers service/config behavior, the HTTPS mixed-content rule, demo login
  validation, and 3 real-HTTP integration tests of the frontend API service against the contract mock
  (health, CORS allow and block, 401, bad login, full CRUD, 400 validation, 409 duplicate, 404, 204).
- `npm.cmd run build`: PASS (one harmless "use client" directive warning from react-router).
- Headless Chrome (puppeteer-core, installed outside the repo) against `vite preview`, demo mode: unauthenticated
  redirect to login; login; list; add; duplicate-email error; Escape closes dialog; view (read-only);
  edit; delete; routes change as expected. The brand fonts loaded (dagger, Neue Montreal 400 and 700).
- Headless Chrome against `vite preview` + the mock on a different origin, API mode (temporary `dist/config.json`,
  restored afterwards): bad password shows the API error, good login, list, create, delete, logout, and a
  deep link after logout redirects to login. The only browser console error was the expected 401 from the bad login.
- Servers stopped afterwards; `dist/config.json` restored to demo mode.
- Screenshots were reviewed for the login page, directory and mobile width. Pixel-level comparison with xplocode.com
  was not performed; fonts, colors, logo and card/button styles were taken from the site's published CSS.

## Limitations and pending confirmation

- No real backend, seed account, database, Angular, CI/CD, or deployment. Only the dev mock exists.
- Shipped `public/config.json` is `mode: "demo"` for this review. Switch to `api` (documented in
  `frontend/react/README.md`) when a backend exists; the deploy workflow must write `mode: "api"`.
- Hash routes (`/#/students`) were chosen over path routes so no host-specific rewrite is required.
  Catalyst Web Client Hosting SPA fallback behavior is unverified.
- Brand fonts and logo are copied from xplocode.com; confirm you hold the licenses for redistribution
  (the fonts were self-hosted on the company site).
- No automated UI test suite is committed; the browser checks above were run ad hoc and are not repeatable from the repo.
- Python 3.15 is very new; FastAPI and database driver support is a `VERIFY` before the Python backend.
- Nothing is committed to Git.

## Backend (Step 2, simplified for the demo; executed 2026-10-20)

- `docker-compose.yml` (repo root): MySQL 8.4 with the demo database and user. Compose syntax validated with `docker compose config`;
  it was not started because an existing `mysql-db` container already uses port 3306 (Docker runs inside WSL here).
- `database/mysql/`: standalone package (`schema.sql`, `seed.sql`, `npm run setup`). Running `setup` resets the demo: both tables are
  recreated and the 3 sample students are added back. Demo login `learner` / `learner123`. **Passwords are plain text by decision (demo only, no hashing).**
- `backend/nodejs`: Express 5 with 3 dependencies (express, mysql2, jsonwebtoken). Every setting has a default matching the compose
  file, so no `.env` is needed locally. `JWT_SECRET` is required only when `NODE_ENV=production`. Startup checks the database and prints
  a one-line fix for common mistakes.
- Clean-copy student simulation PASSED (copy without `.env` or `node_modules`, following only the README): `npm run setup` (twice, safe),
  start API, PowerShell block from the README (health, login, list, create, get, delete; wrong password 401; no token 401).
- `npm run try` (backend script, added after a pasted multi-line PowerShell block lost its line breaks and failed): runs health, wrong-password 401, login, no-token 401, list, create, get, delete; prints a clear message if the API is down. Run against the local API: all checks passed.
- **Student fields are now id, name, email, year** (department removed everywhere by decision, 2026-10-20): contract, openapi, mock, backend, MySQL, Catalyst notes/CSV and the React app (column, form field, filter, stat card, demo data). Emails are stored and returned in lower case (no separate Catalyst key column). After the change: frontend tests 14/14 pass, build passes, `npm run setup` and `npm run try` pass, and a headless Edge run against the real backend passed (list without department column, add with mixed-case email shown lower-case, edit year, delete). An old client that still sends `department` is accepted and the field is ignored.
- **Zoho Catalyst Data Store adapter (`DB_PROVIDER=catalyst`) written, REST + OAuth refresh token + ZCQL, India data centre by default.** Verified against a local fake first (duplicates, quote and injection attempts rejected with 400, one statement per call, startup errors), then **against the user's real Catalyst project (India data centre, Development) on 2026-10-20**: startup check, `npm run try` passed, create with a mixed-case email stored lower case, duplicate email in another case 409, multi-column edit, edit to an existing email 409, apostrophe name 400, missing student 404, delete 204 then 404, final data back to the 3 sample students. This confirmed ZCQL SELECT, INSERT, UPDATE and DELETE work over the REST `/query` endpoint with the refresh-token flow, and that the five-scope string and no `redirect_uri` were sufficient. Still untested: the Production environment, other data centres, a concurrent create race, and the React app against this provider. MySQL path re-tested after the refactor (`npm run try` passes).
- Friendly messages verified: wrong DB password, MySQL not reachable, missing database, production without `JWT_SECRET`
  (backend and setup scripts).
- React in API mode against this backend in headless Edge PASSED (bad password, login, create, delete, logout, deep link after logout).
  In headless Chrome 155 typing into the add dialog failed in the automation (focus kept on the close button) while Edge worked; treated as a
  test-browser quirk, not an app bug. This was not checked in a real, interactive Chrome.
- Servers stopped, `dist/config.json` restored to demo. A stale API process from before the schema change was returning 500s until killed.
  Restart the API after running `setup`.

### Backend limitations
- Not built: Docker image for the API, Catalyst entry point, Cloud Run, other databases. Catalyst notes are in `database/catalyst`.
- Health returns 200 without checking the database (startup does check it). No rate limiting, pagination, or refresh tokens.
- Plain-text demo password and a published demo login mean nothing here is suitable for real data.

## Next checkpoint

Review the backend. Then Phase 3 (Catalyst function entry point + Data Store repository) or Phase 4 (Cloud Run Dockerfile + Firestore), whichever you choose first.

## Commit review (2026-10-21, Asia/Calcutta)

- Reviewed commits `7cdb36b` and `fd25c3e`; existing local README edits and `.claude/` were preserved.
- Executed `npm.cmd test` in `frontend/react`: 14/14 passed. These include HTTP checks against the dev-only contract mock, not backend integration.
- Executed `npm.cmd run build` in `frontend/react`: passed with React Router `use client` bundling warnings.
- Ad hoc local reproduction using fake HTTP responses for the Catalyst adapter confirmed that deleting the highest student ID lets the next create reuse it, so a stale ID resolves to a different student. No live Catalyst calls were made.
- Ad hoc HTTP check against the contract mock confirmed that creating `MixedCase@Example.com` returns the mixed-case address instead of the contract's lowercase form.
- Code inspection also found that changing a dialog's route ID within the same mode retains the previous student and load error while fetching; saving during that interval uses the previous student's ID. No browser reproduction was run in this review.
- Limitations: no real MySQL/Catalyst integration or browser checks executed in this review. Application code was not changed.
- Next checkpoint: address review findings and confirm the backend checkpoint before further implementation or deployment.

## Review fixes (2026-10-21, Asia/Calcutta)

- **Catalyst ID reuse fixed.** New `Counters` table (`counter_name`, `last_id`) remembers the highest student ID issued; startup creates its row from the current highest student ID, and `nextId` uses the larger of the counter and the highest student. **The existing Catalyst project must get this third table in the console before the API starts** (startup fails with a clear message otherwise). Docs updated in `database/catalyst/README.md`, `seed.zcql` and `backend/nodejs/README.md`.
- **Dialog state fixed.** `StudentDialog` now remounts per mode and ID (keyed wrapper in `App.jsx`), so a previous student or load error cannot carry over.
- **Contract mock fixed.** Emails are lower-cased, matching `CONTRACT.md` and the real backend.
- Checks executed: ad hoc in-memory fake of the Catalyst REST API (not a live project): delete 3 then create gives 4, delete 4 then create gives 5, stale ID 4 no longer finds a student. Mock over local HTTP: `MixedCase@Example.com` returns lower case and a different-case duplicate returns 409. Frontend `npm.cmd test` 14/14 and `npm.cmd run build` passed.
- Not run: live Catalyst calls, a browser check of the dialog fix (code change only), concurrent-create race.

## Follow-up review (2026-10-21, Asia/Calcutta)

- Reviewed the uncommitted fixes. Dialog remounting by mode and ID is correct by inspection; mock email normalization passed a local HTTP check (lowercase response and 409 for a different-case duplicate).
- Executed frontend `npm.cmd test`: 14/14 passed. Executed `npm.cmd run build`: passed with React Router `use client` bundling warnings.
- Ad hoc Catalyst adapter check with fake HTTP responses: sequential delete/create allocated IDs 4 then 5 correctly. A deterministic concurrent schedule still reproduced deleted-ID reuse: pause request A before its counter write of 4; requests B/C create 4 and 5, then delete 5; resume A, which lowers the counter to 4, collides on student 4, and retries with the deleted ID 5. Counter allocation is not atomic.
- No live database calls or browser checks were executed. Fake adapter checks and mock HTTP checks are not backend integration. Application code and existing local edits were preserved.
- Next checkpoint: fix concurrent ID allocation and verify it before approving the backend checkpoint; further implementation and deployment still await confirmation.

### Follow-up: counter can no longer be lowered (2026-10-21)

- A review showed a slow concurrent create could overwrite the `Counters` value with an older, smaller number and let a deleted ID be reused. The counter update is now conditional (`... WHERE counter_name='student_id' AND last_id<N`), so it only ever rises.
- Executed against the in-memory fake of the Catalyst API (not a live project): the reported sequence (A pauses before writing 4, B and C create 4 and 5, 5 is deleted, A resumes) now gives A the ID 6 and leaves the counter at 6; the sequential delete-then-create check still passes. The race script was not run against the old code, so it is not proven to fail without the fix.
- **Not verified:** that real ZCQL accepts `AND` in an `UPDATE ... WHERE`. Test it on the Catalyst project before relying on it. Still not atomic (two requests can compute the same ID); the unique `student_id` rejects one and the retry picks a higher number.

## Deep follow-up review (2026-10-21, Asia/Calcutta)

- Reviewed all pending application fixes and related backend services, HTTP handling, contract, and setup documentation; application code and unrelated local edits were preserved.
- Executed frontend `npm.cmd test`: 14/14 passed. `npm.cmd run build`: passed with React Router `use client` bundling warnings. `git -c core.whitespace=cr-at-eol diff --check` passed; the default whitespace check reports CRLF lines as trailing whitespace.
- Ad hoc adapter checks with fake HTTP responses passed sequential deletion, a new repository instance using the persisted counter, a failed insert leaving an ID gap, and the previously reported counter-regression schedule (delayed create now gets 6).
- One remaining defect was reproduced with a different schedule: A computes 4 and pauses before its conditional counter update; B creates 4 and deletes it; A resumes, its update matches no rows because the counter is already 4, but `nextId` still returns 4 and A successfully reuses the deleted ID. The counter never decreases in this reproduction. Allocation must establish that this request actually reserved the ID and retry when it did not.
- Executed 21 local Express HTTP checks with a substituted in-memory repository: health, missing/invalid tokens, login validation and bad password, login, CORS allow/block headers, create normalization, duplicate conflict, invalid bodies, update, get/list, invalid path ID, empty 204 delete, and subsequent 404s all passed. These exercise the HTTP/services path, not a real database integration.
- Official ZCQL WHERE documentation supports multiple conditions joined with AND and use of WHERE in UPDATE: https://docs.catalyst.zoho.com/en/cloud-scale/help/zcql/where/ . The exact statement still has not been executed against a live project in this review.
- Limitations: no live MySQL/Catalyst calls, real query atomicity verification, or browser interaction checks. The dialog key fix remains correct by code inspection.
- Next checkpoint: fix ID reservation and verify the delete-during-concurrent-create schedule before accepting the backend checkpoint. Further implementation and deployment await confirmation.

### Follow-up 2: IDs are reserved before use (2026-10-21)

- A review showed the conditional counter update did not prove ownership: A computes ID 4, B creates and deletes student 4, A resumes, its update changes nothing and A still used 4. The counter is replaced by reservations: before a student is created, the API inserts a `Counters` row (`counter_name` = `student_id:<n>`, `last_id` = `<n>`). `counter_name` is unique, so only one request can own a number; a request that loses simply tries the next one. Reservation rows are never deleted. Startup reserves the current highest student ID. No table change: the `Counters` table from the previous fix is used as is (an old `student_id` counter row is still honoured as an upper bound).
- Executed against the in-memory fake of the Catalyst API (not a live project): the reported race (A pauses before reserving 4, B creates and deletes 4, A resumes) gives A the ID 5; the sequential checks give 4 then 5 after deleting the newest student.
- Not verified on real Catalyst: that a duplicate `counter_name` INSERT is reported as a duplicate error the adapter recognises (same detection as for students and emails, which worked on the live project). `Counters` grows by one row per student created.

## Reservation fix review (2026-10-21, Asia/Calcutta)

- No new actionable findings in the reservation fix. A unique, persistent reservation now establishes ID ownership before inserting the student; losing a reservation retries instead of returning the proposed ID.
- Executed ad hoc adapter checks with fake HTTP responses: startup reservation and sequential delete/create across repository restart; failed student insert leaving a safe gap; lost response after a committed reservation leaving a safe gap; both previously reported concurrent create/delete schedules; 20 concurrent creates across separate repository instances with 20 distinct IDs; and compatibility with a legacy counter upper bound of 100 (next ID 101). All passed.
- Executed `node --check backend/nodejs/src/repositories/catalyst.js` and `git -c core.whitespace=cr-at-eol diff --check`: both passed. Frontend checks were not repeated because the latest change is confined to allocation and its documentation; previous frontend results remain recorded above.
- Limitations: fake responses enforce the documented unique constraint; this is not live Catalyst integration. The new reservation INSERT and its real duplicate-error response still need verification on the existing project. Reservations must remain persisted and consume table capacity even after student deletion or failed creation.
- Next checkpoint: verify the reservation path against the existing Catalyst project when authorized, then confirm the backend checkpoint before further implementation or deployment. Application code and unrelated local edits were preserved.

## Deployment entry points (2026-10-21, local files only; nothing deployed, no cloud resources, no billing)

- Added `backend/nodejs/index.cjs` (Catalyst Advanced I/O entry: exports a handler that loads the same `src/app.js`, runs the repository check on the first request, caches it, returns 503 and retries on a failed check), `catalyst-config.json`, `Dockerfile` and `.dockerignore` (Cloud Run). `src/` is unchanged; `PORT` was already read by the config.
- Source for the function shape: Catalyst docs (Express app exported with `module.exports = app`, served under `/server/<function>/`, 30 second limit).
- Executed: the `index.cjs` handler served over local HTTP against MySQL: health 200, login, list 200, no token 401; with an unreachable database it returned 503 and logged the one-line cause. Image layout simulated without Docker (copy of `package*.json` and `src`, `npm ci --omit=dev`, `NODE_ENV=production`): started and health 200.
- Not executed: `docker build` (the WSL Docker could not resolve the Docker Hub registry, DNS timeout, so the Dockerfile itself is untested); anything on Catalyst (CLI not installed; `catalyst-config.json` layout, the `node22` stack name, `.cjs` entry acceptance and the way to attach this folder to a Catalyst project are unverified); the Catalyst provider through the wrapper (needs the `Counters` table); Cloud Run; Firestore (not written).
- Next checkpoint: you confirm; then install the Catalyst CLI and deploy the function (billing/resource authorization needed), or retry `docker build` when the registry is reachable.

### No-CLI Catalyst deployment (2026-10-21, local checks only)

- Catalyst docs say the console's Create Function dialog has **File Upload** for Node.js zips (`catalyst-config.json` at the zip root; function name must match `package.json`/`catalyst-config.json`; selected stack must match the config; correct function type). They do not say whether the console installs `npm` dependencies for an uploaded zip, so the zip includes production `node_modules`.
- Added `backend/nodejs/scripts/package-catalyst.mjs` and `npm run package:catalyst` (no new dependencies; writes the zip itself so names use forward slashes). Output `catalyst-function.zip` is git-ignored. Function name `student_api`; stack defaults to `node22`, overridable with an argument.
- Executed: the script built a 1.8 MB, 1062-file zip; Python's zipfile test passed, `catalyst-config.json`, `index.cjs`, `package.json` at the root, no backslash names; the extracted zip served over local HTTP against MySQL: health 200, login, student list 200.
- GitHub path: students fork or download the repo and build the zip locally (needs only Node). Catalyst Slate deploys a frontend from GitHub (React, root `frontend/react`); it is not for this API. No GitHub Actions workflow was written (CI/CD waits for your confirmation).
- Not verified: the console accepting this zip and `.cjs` entry, the `node22` stack name, Slate settings, and the Slate site's origin in `CORS_ORIGIN`. Nothing was uploaded.

### First Catalyst deployment findings (2026-10-21)

- Deployed the zip as function `student_api` (development environment). Confirmed on the live URL: the zip, the `.cjs` entry and the `node22` stack are accepted and our code runs. Function logs showed nothing in the console, so `index.cjs` now returns the one-line startup reason in the 503 body.
- First live response: `Cannot reach MySQL at localhost:3306`, i.e. `DB_PROVIDER` had not reached the function (default is mysql).
- Catalyst refused `CATALYST_PROJECT_ID` as an environment variable name (reserved). The settings were renamed to `DATASTORE_PROJECT_ID`, `DATASTORE_CLIENT_ID`, `DATASTORE_CLIENT_SECRET`, `DATASTORE_REFRESH_TOKEN`, `DATASTORE_ENVIRONMENT`, `DATASTORE_API_DOMAIN`, `DATASTORE_ACCOUNTS_DOMAIN`, `DATASTORE_REDIRECT_URI`; the old `CATALYST_*` names are still read as a fallback (local `.env`). Checked locally: empty environment lists the new names, new names, old names and "new wins when both set" all behave; the local `.env` with the old names still reaches Catalyst (health 200). The Catalyst function itself has not yet been re-tested with the new names.

### Token header changed to X-Access-Token (2026-10-21)

- Live finding on the deployed function: Zoho Catalyst's gateway rejects any `Authorization` header it cannot validate (`Bearer`, `Token` and bare values returned 401 `invalid oauth token` / `Authentication failed`, even on `/api/health`), while `Authorization: Basic` and a custom header passed. So every protected call failed on Catalyst while login and health worked. Login against the live Catalyst Data Store (OAuth + `Users` table) did work.
- Contract change (user did not choose between options, so the recommended one was applied): the login token is sent as **`X-Access-Token: <JWT>`**. The Node backend still also accepts `Authorization: Bearer` (useful for curl on local/GCP). Updated: backend route and CORS allow-list, React `api.js` and its tests, contract mock, `CONTRACT.md`, `openapi.yaml` (apiKey scheme), `npm run try`, README examples.
- Executed locally: frontend `npm.cmd test` 14/14 and `npm.cmd run build` pass. Backend on MySQL: `X-Access-Token` 200, `Authorization: Bearer` 200, no token 401, bad token 401, CORS preflight allows `X-Access-Token`; `npm run try` all checks passed (created and deleted its own student).
- Not yet done: re-upload the function and re-test the protected calls on the live Catalyst URL; the live check of the React app against Catalyst.

### Local frontend to Catalyst API (2026-10-21)

- Finding on the live function: a browser preflight (`OPTIONS`) returns an empty 200 with **no CORS headers**, because Catalyst's gateway answers it before our code runs, while real requests (`GET`, `POST`) carry the right CORS headers. Catalyst Security Rules list only GET/POST/PUT/DELETE/PATCH; no console setting for allowed origins was found in the docs. A browser page on another origin therefore fails with "Cannot reach the API".
- Added `frontend/react/vite.config.js` (dev only): with `API_PROXY_TARGET` set, the dev server proxies `/cloud-api/*` to that address and serves a `config.json` pointing at it; without the variable nothing changes. Documented in `frontend/react/README.md` with a table for local, Catalyst, Cloud Run and other hosts.
- Executed against the live function through the dev server: `config.json` rewritten, health 200, login and student list 200 with `X-Access-Token`, preflight answered 204 locally; without the variable `config.json` is unchanged. Frontend `npm.cmd test` 14/14 and `npm.cmd run build` pass.
- Not run: the React UI in a real browser against Catalyst through the proxy; the Web Client Hosting same-domain case (needs a deploy; unverified).
- Follow-up: the proxy address can now also be set in the git-ignored `frontend/react/.env.local` (an environment variable is per terminal; a user set it in PowerShell but ran npm in cmd and the proxy stayed off). Checked through the dev server on a spare port using `.env.local`: `config.json` rewritten, health 200, login and list 200; build passes.

### Correction: direct browser calls to Catalyst work (2026-10-21)

- The user reported the local page served by `npm.cmd run dev` (no proxy; `config.json` pointing straight at the Catalyst function) logs in and works. This contradicts the earlier conclusion that browsers are blocked. Re-checked with curl, including browser-like headers: the `OPTIONS` preflight still returns an empty 200 without CORS headers, while real GET/POST responses carry them. Why the browser still succeeds is not explained (not verified in a browser by Claude). The earlier "Cannot reach the API" error was therefore not shown to be a CORS block; its cause is unconfirmed.
- Consequence: the Vite proxy is now documented as an optional fallback, not a requirement. `.env.local` (created for the proxy) was removed. The table of hosting cases in the frontend README was dropped because its CORS claims were not verified.

### Browser-confirmed local frontend fix (2026-10-21, Asia/Calcutta)

- User reported login failure at `http://127.0.0.1:5173/#/login` with the deployed Catalyst function configured directly in `public/config.json`.
- Reproduced in a fresh headless Edge session: login fetch failed with browser CORS error `PreflightMissingAllowOriginHeader`. Live health GET returned 200 with the allowed origin; live login OPTIONS returned 200 without CORS headers. This browser check resolves the uncertainty in the previous correction for this exact origin and deployed endpoint.
- Created git-ignored `frontend/react/.env.local` with `API_PROXY_TARGET` pointing to the existing deployed function, enabling the existing Vite proxy. Updated frontend README with the browser evidence. The public runtime configuration and cloud deployment were not changed.
- Started Vite at `http://127.0.0.1:5173` and left it running for the user. Its served `config.json` points at `http://127.0.0.1:5173/cloud-api`; proxied health returned 200.
- Verified the actual React login form in a fresh headless Edge session against the real cloud backend: login 200, protected student list 200, route `#/students`, three student rows displayed, no alert or network failures. No student records were created, edited, or deleted.
- No frontend tests or production build repeated: the change enables an existing development proxy through local environment configuration and corrects documentation. This is a verified local frontend/cloud backend login-and-list integration, not a mock.
- Limitation and next checkpoint: the proxy applies only to Vite development. Verify CORS or routing separately for the chosen production frontend host before deployment; no deployment or cloud settings changes were performed.

### Student workshop instructions (2026-10-22, Asia/Calcutta)

- Explained that the browser fix enabled the existing Vite proxy through git-ignored `.env.local`; clones do not receive that local file.
- Added distributable `frontend/react/.env.example` and explicit student instructions in the frontend README: install dependencies, copy the example, enter the function base URL, restart Vite, inspect served config and health, then sign in and load the list. Added a link from the root README and corrected stale claims about backend availability and demo mode.
- Documented prerequisites, shared data when using the same function, environment-variable precedence, no implicit demo fallback, and the development-only proxy boundary. The example and existing untracked `vite.config.js` must be included in the version of the repository shared with students; no commit or push was performed.
- Checks executed: `git check-ignore` confirms `.env.local` is ignored and `.env.example` is not; `git -c core.whitespace=cr-at-eol diff --check` passed before this status entry. Documentation was checked against current Vite configuration. No application code or cloud settings changed; no tests, build, clean-clone student run, or live requests repeated for these documentation-only changes. Prior real-browser integration results are recorded above.
- Next checkpoint: distribute the versioned setup files and rehearse the documented steps on a fresh student checkout; separately verify the selected production frontend hosting before deployment.

### Full local working-tree review (2026-10-22, Asia/Calcutta)

- Reviewed tracked changes and new deployment/proxy files, including prior review fixes and documentation updates. No application fixes, commits, pushes, deployments, or cloud resource changes were performed during this review.
- Executed frontend `npm.cmd test`: 14/14 passed; `npm.cmd run build`: passed with React Router `use client` bundling warnings. These tests use the contract mock, not a real database integration.
- Executed `npm.cmd run package:catalyst` using cached dependencies in offline mode: produced a 1062-entry, 1.8 MB function ZIP. Python zipfile CRC checks passed; root entry/config/package files, forward-slash paths, function package name, and exclusion of environment files were verified.
- Executed syntax checks for seven changed/new JavaScript files; configuration checks for DATASTORE names, legacy CATALYST fallback, precedence, and absence of a production default JWT key: passed. `git -c core.whitespace=cr-at-eol diff --check` passed.
- Findings: backend README's Slate procedure still points a separately hosted frontend directly at the Catalyst function and suggests adding CORS_ORIGIN is sufficient. A live read-only OPTIONS probe with a separate-origin header again returned 200 without CORS headers, so the documented login preflight remains blocked; Vite's local proxy is not a production solution.
- Findings: the same README says Web Client Hosting can use a zip of `dist` directly, but the actual build has no `client-package.json`, which Catalyst requires at the zip root (https://docs.catalyst.zoho.com/en/cloud-scale/help/web-client-hosting/implementation/). The upload instructions need a complete host-specific artifact procedure.
- Limitations: no new browser run, live login, live mutations, Docker image build, Slate deployment, or Web Client Hosting upload was performed. Prior successful local-browser/cloud-backend checks and simulated reservation-race checks remain recorded above; this review did not repeat them.
- Next checkpoint: correct and verify the hosted-frontend deployment paths before presenting them as reproducible workshop steps. Keep the already verified local React/Vite-to-Catalyst path available for the current demo.

### Hosted frontend review fixes (2026-10-22, Asia/Calcutta)

- Added `npm.cmd run build:catalyst` to prepare `frontend/react/dist-catalyst` for same-project/environment Web Client Hosting. It builds assets for `/app/`, copies the required `public/client-package.json` manifest, and writes explicit API-mode runtime config using `/server/student_api`. The source public config, local proxy settings, backend credentials, and cloud resources are unchanged. Output is git-ignored.
- Frontend configuration now resolves root-relative API paths against the hosting origin while preserving the function prefix. It rejects protocol-relative URLs, origin escapes, credentials, query strings and fragments. Favicon paths respect the selected build base.
- Replaced the broken Slate recipe with its production proxy/gateway-CORS prerequisites; documented same-project Web Client Hosting as the supplied hosted-frontend path. Updated root, frontend, backend and database guides with local build, manifest/version, ZIP layout, upload authorization and post-deployment verification steps. No production Slate proxy was added or claimed.
- Executed `npm.cmd test`: 15/15 passed, including the same-origin path regression check. Executed `npm.cmd run build:catalyst` and ordinary `npm.cmd run build`: both passed with React Router `use client` bundling warnings. Normal build and local-development behavior remain separate from the Catalyst-specific build.
- Executed a local static `/app/` hosting check: manifest, API-mode config, HTML asset/favicon references and their HTTP responses passed. Login and list through the generated `/server/student_api` prefix passed against the in-memory contract mock; this is not real Catalyst backend integration or a browser execution check.
- A temporary ZIP of the generated client passed CRC and root-layout checks (required HTML/config/manifest plus assets and brand files; no environment files). The first attempt to reopen an already-open temporary file by filename hit Windows file locking; rerunning with the existing file handle passed. Temporary archive was removed automatically.
- `git -c core.whitespace=cr-at-eol diff --check` passed before this status entry. No upload, deployment, cloud settings change, live API calls or database mutations were performed. The Web Client Hosting cloud upload, its actual browser behavior and Production environment remain unverified.
- Next checkpoint: review the prepared local artifact and authorize Web Client Hosting upload when ready, then run the documented same-origin health/login/list/deep-link checks. Do not present Slate integration as available until production routing or gateway preflight is implemented and verified.
