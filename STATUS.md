# Project status

Updated: 2026-10-18 (Asia/Calcutta).

## Current checkpoint

React frontend only. Repository was initially empty, with no API contract, tests,
or existing implementations to preserve. User requested step-by-step review and
confirmation. Do not begin the next implementation phase before that confirmation.

## Implemented

- React/Vite application: branded welcome/login, student directory, details,
  add/edit/delete dialogs, search, department filter, and logout.
- Explicit demo mode, with in-memory sample records and a separate real API mode.
- Runtime config loaded before startup, uncached fetch, configurable API prefixes
  and timeouts, centralized API service, memory-only JWT, protected 401 handling,
  and no automatic mutation retries.
- Shared initial contract in CONTRACT.md and api-contract/openapi.yaml.
- Repository guidance and frontend prerequisite/manual review instructions.

## Verification

- Prerequisites observed: Node v24.20.0, npm 11.19.0, Git available.
- Installed React 19.3.1, React DOM 19.3.1, and Vite 8.3.4; pinned versions and
  committed-ready package lock. npm installation audit reported 0 vulnerabilities.
- `npm.cmd test`: PASS, 10 service tests (configuration, prefix handling, auth
  headers, CRUD methods, 401 behavior, timeouts, invalid JSON, no mutation retries,
  and simulated CRUD/duplicate-email/reset behavior).
- `npm.cmd run build`: PASS, production output generated in frontend/react/dist.
- `npm.cmd run preview -- --port 4173 --strictPort`: started successfully.
- HTTP smoke checks: index, JavaScript, CSS, and config.json all returned 200.
- Changed generated dist/config.json temporarily: updated API URL was served
  without rebuilding; original demo configuration restored after the check.
- Preview process stopped after verification.
- No automated browser interaction or visual QA was performed. Manual browser
  review is the user's pending checkpoint; service tests do not prove UI behavior.
- Backend, database, cloud, and fork workflow verification: not applicable yet.

## Limitations and pending confirmation

- No backend authentication, seed account, database, Angular, CI/CD, or deployment.
- Demo changes reset on browser refresh. This is intentional and clearly labelled.
- API behavior is an initial frontend contract; backend integration is unverified.
- User must review UI and browser behavior using docs/frontend-checkpoint.md.

## Next checkpoint

Wait for frontend review and confirmation, resolve any requested frontend changes,
then prepare Node.js + MySQL prerequisites and implement the first backend.
