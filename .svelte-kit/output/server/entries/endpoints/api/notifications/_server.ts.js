import { json } from "@sveltejs/kit";
import { s as sqlite } from "../../../../chunks/local-db.js";
const GET = ({ locals }) => {
  if (!locals.user) return json({ ok: false, error: "Sign in required" }, { status: 401 });
  const { id, role, departmentId } = locals.user;
  let whereClause;
  let params;
  if (role === "ADMIN") {
    whereClause = "1=1";
    params = [];
  } else if (role === "HOD") {
    whereClause = "a.actor_id = ? OR (a.entity_type = 'REPORT' AND a.entity_id IN (SELECT r.id FROM reports r JOIN users u ON u.id = r.faculty_id WHERE u.department_id = ?))";
    params = [id, departmentId ?? ""];
  } else {
    whereClause = "a.actor_id = ? OR (a.entity_type = 'REPORT' AND a.entity_id IN (SELECT id FROM reports WHERE faculty_id = ?))";
    params = [id, id];
  }
  const events = sqlite.prepare(`SELECT a.action, a.entity_id, a.created_at, u.name AS actor_name FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id WHERE ${whereClause} ORDER BY a.created_at DESC LIMIT 30`).all(...params);
  return json({ notifications: events });
};
export {
  GET
};
