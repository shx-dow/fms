# Implementation status (2026-09)

## Shipped

- Application shell and responsive visual system
- SQLite (better-sqlite3) + Drizzle migrations runtime
- Faculty dashboard, report history, guided editor (teaching, research, duties, outreach)
- HOD/Admin dashboard, review queue, faculty management, audit viewer, settings
- Attachments (local disk), PDF + CSV export, rate limiting, security headers
- Vitest unit coverage: repositories, auth, report-policy, route-guard, validation

## Remaining

- Institutional SSO/session provider (currently cookie + scrypt)
- Object storage for attachments (currently `UPLOAD_DIR` on disk)
- Email/deadline notifications (currently in-app notification feed)
