import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { statfs } from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { env } from '$env/dynamic/private';

const WARN_MIN_FREE = 1024 * 1024 * 100;
const WARN_FREE_PCT = 0.1;

export const GET: RequestHandler = async () => {
  try {
    db.get(sql`SELECT 1`);
  } catch (error) {
    console.error('[health] database check failed:', error);
    return json({ ok: false, error: 'Database unavailable' }, { status: 503 });
  }

  let disk: { path: string; free: number; total: number; percentFree: number; warn: boolean } | null = null;
  try {
    const dir = path.dirname(path.resolve(env.SQLITE_PATH ?? 'data/faculty-reporting.db'));
    const s = await statfs(dir);
    const free = s.bavail * s.bsize;
    const total = s.blocks * s.bsize;
    disk = {
      path: dir,
      free,
      total,
      percentFree: total ? Math.round((free / total) * 100) : 0,
      warn: free < WARN_MIN_FREE || free / total < WARN_FREE_PCT,
    };
  } catch (error) {
    console.error('[health] disk check failed:', error);
  }

  return json({ ok: true, db: true, disk });
};
