# Project status

Updated: 2026-10-18 (Asia/Calcutta).

## Current checkpoint

React frontend only (revision 2, after review). Repository was initially empty, with no API contract,
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

## Next checkpoint

Wait for review of this revision, then prepare Node.js + MySQL prerequisites (Docker image pull, ports)
and implement the first backend against the shared contract and mock-tested frontend.
