# Faculty Reporting System

A faculty weekly activity reporting system with three role-scoped workspaces — Faculty, HOD, and Admin (director or dean). SvelteKit 5 frontend, SQLite (better-sqlite3 + Drizzle ORM) backend, designed to run on a university intranet.

## Features

- **Faculty** — submit weekly reports (teaching, research, duties, outreach), track status across weeks, view submission history.
- **HOD** — the same report view as faculty, because a department head teaches too, plus a review queue with approve / request-changes / reopen-with-deadline, department dashboard and trends, calendar of submissions.
- **Admin** — department & period management, faculty directory and user administration, audit log, and read-only oversight of submissions. Does not review reports.

### Who files, who reviews

Everyone who teaches files a report. Only Admin (director or dean) does not.

| Role    | Files a report | Reviews                                        |
| ------- | -------------- | ---------------------------------------------- |
| Faculty | yes            | nothing                                        |
| HOD     | yes            | every report, including their own              |
| Admin   | no             | nothing — keeps the system running             |

Two rules, both stated once in `src/lib/domain.ts`:

- `REPORTER_ROLES` — who files a report. Everyone who teaches, so an HOD files
  one too. Only Admin does not.
- `REVIEWER_ROLES` — who reviews. Reviewing is a teaching-side job, so it belongs
  to the HOD alone. An HOD may review any report, including their own.

Admin stays out of the reporting flow: no review queue, no approve or reopen
anywhere, and no listing in anyone's queue. Admin reads a report only to
diagnose a problem, and otherwise manages periods, accounts and the audit log.

An HOD may read only reports in their own department, but the review queue is
institute-wide. Chasing missing forms stays a department job.

## Tech stack

- [SvelteKit 5](https://kit.svelte.dev) with runes (`$state`, `$derived`, `$effect`)
- SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team)
- Zod validation on all API mutations
- scrypt password hashing, cookie-based sessions
- PDF (pdfkit) and CSV export

## Prerequisites

- Node.js 20+ (`engines` enforces this; developed against v24)
- npm

## Development

```bash
npm install
npm run dev          # http://localhost:5173
```

The development server binds to `0.0.0.0`, so it can be reached by other devices on the same network at `http://<computer-ip>:5173`. Set `HOST` and `PORT` in `.env` to override the defaults. On WSL2, use the Windows host's LAN IPv4 address; the WSL virtual address may not be reachable from phones or other computers without Windows port forwarding.

In development the database is created at `data/faculty-reporting.db` and migrations run automatically. To load demo data set `SEED=true` (see Environment variables). Copy `.env.example` to `.env` for a starting point.

Seeding is refused when `NODE_ENV=production` unless `ALLOW_PRODUCTION_SEED=1` is set explicitly, because the demo accounts ship with known credentials.

```bash
SEED=true npm run dev
```

### Demo accounts (dev seed only)

| Role    | Email                  | Notes                        |
| ------- | ---------------------- | ---------------------------- |
| Admin   | `admin@example.edu`    | Dev-only account             |
| HOD     | `hod.cse@example.edu`  | Dev-only account             |
| Faculty | `faculty1@example.edu` | Dev-only account             |
| Faculty | `faculty2@example.edu` | Dev-only account             |
| Faculty | `faculty3@example.edu` | Dev-only account             |

> These accounts must **never** be used in production. Production databases start empty; see *Fresh production database* below.

The seed stores fixed scrypt hashes, and their plaintext is not published, so a
freshly seeded database has nobody who can log in. Set `DEMO_PASSWORD` to choose
a password for all five demo accounts, then seed:

```bash
DEMO_PASSWORD='choose-a-dev-password' npm run seed
```

Without `DEMO_PASSWORD` the seed falls back to the checked-in hashes, so nobody
can sign in as a demo account. The value is never written to the repository.

The seed dates its periods from the current week (previous, current, next) and
leaves the current week open, so the demo data is always in date.

## Production build

```bash
npm install
npm run build        # outputs to build/ (adapter-node)
npm start            # runs build/index.js
```

By default the server listens on `PORT` (3000) and binds all interfaces. Set `HOST` to bind a specific address if needed.

### Fresh production database

A new database has **no users**. To bootstrap the first admin:

```bash
# Option A — one-time seed, then delete the demo accounts from the Admin UI.
# With NODE_ENV=production this refuses to run unless ALLOW_PRODUCTION_SEED=1.
ALLOW_PRODUCTION_SEED=1 node scripts/seed.mjs

# Option B — create a database, then create the first admin via the Admin → Faculty page
npm run db:migrate    # creates schema at SQLITE_PATH
npm start             # login is impossible until a user exists, so use Option A for bootstrap
```

After seeding, immediately change the demo passwords or remove the demo users through **Admin → Faculty**.

## Environment variables

| Variable          | Default                  | Description                                                        |
| ----------------- | ------------------------ | ------------------------------------------------------------------ |
| `SQLITE_PATH`     | `data/faculty-reporting.db` | Path to the SQLite database file.                                 |
| `UPLOAD_DIR`      | `data/uploads`           | Directory for uploaded attachments (PDF/PNG/JPEG).                 |
| `PORT`            | `3000`                   | HTTP port (adapter-node).                                          |
| `HOST`            | `0.0.0.0`                | Bind address (adapter-node).                                       |
| `COOKIE_SECURE`   | *(derived)*              | `true`/`false` for the session cookie. Set `false` when serving over plain HTTP (e.g. intranet without TLS). Defaults to `!dev`. |
| `SEED`            | *(unset)*                | `true` seeds demo data on startup. Leave unset in production.      |
| `MIGRATIONS_DIR`  | `drizzle`                | Folder containing SQL migration files.                             |
| `BACKUP_DIR`      | `backups`                | Backup output folder.                                              |
| `BACKUP_RETENTION`| `14`                     | Number of backups to keep.                                         |
| `NODE_ENV`        | *(dev/production)*       | Set to `production` when deploying.                                |
| `CSRF_TRUSTED_ORIGINS` | *(none)*           | Comma-separated extra origins allowed to POST. Use this instead of disabling the origin check when Windows/WSL forwarding rewrites the Host header. |
| `ALLOW_PRODUCTION_SEED` | *(unset)*         | Must be `1` to seed a database while `NODE_ENV=production`. Seeding is refused otherwise. |
| `DEMO_PASSWORD`   | *(unset)*                | Password for the five demo accounts when seeding. Dev only. |

### Reporting weeks

Exactly one period is open at a time. The app opens the current week
automatically: when the open period has passed its `ends_on` date, the next
request closes it and opens the current week (Monday to Friday, due Friday
18:00 IST). A period that has not ended is left alone, so an admin can still
move a period's dates or pre-open a coming week from **Admin → Periods** and
have that stand. Without this the first week would stay open forever and
nobody could submit again.

### Review queue exports

The review queue filters in the URL, so a filtered view can be bookmarked or
shared, and the **Download CSV** button always carries the filters on screen.
The table and the download are produced by the same query, so they cannot
disagree.

| Query string        | Effect                                        |
| ------------------- | --------------------------------------------- |
| `?q=`               | match name or email                           |
| `?status=`          | `SUBMITTED`, `CHANGES_REQUIRED` or `APPROVED`  |
| `?period=`          | one reporting week                            |
| `?format=csv`       | download the filtered rows                    |

The **Not submitted** list under the queue shows who has not filed for a week and
downloads the same way:

```
/api/reports/missing?period=<week-id>&format=csv
```

Omitting `period` uses the open week. Columns are name, email, role, department
and week.

### Intranet / plain HTTP note

If the app is served over `http://` (no TLS), browsers will not send a secure cookie. Set `COOKIE_SECURE=false` in the environment so login works. If you can terminate TLS (reverse proxy with a certificate), leave it unset so cookies are marked secure.

## Database operations

```bash
# Run pending migrations against SQLITE_PATH
npm run db:migrate

# Generate a new migration from schema changes
npm run db:generate

# Reset the local dev database (deletes the file)
npm run db:reset-local

# Seed dev data (migrations + demo users/periods/reports)
npm run seed
```

## Backups

```bash
npm run backup                # VACUUM INTO backups/<timestamp>/db.sqlite (+ uploads)
npm run restore -- --latest   # restore most recent backup (prompts for confirmation)
npm run restore -- <path> --yes  # restore a specific backup, no prompt
```

Backups include both the database and the uploads directory. Set `BACKUP_DIR` and `BACKUP_RETENTION` to control location and retention. Consider scheduling `npm run backup` via cron/systemd-timer.

## Tests

```bash
npm run check     # svelte-check (types + diagnostics)
npm run test:unit # vitest unit tests (repositories, auth, policies, route guards, API access matrix, PDF export)
npm test          # both
```

Tests run against isolated in-memory SQLite databases and do not touch the real data directory.

Live end-to-end smoke against a running dev server (needs seeded users):

```bash
SEED=true npm run dev  # in one terminal, then:
FACULTY_PASSWORD=... HOD_PASSWORD=... npm run smoke
```

## Project structure

```
src/
  lib/domain.ts                 # shared domain types & status labels
  lib/week-label.ts             # "Week N of Month (Mon - Fri)" computation
  lib/server/
    auth.ts                     # scrypt hashing, session create/verify/delete
    report-policy.ts            # edit/lock rules, ownership scope
    route-guard.ts              # role-based redirect matrix
    validation.ts               # Zod schemas for every mutation
    local-db.ts                 # SQLite + migrations + optional seed
    db/seed.ts                  # demo users/periods/reports (dev only)
    db/repositories/            # typed SQL queries behind function APIs
  routes/
    dashboard/                  # weekly grid + summary
    reports/, reports/current/  # history + guided editor + print view
    logout/                     # session destroy
    login/                      # login form + rate-limited action
    admin/                      # HOD/Admin dashboard, review queue, faculty, audit, settings
    api/                        # JSON API: reports, research, duties, outreach, reviews, exceptions,
                                # attachments, periods, departments, users, dashboard/*, audit,
                                # notifications, health, me/profile, me/password
docs/                           # architecture & status notes (tracked)
```

## Deployment checklist (intranet)

- [ ] `NODE_ENV=production`, `COOKIE_SECURE=false` if no TLS
- [ ] `SEED` not set (production starts empty); `ALLOW_PRODUCTION_SEED` not left at `1`
- [ ] `CSRF_TRUSTED_ORIGINS` set if the app is reached by more than one hostname
- [ ] Bootstrap an admin account, remove demo users, change passwords
- [ ] Schedule `npm run backup` on a timer
- [ ] Run behind a reverse proxy (nginx/caddy) if TLS is required
- [ ] Ensure `data/` and `backups/` are writable by the service account and backed up

### Cross-platform network access

The application uses the same network settings on Linux, WSL, and Windows:

```env
HOST=0.0.0.0
PORT=3000
```

Use `PORT=5173` while running `npm run dev`, or `PORT=3000` for the production server started with `npm start`. Access it from another device using the host computer's normal Wi-Fi/Ethernet IPv4 address, not `localhost` and usually not a WSL/Docker/VPN adapter address. The operating-system firewall must allow the selected TCP port.
