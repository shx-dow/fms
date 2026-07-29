import { json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { s as sqlite } from "../../../../chunks/local-db.js";
const GET = ({ locals }) => {
  if (!locals.user || !["HOD", "ADMIN"].includes(locals.user.role)) return json({ ok: false, error: "Forbidden" }, { status: 403 });
  const rows = sqlite.prepare(`SELECT r.id, r.status, r.updated_at, r.completion, u.name AS faculty_name, p.label AS period_label FROM reports r JOIN users u ON u.id = r.faculty_id JOIN reporting_periods p ON p.id = r.period_id WHERE r.status IN ('SUBMITTED','CHANGES_REQUIRED','APPROVED') ORDER BY r.updated_at DESC`).all();
  return json({ reports: rows });
};
const POST = async ({ request, locals }) => {
  if (!locals.user || !["HOD", "ADMIN"].includes(locals.user.role)) return json({ ok: false, error: "Only HOD or Admin may review reports." }, { status: 403 });
  const { reportId, decision, remarks } = await request.json();
  if (!reportId || !["APPROVED", "CHANGES_REQUIRED"].includes(decision)) return json({ ok: false, error: "Invalid review decision" }, { status: 400 });
  const reviewerId = locals.user?.id ?? "dev-hod-1";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  sqlite.prepare("UPDATE reports SET status = ?, updated_at = ? WHERE id = ?").run(decision, now, reportId);
  sqlite.prepare("INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), reportId, reviewerId, decision, remarks ?? null, now);
  sqlite.prepare("INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), reviewerId, decision, "REPORT", reportId, now);
  return json({ ok: true });
};
export {
  GET,
  POST
};
