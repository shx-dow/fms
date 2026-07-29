import { json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { s as sqlite } from "../../../../chunks/local-db.js";
function currentPeriod() {
  return sqlite.prepare("SELECT * FROM reporting_periods WHERE is_open = 1 ORDER BY starts_on DESC LIMIT 1").get();
}
function policyFor(report, now = /* @__PURE__ */ new Date()) {
  const period = currentPeriod();
  const deadline = period ? new Date(period.due_on) : now;
  const reopened = report.reopened_until ? new Date(report.reopened_until) > now : false;
  const open = Boolean(period?.is_open) && now <= deadline;
  const locked = report.status !== "DRAFT" && !reopened;
  return { period, open, locked, canEdit: open && !locked || reopened, deadline };
}
const GET = ({ locals }) => {
  const userId = locals.user?.id ?? "dev-faculty-1";
  let report = sqlite.prepare("SELECT * FROM reports WHERE faculty_id = ? AND period_id = ? LIMIT 1").get(userId, "week-2026-07-27");
  if (!report) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = randomUUID();
    sqlite.prepare("INSERT INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, userId, "week-2026-07-27", "DRAFT", 0, now, now);
    report = sqlite.prepare("SELECT * FROM reports WHERE id = ?").get(id);
  }
  return json({ report, policy: policyFor(report), teaching: sqlite.prepare("SELECT * FROM teaching_records WHERE report_id = ?").all(report.id), research: sqlite.prepare("SELECT * FROM research_records WHERE report_id = ?").all(report.id), duties: sqlite.prepare("SELECT * FROM institutional_duties WHERE report_id = ?").all(report.id), outreach: sqlite.prepare("SELECT * FROM outreach_records WHERE report_id = ?").all(report.id) });
};
const POST = async ({ request, locals }) => {
  const payload = await request.json();
  const userId = locals.user?.id ?? "dev-faculty-1";
  const reportId = String(payload.reportId || randomUUID());
  const now = (/* @__PURE__ */ new Date()).toISOString();
  sqlite.prepare("INSERT OR IGNORE INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(reportId, userId, "week-2026-07-27", "DRAFT", 0, now, now);
  const existing = sqlite.prepare("SELECT status, reopened_until FROM reports WHERE id = ? AND faculty_id = ?").get(reportId, userId);
  if (!existing) return json({ ok: false, error: "Report not found" }, { status: 404 });
  const policy = policyFor(existing, new Date(now));
  if (!policy.canEdit) return json({ ok: false, error: "This report is closed or locked. Request an authorized reopening." }, { status: 423 });
  if (payload.status === "SUBMITTED") {
    const teaching = Array.isArray(payload.teaching) ? payload.teaching : [];
    const errors = [];
    if (!teaching.length) errors.push("Add at least one teaching record.");
    teaching.forEach((row, index) => {
      if (!row.courseCode || !row.courseName) errors.push(`Course ${index + 1}: course code and name are required.`);
      if (Number(row.conducted ?? 0) > Number(row.scheduled ?? 0)) errors.push(`Course ${index + 1}: classes taken cannot exceed classes scheduled.`);
    });
    if (!String(payload.summary ?? "").trim()) errors.push("Add a weekly summary before submitting.");
    if (errors.length) return json({ ok: false, error: "Please complete the submission checklist.", errors }, { status: 400 });
  }
  sqlite.prepare("UPDATE reports SET summary = ?, challenges = ?, next_goals = ?, completion = ?, updated_at = ?, status = ?, submitted_at = CASE WHEN ? = 'SUBMITTED' THEN ? ELSE submitted_at END WHERE id = ? AND faculty_id = ?").run(payload.summary ?? null, payload.challenges ?? null, payload.nextGoals ?? null, Number(payload.completion ?? 0), now, payload.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT", payload.status, now, reportId, userId);
  const aliases = { course_code: "courseCode", course_name: "courseName", program_level: "programLevel", class_type: "classType", missed_action: "missedAction", syllabus_completion: "syllabusCompletion", venue_or_agency: "venueOrAgency", indexing_or_quality: "indexingOrQuality" };
  const replace = (table, rows, columns) => {
    sqlite.prepare(`DELETE FROM ${table} WHERE report_id = ?`).run(reportId);
    for (const row of rows ?? []) {
      const values = columns.map((column) => row[column] ?? row[aliases[column]] ?? null);
      sqlite.prepare(`INSERT INTO ${table} (id, report_id, ${columns.join(", ")}) VALUES (?, ?, ${columns.map(() => "?").join(", ")})`).run(randomUUID(), reportId, ...values);
    }
  };
  replace("teaching_records", payload.teaching, ["course_code", "course_name", "program_level", "class_type", "scheduled", "conducted", "missed", "missed_action", "syllabus_completion"]);
  sqlite.prepare("INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), userId, payload.status === "SUBMITTED" ? "REPORT_SUBMITTED" : "REPORT_SAVED", "REPORT", reportId, now);
  return json({ ok: true, reportId });
};
export {
  GET,
  POST
};
