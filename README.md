# XploCode Student Management workshop

A phased college workshop project. **Current checkpoint: React frontend only.**
There is no backend, database, cloud deployment, Angular implementation, or CI/CD yet.

Start with [the frontend prerequisite and verification guide](docs/frontend-checkpoint.md).

```powershell
cd D:\GP\repo\github\xplocode-devops-lab\frontend\react
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173).
Click **Open demo workspace**. No credentials are required for this frontend preview.

- [Current progress and next checkpoint](STATUS.md)
- [Shared API baseline](CONTRACT.md)
- [OpenAPI specification](api-contract/openapi.yaml)
- [React frontend details](frontend/react/README.md)

The frontend loads `frontend/react/public/config.json` before startup. The checked-in
configuration explicitly selects demo mode. Demo records live in memory and reset
on refresh. Demo mode does not authenticate users or connect to a database.

Do not start the next implementation phase until this frontend checkpoint has
been reviewed and confirmed by the user. Cloud deployment always requires explicit authorization.
