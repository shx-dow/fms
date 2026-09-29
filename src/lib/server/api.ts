import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import type { RouteId } from '$app/types';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { insertAuditEvent } from './db/repositories/audit';

/** The JSON body an /api route returns when a request is rejected. */
export interface ApiErrorBody {
  readonly ok: false;
  readonly error: string;
  readonly code?: string;
}

const apiFailureSchema = z.object({
  status: z.number().int().min(400).max(599),
  body: z.object({ ok: z.literal(false), error: z.string(), code: z.string().optional() }),
});

/** A request rejection carrying the status and body the client should see.
 *
 * Guards throw this rather than returning a Response, so they can be used
 * mid-expression. It is a plain Error subclass on purpose: a Response thrown
 * from a handler is not a recognised failure, and SvelteKit coalesces it into
 * an opaque 500 that loses both the status and the message. */
export class ApiFailure extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error);
    this.name = 'ApiFailure';
    this.status = status;
    this.body = body;
  }
}

/** Renders a thrown ApiFailure as the JSON response its route owes the client,
 * or null when the thrown value is some other failure.
 *
 * Identifying the failure by parsing rather than by class identity keeps this
 * correct across the module boundary the value is thrown across. */
export function apiErrorResponse(cause: unknown): Response | null {
  const parsed = apiFailureSchema.safeParse(cause);
  if (!parsed.success) return null;
  const { status, body } = parsed.data;
  return json({ message: body.error, ...body }, { status });
}

/** Wraps an /api endpoint so a guard rejection becomes the response it
 * describes, instead of an opaque 500.
 *
 * The conversion has to live inside the endpoint: SvelteKit renders a handler's
 * failure before handle() ever sees it, so no hook can recover the status or
 * the body. Wrapping also keeps the response JSON regardless of what the client
 * sends in Accept, which is not something the framework guarantees. */
export function api<
  TParams extends Record<string, string> = Record<string, string>,
  TRouteId extends RouteId | null = RouteId,
>(handler: RequestHandler<TParams, TRouteId>): RequestHandler<TParams, TRouteId> {
  return async (event) => {
    try {
      return await handler(event);
    } catch (cause) {
      const failure = apiErrorResponse(cause);
      if (failure) return failure;
      throw cause;
    }
  };
}

function apiError(status: number, message: string, code?: string): never {
  const body: ApiErrorBody =
    code === undefined ? { ok: false, error: message } : { ok: false, error: message, code };
  throw new ApiFailure(status, body);
}

export function requireUser(locals: App.Locals) {
  if (!locals.user) apiError(401, 'Unauthorized', 'UNAUTHENTICATED');
  return locals.user;
}

export function requireRole<T extends { role: string }>(user: T, ...roles: string[]): T {
  if (!roles.includes(user.role)) apiError(403, 'Forbidden', 'FORBIDDEN');
  return user;
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

