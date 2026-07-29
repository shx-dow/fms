import { fail, redirect } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import { createSession, verifyPassword } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = { default: async ({ request, cookies }) => { const data = await request.formData(); const email = String(data.get('email') ?? '').trim().toLowerCase(); const password = String(data.get('password') ?? ''); const row = sqlite.prepare('SELECT u.id, c.password_hash FROM users u JOIN credentials c ON c.user_id = u.id WHERE lower(u.email) = ? AND u.is_active = 1').get(email) as { id: string; password_hash: string } | undefined; if (!row || !verifyPassword(password, row.password_hash)) return fail(400, { error: 'Invalid email or password' }); const session = createSession(row.id); cookies.set('session', session.id, { path: '/', httpOnly: true, sameSite: 'lax', secure: false, maxAge: 60 * 60 * 8 }); throw redirect(303, '/dashboard'); } };
