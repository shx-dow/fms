import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createSession, verifyPassword } from '$lib/server/auth';
import { createRateLimiter } from '$lib/server/rate-limit';
import { findByEmailWithCredentials } from '$lib/server/db/repositories/users';
import type { Actions } from './$types';

const cookieSecure = env.COOKIE_SECURE === 'true' ? true : env.COOKIE_SECURE === 'false' ? false : !dev;

const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

function clientIp(request: Request, fallback: string): string {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() || fallback : fallback;
}

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const ip = clientIp(request, getClientAddress());
    if (!loginLimiter.consume(ip))
      return fail(429, { error: 'Too many sign-in attempts. Please wait a minute and try again.' });

    const data = await request.formData();
    const email = String(data.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(data.get('password') ?? '');
    const row = findByEmailWithCredentials(email);
    if (!row || !verifyPassword(password, row.password_hash)) return fail(400, { error: 'Invalid email or password' });
    loginLimiter.reset(ip);
    const session = createSession(row.id);
    cookies.set('session', session.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure,
      maxAge: 60 * 60 * 8,
    });
    throw redirect(303, row.must_change_password === 1 ? '/change-password' : row.role === 'ADMIN' ? '/admin' : '/dashboard');
  },
};
