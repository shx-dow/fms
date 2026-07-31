import type { Handle } from '@sveltejs/kit';
import { getUserFromSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = getUserFromSession(event.cookies.get('session')) ?? null;
  const path = event.url.pathname;
  const publicPath =
    path === '/login' || path.startsWith('/api/auth') || path === '/logout' || path.startsWith('/_app');
  if (!event.locals.user && !publicPath)
    return new Response(null, {
      status: 303,
      headers: { location: `/login?next=${encodeURIComponent(path)}` },
    });
  if (event.locals.user?.role === 'FACULTY' && path.startsWith('/admin'))
    return new Response(null, {
      status: 303,
      headers: { location: '/dashboard' },
    });
  if (event.locals.user && path === '/login')
    return new Response(null, {
      status: 303,
      headers: { location: event.locals.user.role === 'ADMIN' ? '/admin' : '/dashboard' },
    });
  return resolve(event);
};
