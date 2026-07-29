import { json } from "@sveltejs/kit";
import { s as sqlite } from "../../../../chunks/local-db.js";
const GET = ({ locals }) => {
  if (!locals.user) return json({ ok: false, error: "Sign in required" }, { status: 401 });
  const events = sqlite.prepare("SELECT action, entity_id, created_at FROM audit_events WHERE actor_id = ? ORDER BY created_at DESC LIMIT 20").all(locals.user.id);
  return json({ notifications: events });
};
export {
  GET
};
