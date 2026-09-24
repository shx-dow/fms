import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { forbidden, requireUser } from '$lib/server/api';
import { canAccessReport, canWriteReport } from '$lib/server/report-policy';
import { getAttachmentById, deleteAttachment } from '$lib/server/db/repositories/attachments';

const uploadDir = env.UPLOAD_DIR || 'data/uploads';

export const GET: RequestHandler = ({ locals, params }) => {
  const user = requireUser(locals);
  const row = getAttachmentById(params.id);
  if (!row) return new Response('Not found', { status: 404 });
  if (!canAccessReport(user, row.report_id)) return forbidden('Report is outside your scope.');
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
  const user = requireUser(locals);
  const row = getAttachmentById(params.id);
  if (!row) return json({ ok: false, error: 'Not found' }, { status: 404 });
  if (user.role !== 'ADMIN') {
    if (row.owner_id !== user.id)
      return json({ ok: false, error: 'Forbidden' }, { status: 403 });
    if (!canWriteReport(user, row.report_id))
      return json({ ok: false, error: 'You can only edit your own report while it is open.' }, { status: 403 });
  }
  const filePath = path.join(uploadDir, row.storage_name);
  try {
    fs.unlinkSync(filePath);
  } catch {}
  deleteAttachment(params.id);
  return json({ ok: true });
};
