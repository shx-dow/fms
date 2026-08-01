import type { Handle } from '@sveltejs/kit';
import { getUserFromSession } from '$lib/server/auth';
import { computeRouteRedirect } from '$lib/server/route-guard';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = getUserFromSession(event.cookies.get('session')) ?? null;
  const redirectTo = computeRouteRedirect(event.url.pathname, event.locals.user);
  if (redirectTo)
    return new Response(null, {
      status: 303,
      headers: { location: redirectTo },
    });
  return resolve(event);
};
