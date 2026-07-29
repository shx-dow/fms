# Phase 1: Product foundation

Status: in progress

## Product boundary

The Faculty Reporting System digitizes the supplied faculty report as structured, reviewable data. It has three interfaces: Faculty, HOD, and Admin.

## Roles and visibility

| Role | Can view | Can change |
|---|---|---|
| Faculty | Own profile, own drafts, own submissions and review feedback | Own draft reports and supporting documents |
| HOD | Reports and submission status for assigned department(s) | Review remarks, approve, or request changes |
| Admin | Institution-wide users, departments, periods, reports and audit history | Configuration and administrative records |

## Report content map

| Word section | Application model | Cardinality |
|---|---|---|
| Faculty details | FacultyProfile + Report metadata | One per report |
| Teaching & academic delivery | TeachingRecord | Many per report |
| Research & scholarly contributions | ResearchRecord | Many per report |
| Club mentorship & institutional duties | InstitutionalDuty | Many per report |
| Admissions & outreach | OutreachRecord | Many per report |
| Executive summary & dashboard | Derived metrics + report summary | One per report |
| Qualitative appraisal | SelfAppraisal | One per report |
| Reviewer sign-off | Review | Many over report history |

## Lifecycle

```text
DRAFT -> SUBMITTED -> APPROVED
          ^              
          |              
    CHANGES_REQUIRED
          ^
          |
       faculty edits
```

## Initial domain entities

`User`, `FacultyProfile`, `Department`, `ReportingPeriod`, `Report`, `TeachingRecord`, `ResearchRecord`, `InstitutionalDuty`, `OutreachRecord`, `SelfAppraisal`, `Attachment`, `Review`, `Notification`, and `AuditLog`.

## First vertical slice

1. Authenticate a seeded faculty user and HOD.
2. Display the active reporting period.
3. Create one report per faculty member per period.
4. Add multiple teaching and research records.
5. Save a draft, preview it, and submit it.
6. Show the submitted report in the HOD review queue.

## Reporting policy

- Reporting cadence: weekly.
- Submission deadline: Friday at 6:00 PM, using the institution's configured timezone.
- Faculty can edit only draft reports before the deadline.
- Submitted reports are locked for faculty.
- HOD/Admin exception actions require a reason and create an audit event.

## Open implementation defaults

- Reporting periods are weekly in the current product policy; the period model remains configurable for future changes.
- A faculty member has one primary department in V1.
- HOD approval is the only approval step in V1.
- Metrics are derived from structured records wherever possible.
- Empty metric denominators display `N/A`, never a spreadsheet error.
