# Faculty Reporting System architecture

## Product shape

One application with three role-scoped workspaces:

```text
SvelteKit
├── Faculty workspace: dashboard, report editor, history, profile
├── HOD workspace: department dashboard, review queue, report review
└── Admin workspace: users, departments, periods, exports, audit
```

## Core request flow

```text
Browser form
  → SvelteKit form action
  → Zod/domain validation
  → permission check
  → service function
  → SQLite locally / PostgreSQL in production
  → audit event
```

The browser never decides whether a user may read or change a report. Server-side services enforce ownership and department scope.

## Domain boundaries

- Identity: users, roles, departments, sessions
- Periods: reporting windows, deadlines, open/closed state
- Reports: lifecycle, narrative fields, completion and submission timestamps
- Activity records: teaching, research, duties, outreach
- Evidence: attachments linked to a report or activity record
- Review: reviewer decisions, remarks and history
- Operations: notifications, audit events, exports

## Local-first persistence

Development uses SQLite at `data/faculty-reporting.db`. The schema is deliberately relational and maps cleanly to PostgreSQL. Production can switch through a repository adapter without changing page components.

## Reporting rules

- Reporting periods are weekly.
- Each period closes every Friday at 6:00 PM in the institution's configured timezone.
- Faculty may create and edit a draft until the period closes.
- A submitted report is locked and cannot be edited by the faculty member.
- HODs and Admins may reopen a submitted or closed report only through an explicit exception action.
- Every reopen/extend action must record the authorizer, reason, timestamp, and affected report.

## Simplified lifecycle

`DRAFT → SUBMITTED → APPROVED` or `CHANGES_REQUIRED → SUBMITTED`.

Submission is only available while the period is open. A report returned with `CHANGES_REQUIRED` may be edited only if the reporting period remains open or an authorized HOD/Admin reopens it.

## UX rule

Faculty complete one guided report. Dashboards summarize the same records used in the report. HODs review exceptions and decisions, rather than navigating through administrative configuration.
