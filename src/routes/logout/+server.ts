import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ cookies }) => { deleteSession(cookies.get('session')); cookies.delete('session', { path: '/' }); throw redirect(303, '/login'); };
