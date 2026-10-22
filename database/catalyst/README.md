# Catalyst Data Store setup (Zoho)

Catalyst Data Store is not SQL, so `database/mysql/*.sql` cannot be used. Tables are created once in the Catalyst
console, then filled with sample rows (ZCQL window or CLI). The Node backend uses the REST + ZCQL adapter.
Items marked `VERIFY` were not confirmed in the docs. The REST + ZCQL access path used by the Node backend was confirmed on a real project (see `backend/nodejs/README.md`).

## Create the Students table in Catalyst
Catalyst console → your project → **Cloud Scale → Data Store → Create a new Table**. Table names allow letters,
numbers and underscores only. Catalyst adds `ROWID`, `CREATORID`, `CREATEDTIME` and `MODIFIEDTIME` automatically.

**Table `Students`**

| Column | Data type | Constraints |
|---|---|---|
| `student_id` | Int | Mandatory, Unique. The integer ID the API returns. |
| `name` | Var Char (100) | Mandatory |
| `email` | Var Char (254) | Mandatory, Unique. The backend stores it in lower case. |
| `year` | Int | Mandatory |

## Create the Users table in Catalyst
Same place: **Cloud Scale → Data Store → Create a new Table**.

**Table `Users`**

| Column | Data type | Constraints |
|---|---|---|
| `username` | Var Char (100) | Mandatory, Unique |
| `password` | Var Char (100) | Mandatory. Plain text, demo only. |

## Create the Counters table in Catalyst
Same place: **Cloud Scale → Data Store → Create a new Table**. The backend adds one row here for every student ID it issues
(`student_id:4`, `student_id:5`, ...). The unique `counter_name` lets only one request own a number, and the rows are never deleted,
so an ID is never reused after a student is deleted. Leave the table empty and never delete its rows.

**Table `Counters`**

| Column | Data type | Constraints |
|---|---|---|
| `counter_name` | Var Char (50) | Mandatory, Unique |
| `last_id` | Int | Mandatory |

## Why Students has student_id and a lower-case email
`ROWID` is a 64-bit number (up to 19 digits) that Catalyst generates, and JavaScript numbers lose
precision above 15-16 digits, so the API's small integer ID lives in `student_id`.
Emails are saved in lower case by the backend, so a plain unique rule on `email` already treats `A@x.com` and `a@x.com` as the same.
If the console rejects a column name such as `name` or `year` as reserved, rename it and tell the backend (`VERIFY`).

## Load the sample students and demo login without the CLI (ZCQL window)
Paste the 4 `INSERT` statements from [`seed.zcql`](seed.zcql) into the console's ZCQL window, **one statement per run** (4 runs in total).
Tested: a single-row insert works, while a multi-row `VALUES (...), (...)` insert and several statements pasted and run together both failed.
ZCQL has no CREATE TABLE, so tables still come from the console. Adding the rows by hand in the table view also works (`VERIFY` the insert-row form).

## Load the sample students with the Catalyst CLI
Prerequisites: Catalyst CLI installed and logged in, run from a folder initialised for your project (`catalyst init`).

```bash
catalyst ds:import database/catalyst/students.csv --table Students
```

The first CSV row must be the header row. The development environment accepts up to 5,000 records per table.
Add `--production` only when production is enabled for your project and you intend to write there.
This command is from the official CLI docs; it has not been run against a real project here.

## Create the demo login with the Catalyst CLI
Same demo login as MySQL (`learner` / `learner123`, plain text, demo only):

```bash
catalyst ds:import database/catalyst/users.csv --table Users
```

## Check the tables
Open each table in the console and confirm 3 students and 1 user are listed.

## Setup on a college lab PC without the CLI
The CLI needs Node.js and an install, which a locked-down lab machine may not allow. Every setup task has a browser-only
alternative. Items marked `VERIFY` were not confirmed on a real project.

| Task | With the CLI | Without the CLI (browser only) |
|---|---|---|
| Create the three tables | Console (no CLI exists for this) | Same: **Console**, follow the column tables above |
| Load the 3 sample students and the demo login | `catalyst ds:import ...` | **ZCQL window**, one `INSERT` per run (see the ZCQL section above) |
| Load them from a file | `catalyst ds:import` | The documented file route is the Bulk Write API/SDK (needs the CSV uploaded to Stratus first), which is more work than typing 4 rows |

## Deploy the app without the CLI
- **React build:** follow the [same-project Web Client Hosting procedure](../../frontend/react/README.md#deploy-react-with-catalyst-web-client-hosting).
  `npm.cmd run build:catalyst` prepares `dist-catalyst` with the required manifest, `/app/` assets and same-origin function URL.
  Zip the contents of that directory. Local packaging is checked; a cloud upload still needs authorization and verification.
- **Slate:** a separate Slate origin needs production proxy routing or working gateway CORS before it can use this API.
  See [the frontend limitation](../../frontend/react/README.md#slate-or-another-frontend-origin); a GitHub deployment alone does not solve it.
- **Node function:** the docs say a function can be uploaded to the console without the CLI, but you must write its config files by
  hand. Java and Python functions are documented as CLI-only. `VERIFY` before promising this to students.
- **If the student's own PC is available,** install Node and the CLI there; it is the smoothest route.
- **Instructor-run option:** one person with the CLI imports a reference project; students then only add their own rows. `VERIFY`.

## Notes for the Phase 3 Catalyst backend
- New students reserve IDs with permanent unique rows in `Counters` before insertion; colliding reservations try the next number.
- Insert one row per statement. The Catalyst adapter must do the same (or use the SDK's bulk insert); multi-row ZCQL INSERT is not usable.
- A single SELECT returns at most 300 rows, so listing relies on `LIMIT` paging if the table ever grows past that.
- Local `catalyst serve` is expected to read the real cloud tables of your project, so there is no local Data Store (`VERIFY`).
- Dev and production data are separate environments; whether and how tables and rows are promoted is `VERIFY`.
