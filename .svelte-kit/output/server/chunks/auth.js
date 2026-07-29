import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";
import { s as sqlite } from "./local-db.js";
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
function createSession(userId) {
  const id = randomUUID();
  const expires = new Date(Date.now() + 1e3 * 60 * 60 * 8).toISOString();
  sqlite.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(id, userId, expires);
  return { id, expires };
}
function getUserFromSession(sessionId) {
  if (!sessionId) return null;
  const row = sqlite.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ? AND u.is_active = 1"
  ).get(sessionId, (/* @__PURE__ */ new Date()).toISOString());
  return row ? {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    departmentId: row.department_id
  } : null;
}
function deleteSession(sessionId) {
  if (sessionId) sqlite.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}
export {
  createSession as c,
  deleteSession as d,
  getUserFromSession as g,
  hashPassword as h,
  verifyPassword as v
};
