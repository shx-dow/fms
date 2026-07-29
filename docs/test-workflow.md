# Local end-to-end test workflow

## Start clean

```bash
npm install
npm run prepare
npm run db:reset-local
npm run dev
```

Open `http://localhost:5173/login`.

## Faculty path

1. Sign in with `ananya.rao@example.edu` / `faculty123`.
2. Open the current weekly report.
3. Add a course and enter scheduled/conducted/missed values.
4. Verify conducted classes cannot exceed scheduled classes at submission.
5. Enter the weekly summary.
6. Save, reload the browser, and verify the draft remains.
7. Export the report as CSV.
8. Submit the report.
9. Verify the status becomes submitted and the API rejects further edits.

## HOD path

1. Sign out.
2. Sign in with `hod.cse@example.edu` / `hod123`.
3. Open the review queue.
4. Select the submitted report.
5. Add remarks and approve or request changes.
6. Reload and verify the review decision remains.
7. Expand the exception section.
8. Enter a reason and expiry, then reopen the report.

## Admin/audit path

1. Sign out.
2. Sign in with `admin@example.edu` / `admin123`.
3. Open Audit history.
4. Verify save, submit, review, and reopen actions are listed.
5. Open Reporting periods and confirm the Friday 6:00 PM deadline policy.

## Policy checks

- Faculty cannot access `/admin`.
- Signed-out users are redirected to `/login`.
- A submitted report cannot be edited without an exception.
- A report outside its allowed period is rejected by the server.
- Only HOD/Admin can approve, request changes, or reopen reports.
- CSV export is available from the current report editor.
