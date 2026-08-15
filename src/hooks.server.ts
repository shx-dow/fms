import type { Handle, HandleServerError } from '@sveltejs/kit';
import { getUserFromSession } from '$lib/server/auth';
import { computeRouteRedirect } from '$lib/server/route-guard';

export const handle: Handle = async ({ event, resolve }) => {
  const start = performance.now();
  event.locals.user = getUserFromSession(event.cookies.get('session')) ?? null;
  const redirectTo = computeRouteRedirect(event.url.pathname, event.locals.user);
  if (redirectTo) {
    const res = new Response(null, {
      status: 303,
      headers: { location: redirectTo },
    });
    logRequest(event, res.status, start);
    return res;
  }
  try {
    const res = await resolve(event);
    applySecurityHeaders(event, res);
    logRequest(event, res.status, start);
    return res;
  } catch (error) {
    logRequest(event, 500, start);
    throw error;
  }
};

function applySecurityHeaders(event: Parameters<Handle>[0]['event'], res: Response) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'no-referrer');
  if (event.url.pathname.startsWith('/api/')) res.headers.set('Cache-Control', 'no-store');
}

function logRequest(event: Parameters<Handle>[0]['event'], status: number, start: number) {
  const path = event.url.pathname;
  if (path.startsWith('/_app') || path === '/api/health') return;
  const actor = event.locals.user ? `${event.locals.user.id}(${event.locals.user.role})` : 'anonymous';
  const ms = Math.round(performance.now() - start);
  console.log(`[req] method=${event.request.method} path=${path} status=${status} ms=${ms} actor=${actor}`);
}

export const handleError: HandleServerError = ({ error, event, status, message }) => {
  console.error(
    `[error] ${status} ${event.request.method} ${event.url.pathname}`,
    message,
    error instanceof Error ? error.stack ?? error.message : error,
  );
  return { message: 'An unexpected error occurred. Please try again later.' };
};
