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
