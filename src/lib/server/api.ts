import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { insertAuditEvent } from './db/repositories/audit';

export function requireUser(locals: App.Locals) {
  if (!locals.user) throw json({ ok: false, error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 });
  return locals.user;
}

export function requireRole<T extends { role: string }>(user: T, ...roles: string[]): T {
  if (!roles.includes(user.role))
    throw json({ ok: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  return user;
}

export function hodScope(user: { role: string; departmentId?: string | null }) {
  if (user.role !== 'HOD') return {};
  if (!user.departmentId) throw json({ ok: false, error: 'HOD has no department.', code: 'NO_DEPARTMENT' }, { status: 403 });
  return { departmentId: user.departmentId };
}

export interface ReviewScope {
  departmentId?: string;
}

export function reviewScope(user: { role: string; departmentId?: string | null }): ReviewScope {
  if (user.role !== 'HOD') return {};
  return { departmentId: user.departmentId ?? '' };
}

export function forbidden(error = 'Forbidden') {
  return json({ ok: false, error }, { status: 403 });
}

export function auditEvent(actorId: string, action: string, entityType: string, entityId: string) {
  insertAuditEvent({
    id: randomUUID(),
    actorId,
    action,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
  });
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw json({ ok: false, error: 'Invalid JSON.', code: 'INVALID_JSON' }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw json({ ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') }, { status: 400 });
  return parsed.data;
}
