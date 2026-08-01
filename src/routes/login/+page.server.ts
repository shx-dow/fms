import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createSession, verifyPassword } from '$lib/server/auth';
import { findByEmailWithCredentials } from '$lib/server/db/repositories/users';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(data.get('password') ?? '');
    const row = findByEmailWithCredentials(email);
    if (!row || !verifyPassword(password, row.password_hash)) return fail(400, { error: 'Invalid email or password' });
    const session = createSession(row.id);
    cookies.set('session', session.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !dev,
      maxAge: 60 * 60 * 8,
    });
    throw redirect(303, row.role === 'ADMIN' ? '/admin' : '/dashboard');
  },
};
