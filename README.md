# Faculty Reporting System

A faculty weekly activity reporting system with three role-scoped workspaces — Faculty, HOD, and Admin. SvelteKit 5 frontend, SQLite (better-sqlite3 + Drizzle ORM) backend, designed to run on a university intranet.

## Features

- **Faculty** — submit weekly reports (teaching, research, duties, outreach), track status across weeks, view submission history.
- **HOD** — review queue with approve / request-changes / reopen-with-deadline, department dashboard and trends, calendar of submissions.
- **Admin** — department & period management, faculty directory and user administration, audit log, review queue.

## Tech stack

- [SvelteKit 5](https://kit.svelte.dev) with runes (`$state`, `$derived`, `$effect`)
- SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team)
- Zod validation on all API mutations
- scrypt password hashing, cookie-based sessions
- PDF (pdfkit) and CSV export

## Prerequisites

- Node.js 18+ (developed against v24)
- npm

## Development

```bash
npm install
npm run dev          # http://localhost:5173
```

In development the database is created at `data/faculty-reporting.db` and migrations run automatically. To load demo data set `SEED=true` (see Environment variables).

```bash
SEED=true npm run dev
```

### Demo accounts (dev seed only)

| Role    | Email                 | Notes                                    |
| ------- | --------------------- | ---------------------------------------- |
| Admin   | `admin@example.edu`   | Dev-only account, credential in `seed.ts` |
| HOD     | `hod.cse@example.edu` | Dev-only account, credential in `seed.ts` |
| Faculty | `faculty1@example.edu` | Shared faculty password, in `seed.ts`   |

> These accounts are created with hardcoded credential hashes in `src/lib/server/db/seed.ts` and must **never** be used in production. Production databases start empty; see *Fresh production database* below.

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
# Option A — one-time seed, then delete the demo accounts from the Admin UI
SEED=true node scripts/seed.mjs

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
npm run test:unit # vitest unit tests (repositories, auth, policies, route guards)
npm test          # both
```

Tests run against isolated in-memory SQLite databases and do not touch the real data directory.

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
    reports/, reports/current/  # history + guided editor
    calendar/                   # submission calendar
    admin/                      # HOD/Admin dashboard, review queue, faculty, audit, settings
    api/                        # JSON API endpoints (all role-checked server-side)
docs/                           # architecture & production notes (gitignored)
```

## Deployment checklist (intranet)

- [ ] `NODE_ENV=production`, `COOKIE_SECURE=false` if no TLS
- [ ] `SEED` not set (production starts empty)
- [ ] Bootstrap an admin account, remove demo users, change passwords
- [ ] Schedule `npm run backup` on a timer
- [ ] Run behind a reverse proxy (nginx/caddy) if TLS is required
- [ ] Ensure `data/` and `backups/` are writable by the service account and backed up
