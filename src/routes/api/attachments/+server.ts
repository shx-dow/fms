import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';
import { canAccessReport } from '$lib/server/report-policy';

const uploadDir = env.UPLOAD_DIR || 'data/uploads';
fs.mkdirSync(uploadDir, { recursive: true });

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Sign in required' }, { status: 401 });
  const data = await request.formData();
  const reportId = String(data.get('reportId') ?? '');
  const file = data.get('file');
  if (!reportId || !(file instanceof File))
    return json({ ok: false, error: 'Report and file are required.' }, { status: 400 });
  if (!canAccessReport(locals.user, reportId))
    return json({ ok: false, error: 'Report is outside your scope.' }, { status: 403 });
  if (file.size > 10 * 1024 * 1024)
    return json({ ok: false, error: 'Files must be 10 MB or smaller.' }, { status: 400 });
  const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
  if (!allowed.includes(file.type))
    return json({ ok: false, error: 'Only PDF, PNG, and JPEG files are accepted.' }, { status: 400 });
  const id = randomUUID();
  const safeName = `${id}-${path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  fs.writeFileSync(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));
  sqlite.exec(
    'CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, owner_id TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, storage_name TEXT NOT NULL, created_at TEXT NOT NULL)',
  );
  sqlite
    .prepare('INSERT INTO attachments VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, reportId, locals.user.id, file.name, file.type, file.size, safeName, new Date().toISOString());
  return json({ ok: true, id, filename: file.name });
};

export const GET: RequestHandler = ({ url, locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Sign in required' }, { status: 401 });
  const reportId = url.searchParams.get('reportId');
  sqlite.exec(
    'CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, owner_id TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, storage_name TEXT NOT NULL, created_at TEXT NOT NULL)',
  );
  return json({
    attachments: sqlite
      .prepare(
        'SELECT id, filename, mime_type, size, created_at FROM attachments WHERE report_id = ? AND owner_id = ? ORDER BY created_at DESC',
      )
      .all(reportId, locals.user.id),
  });
};
