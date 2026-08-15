import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { canWriteReport } from '$lib/server/report-policy';
import { getAttachmentById, deleteAttachment } from '$lib/server/db/repositories/attachments';

const uploadDir = env.UPLOAD_DIR || 'data/uploads';

export const GET: RequestHandler = ({ locals, params }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  const row = getAttachmentById(params.id);
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
  const row = getAttachmentById(params.id);
  if (!row) return json({ ok: false, error: 'Not found' }, { status: 404 });
  if (locals.user.role !== 'ADMIN') {
    if (row.owner_id !== locals.user.id)
      return json({ ok: false, error: 'Forbidden' }, { status: 403 });
    if (!canWriteReport(locals.user, row.report_id))
      return json({ ok: false, error: 'You can only edit your own report while it is open.' }, { status: 403 });
  }
  const filePath = path.join(uploadDir, row.storage_name);
  try {
    fs.unlinkSync(filePath);
  } catch {}
  deleteAttachment(params.id);
  return json({ ok: true });
};
