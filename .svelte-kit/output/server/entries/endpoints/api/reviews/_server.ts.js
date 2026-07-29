import { json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { s as sqlite } from "../../../../chunks/local-db.js";
const GET = ({ locals }) => {
  if (!locals.user || !["HOD", "ADMIN"].includes(locals.user.role)) return json({ ok: false, error: "Forbidden" }, { status: 403 });
  const fmt = locals.url?.searchParams.get("format");
  const scope = locals.user.role === "HOD" ? " AND u.department_id = ?" : "";
  const rows = sqlite.prepare(`SELECT r.id, r.status, r.updated_at, r.completion, r.submitted_at, u.name AS faculty_name, u.email AS faculty_email, p.label AS period_label FROM reports r JOIN users u ON u.id = r.faculty_id JOIN reporting_periods p ON p.id = r.period_id WHERE r.status IN ('SUBMITTED','CHANGES_REQUIRED','APPROVED')${scope} ORDER BY r.updated_at DESC`).all(...locals.user.role === "HOD" ? [locals.user.departmentId ?? ""] : []);
  if (fmt === "csv") {
    const header = "Faculty,Email,Period,Status,Completion,Submitted At,Last Updated\n";
    const body = rows.map((r) => `"${r.faculty_name}","${r.faculty_email}","${r.period_label}","${r.status}",${r.completion},${r.submitted_at ? new Date(r.submitted_at).toISOString() : ""},${new Date(r.updated_at).toISOString()}`).join("\n");
    return new Response(header + body, { headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="review-queue.csv"' } });
  }
  return json({ reports: rows });
};
const POST = async ({ request, locals }) => {
  if (!locals.user || !["HOD", "ADMIN"].includes(locals.user.role)) return json({ ok: false, error: "Only HOD or Admin may review reports." }, { status: 403 });
  const { reportId, decision, remarks } = await request.json();
  if (!reportId || !["APPROVED", "CHANGES_REQUIRED"].includes(decision)) return json({ ok: false, error: "Invalid review decision" }, { status: 400 });
  const reviewerId = locals.user?.id ?? "dev-hod-1";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const allowed = sqlite.prepare(`SELECT r.id FROM reports r JOIN users u ON u.id = r.faculty_id WHERE r.id = ?${locals.user.role === "HOD" ? " AND u.department_id = ?" : ""}`).get(...locals.user.role === "HOD" ? [reportId, "cse"] : [reportId]);
  if (!allowed) return json({ ok: false, error: "Report is outside your review scope." }, { status: 403 });
  sqlite.prepare("UPDATE reports SET status = ?, updated_at = ? WHERE id = ?").run(decision, now, reportId);
  sqlite.prepare("INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID().toString(), reportId, reviewerId, decision, remarks ?? null, now);
  sqlite.prepare("INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID().toString(), reviewerId, decision, "REPORT", reportId, now);
  return json({ ok: true });
};
export {
  GET,
  POST
};
