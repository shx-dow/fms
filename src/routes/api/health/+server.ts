import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';

export const GET: RequestHandler = () => {
  try {
    db.get(sql`SELECT 1`);
    return json({ ok: true });
  } catch (error) {
    console.error('[health] database check failed:', error);
    return json({ ok: false, error: 'Database unavailable' }, { status: 503 });
  }
};
