# XploCode workshop

- Work incrementally. The current checkpoint is React frontend only. Wait for the user's confirmation before starting backend, databases, Angular, CI/CD, or cloud deployment.
- Read STATUS.md and CONTRACT.md at the beginning of a session, then inspect the current files and Git changes. Preserve unrelated changes.
- Keep frontend API calls in its API service. Load public/config.json before API requests; never put secrets there.
- Treat demo mode as an explicit frontend simulation. Never silently fall back to it when a real API fails.
- Keep frontend and backend independently buildable. Maintain one API contract across technologies.
- Record checks actually executed, their results, limitations, and the next checkpoint in STATUS.md. Never describe a simulated flow as backend integration.
- Do not create cloud resources, enable billing, deploy, or delete cloud resources without explicit user authorization.
- Branding follows xplocode.com: logo + `dagger` wordmark, Neue Montreal, navy/cyan. Keep Angular visually identical later.
- Frontend routes use HashRouter so static hosts need no rewrites. `api-contract/mock/server.mjs` is a dev-only contract mock, never a backend.
- Use npm.cmd on this Windows host; PowerShell currently blocks npm.ps1. Do not change execution policy.
