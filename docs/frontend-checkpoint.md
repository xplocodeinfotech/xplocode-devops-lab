# Step 1 — React frontend prerequisite and review checkpoint

Scope: React frontend only. Complete and confirm this step before backend work.

## Prerequisites

| Item | Needed now? | Check |
| --- | --- | --- |
| Node.js 24 LTS | Yes; already available on this machine | `node --version` |
| npm | Yes; already available | `npm.cmd --version` |
| Git | Available; no account changes needed for local review | `git --version` |
| Modern browser | Yes | Chrome, Edge, Firefox, or Safari |
| Internet | For dependency installation | npm registry access |
| Docker, Java, Python, Angular CLI | No | Later checkpoints. Present here: Docker 29.7, Java 21, Maven 3.10, Python 3.15 (very new: FastAPI/driver support is `VERIFY`) |
| Database or cloud account | No | Later checkpoints |

Observed prerequisites on 2026-10-18: Node v24.20.0 and npm 11.19.0.
PowerShell blocks `npm.ps1` on this machine. Use `npm.cmd`; no execution-policy
change is required. On macOS/Linux use `npm` in place of `npm.cmd`.

## A. Install and start

Open PowerShell:

```powershell
cd D:\GP\repo\github\xplocode-devops-lab\frontend\react
node --version
npm.cmd --version
npm.cmd ci
npm.cmd run dev
```

Expected: Vite prints a Local URL, normally `http://127.0.0.1:5173/`.
Use the printed URL if the default port was occupied. Keep this terminal running.
Open the URL manually in your browser. Stop the server with Ctrl+C when finished.

## B. Review the frontend

1. Confirm the login page shows the XploCode logo and wordmark (same fonts as xplocode.com), a **Demo mode** note, and username/password fields.
2. Sign in with any username and password. Expect four sample students.
3. Search for `Arun`. Expect one result. Clear the search.
4. Open **View** on a student; confirm the ID, name, email and year are shown.
5. Click **Add student**. Try submitting empty required fields and an invalid email.
   The browser should prevent submission. A whitespace-only name is also rejected.
6. Add a student with a new email, name, and year. Confirm it appears
   and the total increases. Names allow 100 characters; years are 1–4.
7. Try another student with the same email. Expect an error with no duplicate record.
8. Edit the student and confirm the changed values appear.
9. Delete the student. Cancel once to confirm it stays, then confirm deletion.
10. Search for an unknown name. Confirm a helpful empty state appears.
11. Test keyboard navigation: Tab through controls, open a dialog, and press Escape
    to close it. Use a narrow browser window to check the mobile layout; the table
    scrolls horizontally so actions and columns remain available.
12. Note the address bar changes as you open dialogs (`#/students/new`, `#/students/2`, ...). Log out and confirm login returns; opening a `#/students/...` link while signed out goes to login.
13. Refresh and sign in again. Expect the original four records; edits are not persisted.

This is a UI simulation. Demo login accepts any non-blank values and is not real authentication.
Actual valid/invalid account authentication and database persistence will be
verified after the backend exists.

## C. Run the automated checks

In another PowerShell terminal:

```powershell
cd D:\GP\repo\github\xplocode-devops-lab\frontend\react
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Expected: all service tests pass, a successful Vite build creates `dist/`, and
preview prints a URL normally `http://127.0.0.1:4173/`.
Open it and repeat the essential add/edit/delete flow.

## D. Optional: inspect the future API connection

Change `mode` to `api` in `public/config.json` and refresh the development app.
With no backend running, submitting the login form should show a connection error, never
silently switch to demo mode. To try a working API, start the dev-only contract mock
(`node api-contract/mock/server.mjs`, with `CORS_ORIGIN=http://127.0.0.1:5173`) and sign in as
`learner` with the password it prints. Restore `mode` to `demo` afterwards.

For a production build, change `dist/config.json` instead. Its modified timestamp
and page refresh should be enough; there is no need to rebuild the frontend just
to change its backend URL. Never add a JWT signing secret or database credential.

## Confirmation checkpoint

Report whether the UI looks right, whether add/edit/delete works, and any errors.
Once you confirm the frontend, the next proposed step is Node.js + MySQL backend
prerequisites and implementation against the shared API contract.

Angular, other databases, deployment, and CI/CD follow in separate checkpoints.

References: [Vite setup requirements](https://vite.dev/guide/),
[React installation](https://react.dev/learn/installation).
