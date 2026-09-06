import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { canAccessReport, canWriteReport } from '$lib/server/report-policy';
import { MAX_FILE_BYTES, ALLOWED_MIMES } from '$lib/constants';
import { insertAttachment, listAttachments } from '$lib/server/db/repositories/attachments';

function ensureUploadDir() {
  const uploadDir = env.UPLOAD_DIR || 'data/uploads';
  fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Sign in required' }, { status: 401 });
  const data = await request.formData();
  const reportId = String(data.get('reportId') ?? '');
  const file = data.get('file');
  if (!reportId || !(file instanceof File))
    return json({ ok: false, error: 'Report and file are required.' }, { status: 400 });
  if (!canWriteReport(locals.user, reportId))
    return json({ ok: false, error: 'You can only edit your own report while it is open.' }, { status: 403 });
  if (file.size > MAX_FILE_BYTES)
    return json({ ok: false, error: 'Files must be 10 MB or smaller.' }, { status: 400 });
  // SAFETY: ALLOWED_MIMES is the closed set of accepted upload types; unknown types fall through to 400.
  if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number]))
    return json({ ok: false, error: 'Only PDF, PNG, and JPEG files are accepted.' }, { status: 400 });
  const id = randomUUID();
  const safeName = `${id}-${path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  fs.writeFileSync(path.join(ensureUploadDir(), safeName), Buffer.from(await file.arrayBuffer()));
  insertAttachment({
    id,
    reportId,
    ownerId: locals.user.id,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    storageName: safeName,
    createdAt: new Date().toISOString(),
  });
  return json({ ok: true, id, filename: file.name });
};

export const GET: RequestHandler = ({ url, locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Sign in required' }, { status: 401 });
  const reportId = url.searchParams.get('reportId');
  if (!reportId) return json({ ok: false, error: 'reportId is required.' }, { status: 400 });
  if (!canAccessReport(locals.user, reportId))
    return json({ ok: false, error: 'Report is outside your scope.' }, { status: 403 });
  return json({ attachments: listAttachments(reportId, locals.user.id) });
};
