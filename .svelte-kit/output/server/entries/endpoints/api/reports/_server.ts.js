import { json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { s as sqlite } from "../../../../chunks/local-db.js";
import { a as reportSaveSchema } from "../../../../chunks/validation.js";
function currentPeriod() {
  return sqlite.prepare("SELECT * FROM reporting_periods WHERE is_open = 1 ORDER BY starts_on DESC LIMIT 1").get();
}
function policyFor(report, now = /* @__PURE__ */ new Date()) {
  const period = currentPeriod();
  const deadline = period ? new Date(period.due_on) : now;
  const reopened = report.reopened_until ? new Date(report.reopened_until) > now : false;
  const open = Boolean(period?.is_open) && now <= deadline;
  const locked = !["DRAFT", "CHANGES_REQUIRED"].includes(report.status) && !reopened;
  return {
    period,
    open,
    locked,
    canEdit: open && !locked || reopened,
    deadline
  };
}
const GET = ({ locals }) => {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const userId = locals.user.id;
  const period = currentPeriod();
  if (!period) return json({ error: "No open reporting period." }, { status: 409 });
  let report = sqlite.prepare("SELECT * FROM reports WHERE faculty_id = ? AND period_id = ? LIMIT 1").get(userId, period.id);
  if (!report) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = randomUUID();
    sqlite.prepare(
      "INSERT INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, userId, period.id, "DRAFT", 0, now, now);
    report = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(id);
  }
  const history = sqlite.prepare(
    "SELECT r.id, r.status, r.completion, r.updated_at, r.submitted_at, p.label AS period_label, p.starts_on, p.ends_on, p.due_on FROM reports r JOIN reporting_periods p ON p.id = r.period_id WHERE r.faculty_id = ? ORDER BY p.starts_on DESC"
  ).all(userId);
  return json({
    report,
    reports: history,
    policy: policyFor(report),
    teaching: sqlite.prepare("SELECT * FROM teaching_records WHERE report_id = ?").all(report.id),
    research: sqlite.prepare("SELECT * FROM research_records WHERE report_id = ?").all(report.id),
    duties: sqlite.prepare("SELECT * FROM institutional_duties WHERE report_id = ?").all(report.id),
    outreach: sqlite.prepare("SELECT * FROM outreach_records WHERE report_id = ?").all(report.id)
  });
};
const POST = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const userId = locals.user.id;
  const period = currentPeriod();
  if (!period) return json({ ok: false, error: "No open reporting period." }, { status: 409 });
  const parsed = reportSaveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }
  const payload = parsed.data;
  const reportId = String(payload.reportId || randomUUID());
  const now = (/* @__PURE__ */ new Date()).toISOString();
  sqlite.prepare(
    "INSERT OR IGNORE INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(reportId, userId, period.id, "DRAFT", 0, now, now);
  const existing = sqlite.prepare("SELECT status, reopened_until FROM reports WHERE id = ? AND faculty_id = ?").get(reportId, userId);
  if (!existing) return json({ ok: false, error: "Report not found" }, { status: 404 });
  const policy = policyFor(existing, new Date(now));
  if (!policy.canEdit)
    return json(
      { ok: false, error: "This report is closed or locked. Request an authorized reopening." },
      { status: 423 }
    );
  const updates = sqlite.transaction(() => {
    sqlite.prepare(
      "UPDATE reports SET summary = ?, challenges = ?, next_goals = ?, completion = ?, updated_at = ?, status = ?, submitted_at = CASE WHEN ? = 'SUBMITTED' THEN ? ELSE submitted_at END WHERE id = ? AND faculty_id = ?"
    ).run(
      payload.summary ?? null,
      payload.challenges ?? null,
      payload.nextGoals ?? null,
      Number(payload.completion ?? 0),
      now,
      payload.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT",
      payload.status,
      now,
      reportId,
      userId
    );
    sqlite.prepare("DELETE FROM teaching_records WHERE report_id = ?").run(reportId);
    for (const row of payload.teaching ?? []) {
      sqlite.prepare(
        "INSERT INTO teaching_records (id, report_id, course_code, course_name, program_level, class_type, scheduled, conducted, missed, missed_action, syllabus_completion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        randomUUID(),
        reportId,
        row.courseCode,
        row.courseName,
        row.programLevel,
        row.classType,
        Number(row.scheduled ?? 0),
        Number(row.conducted ?? 0),
        Number(row.missed ?? 0),
        row.missedAction ?? null,
        row.syllabusCompletion ?? null
      );
    }
    sqlite.prepare("INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)").run(
      randomUUID(),
      userId,
      payload.status === "SUBMITTED" ? "REPORT_SUBMITTED" : "REPORT_SAVED",
      "REPORT",
      reportId,
      now
    );
  });
  updates();
  return json({ ok: true, reportId });
};
export {
  GET,
  POST
};
