# MySQL setup (demo)

Schema and demo data for MySQL 8, independent of the backend language. Written for MySQL 8 only
(uses the `utf8mb4_0900_ai_ci` collation). Catalyst and Firestore have their own folders.

## Quick start
From the repo root, start MySQL, then create the tables and demo data (Node 22.12+):
```powershell
docker compose up -d
cd database\mysql
npm.cmd ci
npm.cmd run setup
```
Expected: `Schema applied ... Tables: students, users`, `Demo login ready: username "learner", password "learner123"`,
and `Inserted 3 sample students.` No `.env` file is needed; the defaults match `docker-compose.yml`.

Running `setup` again is safe and **resets the demo**: both tables are recreated, the demo login is `learner` / `learner123`, and the
three sample students are added back. Any students you added are removed.
Passwords are plain text on purpose (demo only). `npm run apply` and `npm run seed` run the two halves separately.

## Using your own MySQL
Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (and `DB_SSL=true` for managed servers) as environment
variables or in a `.env` file copied from `.env.example`. `SEED_PASSWORD` changes the demo login password.

## With only a SQL client
Run `schema.sql`, then `seed.sql`.

## Messages
The scripts explain common mistakes: MySQL not running (`docker compose up -d`), wrong user or password, or a missing database.
