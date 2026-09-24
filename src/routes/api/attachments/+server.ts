import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { forbidden, requireUser } from '$lib/server/api';
import { canAccessReport, canWriteReport } from '$lib/server/report-policy';
import { MAX_FILE_BYTES, ALLOWED_MIMES } from '$lib/constants';
import { insertAttachment, listAttachments } from '$lib/server/db/repositories/attachments';
import { getOwnerContext } from '$lib/server/db/repositories/reports';

function ensureUploadDir() {
  const uploadDir = env.UPLOAD_DIR || 'data/uploads';
  fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireUser(locals);
  const data = await request.formData();
  const reportId = String(data.get('reportId') ?? '');
  const file = data.get('file');
  if (!reportId || !(file instanceof File))
    return json({ ok: false, error: 'Report and file are required.' }, { status: 400 });
  if (!canWriteReport(user, reportId)) return forbidden('You can only edit your own report while it is open.');
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
    ownerId: user.id,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    storageName: safeName,
    createdAt: new Date().toISOString(),
  });
  return json({ ok: true, id, filename: file.name });
};

export const GET: RequestHandler = ({ url, locals }) => {
  const user = requireUser(locals);
  const reportId = url.searchParams.get('reportId');
  if (!reportId) return json({ ok: false, error: 'reportId is required.' }, { status: 400 });
  if (!canAccessReport(user, reportId)) return forbidden('Report is outside your scope.');
  const owner = getOwnerContext(reportId);
  if (!owner) return json({ ok: false, error: 'Report not found.' }, { status: 404 });
  return json({ attachments: listAttachments(reportId, owner.faculty_id) });
};
