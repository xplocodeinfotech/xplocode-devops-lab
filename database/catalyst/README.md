# Catalyst Data Store setup (Zoho)

Catalyst Data Store is not SQL, so `database/mysql/*.sql` cannot be used. Tables are created once in the Catalyst
console, then seeded with the CLI. The backend will use the Catalyst SDK, not JDBC (Phase 3, not built yet).
Items marked `VERIFY` were not confirmed in the docs. The REST + ZCQL access path used by the Node backend was confirmed on a real project (see `backend/nodejs/README.md`).

## 1. Create two tables (console)
Catalyst console → your project → **Cloud Scale → Data Store → Create a new Table**. Table names allow letters,
numbers and underscores only. Catalyst adds `ROWID`, `CREATORID`, `CREATEDTIME` and `MODIFIEDTIME` automatically.

**Table `Students`**

| Column | Data type | Constraints |
|---|---|---|
| `student_id` | Int | Mandatory, Unique. The integer ID the API returns. |
| `name` | Var Char (100) | Mandatory |
| `email` | Var Char (254) | Mandatory, Unique. The backend stores it in lower case. |
| `year` | Int | Mandatory |

**Table `Users`**

| Column | Data type | Constraints |
|---|---|---|
| `username` | Var Char (100) | Mandatory, Unique |
| `password` | Var Char (100) | Mandatory. Plain text, demo only. |

Why the extra columns: `ROWID` is a 64-bit number (up to 19 digits) that Catalyst generates, and JavaScript numbers lose
precision above 15-16 digits, so the API's small integer ID lives in `student_id`.
Emails are saved in lower case by the backend, so a plain unique rule on `email` already treats `A@x.com` and `a@x.com` as the same.
If the console rejects a column name such as `name` or `year` as reserved, rename it and tell the backend (`VERIFY`).

## 2. Seed the sample students
**Without the CLI:** run the INSERT statements in [`seed.zcql`](seed.zcql) in the console's ZCQL window (see "No Catalyst CLI" below).

**With the CLI:**
Prerequisites: Catalyst CLI installed and logged in, run from a folder initialised for your project (`catalyst init`).

```bash
catalyst ds:import database/catalyst/students.csv --table Students
```

The first CSV row must be the header row. The development environment accepts up to 5,000 records per table.
Add `--production` only when production is enabled for your project and you intend to write there.
This command is from the official CLI docs; it has not been run against a real project here.

## 3. Create the demo login
Same demo login as MySQL (`learner` / `learner123`, plain text, demo only):

```bash
catalyst ds:import database/catalyst/users.csv --table Users
```

## No Catalyst CLI (college lab PC)
The CLI needs Node.js and an install, which a locked-down lab machine may not allow. Everything in steps 1 to 3 has a browser-only
alternative. Items marked `VERIFY` were not confirmed on a real project.

| Task | With the CLI | Without the CLI (browser only) |
|---|---|---|
| Create the two tables | Console (no CLI exists for this) | Same: **Console**, follow the column tables above |
| Load the 3 sample students and the demo login | `catalyst ds:import ...` | **ZCQL window in the console**: paste the 4 `INSERT` statements from [`seed.zcql`](seed.zcql), **one statement per run** (4 runs in total). Tested: a single-row insert works, while a multi-row `VALUES (...), (...)` insert and several statements pasted and run together both failed. ZCQL has no CREATE TABLE, so tables still come from the console. Or add the rows by hand in the table view (`VERIFY` the insert-row form) |
| Load them from a file | `catalyst ds:import` | The documented file route is the Bulk Write API/SDK (needs the CSV uploaded to Stratus first), which is more work than typing 4 rows |

Deploying the app without the CLI (Phase 3, not built yet, so these are options to confirm then):
- **React build:** Web Client Hosting accepts a **zip upload in the console**. Zip the *contents* of the build folder (the doc says
  `client-package.json` must be at the zip root, so select the files inside, not the folder). No CLI, but you need a built copy: a
  GitHub Actions run can build it and you download the artifact.
- **Frontend alternative:** Catalyst **Slate** deploys straight from a GitHub repository in the console (it is marked Early Access).
- **Node function:** the docs say a function can be uploaded to the console without the CLI, but you must write its config files by
  hand. Java and Python functions are documented as CLI-only. `VERIFY` before promising this to students.
- **If the student's own PC is available,** install Node and the CLI there; it is the smoothest route.
- **Instructor-run option:** one person with the CLI imports a reference project; students then only add their own rows. `VERIFY`.

## 4. Check
Open each table in the console and confirm 3 students and 1 user are listed.

## Notes for the Phase 3 backend
- New students get `student_id` = current maximum + 1, and the unique constraints stop two parallel requests creating the same
  value; a collision is retried once. A ZCQL `MAX()` query is expected to work (`VERIFY`).
- Insert one row per statement. The Catalyst adapter must do the same (or use the SDK's bulk insert); multi-row ZCQL INSERT is not usable.
- A single SELECT returns at most 300 rows, so listing relies on `LIMIT` paging if the table ever grows past that.
- Local `catalyst serve` is expected to read the real cloud tables of your project, so there is no local Data Store (`VERIFY`).
- Dev and production data are separate environments; whether and how tables and rows are promoted is `VERIFY`.
