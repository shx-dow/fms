import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

const uploadDir = env.UPLOAD_DIR || 'data/uploads';

export const GET: RequestHandler = ({ locals, params }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  const row = sqlite.prepare('SELECT * FROM attachments WHERE id = ?').get(params.id) as
    | {
        id: string;
        report_id: string;
        owner_id: string;
        filename: string;
        mime_type: string;
        storage_name: string;
      }
    | undefined;
  if (!row) return new Response('Not found', { status: 404 });
  const allowed =
    locals.user.role === 'ADMIN' ||
    locals.user.role === 'HOD' ||
    (locals.user.role === 'FACULTY' && row.owner_id === locals.user.id);
  if (!allowed) return new Response('Forbidden', { status: 403 });
  const filePath = path.join(uploadDir, row.storage_name);
  if (!fs.existsSync(filePath)) return new Response('File not found on disk', { status: 404 });
  return new Response(fs.readFileSync(filePath), {
    headers: {
      'content-type': row.mime_type,
      'content-disposition': `attachment; filename="${row.filename}"`,
    },
  });
};

export const DELETE: RequestHandler = ({ locals, params }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const row = sqlite.prepare('SELECT * FROM attachments WHERE id = ?').get(params.id) as
    { owner_id: string; storage_name: string } | undefined;
  if (!row) return json({ ok: false, error: 'Not found' }, { status: 404 });
  if (locals.user.role !== 'ADMIN' && row.owner_id !== locals.user.id)
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const filePath = path.join(uploadDir, row.storage_name);
  try {
    fs.unlinkSync(filePath);
  } catch {}
  sqlite.prepare('DELETE FROM attachments WHERE id = ?').run(params.id);
  return json({ ok: true });
};
