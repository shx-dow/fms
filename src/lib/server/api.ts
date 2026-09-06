import { json } from '@sveltejs/kit';
import { z } from 'zod';

export function requireUser(locals: App.Locals) {
  if (!locals.user) throw json({ ok: false, error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 });
  return locals.user;
}

export function requireRole(user: { role: string }, ...roles: string[]) {
  if (!roles.includes(user.role))
    throw json({ ok: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  return user;
}

export function hodScope(user: { role: string; departmentId?: string | null }) {
  if (user.role !== 'HOD') return {};
  if (!user.departmentId) throw json({ ok: false, error: 'HOD has no department.', code: 'NO_DEPARTMENT' }, { status: 403 });
  return { departmentId: user.departmentId };
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
