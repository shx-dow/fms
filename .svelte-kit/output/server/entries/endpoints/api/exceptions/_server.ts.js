import { json } from "@sveltejs/kit";
import { randomUUID } from "node:crypto";
import { s as sqlite } from "../../../../chunks/local-db.js";
import { r as reopenSchema } from "../../../../chunks/validation.js";
const POST = async ({ request, locals }) => {
  if (!locals.user || !["HOD", "ADMIN"].includes(locals.user.role))
    return json({ ok: false, error: "Only HOD or Admin may reopen a report." }, { status: 403 });
  const parsed = reopenSchema.safeParse(await request.json());
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  const { reportId, reason, allowedUntil } = parsed.data;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  sqlite.prepare("UPDATE reports SET reopened_until = ?, reopen_reason = ?, updated_at = ? WHERE id = ?").run(allowedUntil, reason, now, reportId);
  sqlite.prepare("INSERT INTO report_exceptions VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), reportId, locals.user.id, reason, allowedUntil, now);
  sqlite.prepare("INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), locals.user.id, "REPORT_REOPENED", "REPORT", reportId, now);
  return json({ ok: true });
};
export {
  POST
};
