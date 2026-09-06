import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export interface AttachmentRow {
  id: string;
  report_id: string;
  owner_id: string;
  filename: string;
  mime_type: string;
  size: number;
  storage_name: string;
  created_at: string;
}

export function insertAttachment(
  fields: {
    id: string;
    reportId: string;
    ownerId: string;
    filename: string;
    mimeType: string;
    size: number;
    storageName: string;
    createdAt: string;
  },
  db: Db = defaultDb,
) {
  db.run(sql`
    INSERT INTO attachments (id, report_id, owner_id, filename, mime_type, size, storage_name, created_at) VALUES (${fields.id}, ${fields.reportId}, ${fields.ownerId}, ${fields.filename}, ${fields.mimeType}, ${fields.size}, ${fields.storageName}, ${fields.createdAt})
  `);
}

export interface AttachmentSummaryRow {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export function listAttachments(reportId: string, ownerId: string, db: Db = defaultDb): AttachmentSummaryRow[] {
  // SAFETY: The SELECT list matches AttachmentSummaryRow (the exported attachment columns).
  return db.all(sql`
    SELECT id, filename, mime_type, size, created_at
    FROM attachments WHERE report_id = ${reportId} AND owner_id = ${ownerId}
    ORDER BY created_at DESC
  `) as AttachmentSummaryRow[];
}

export function getAttachmentById(id: string, db: Db = defaultDb): AttachmentRow | undefined {
  // SAFETY: SELECT * from attachments matches AttachmentRow; columns come from sqlite-schema.ts.
  return db.get(sql`SELECT * FROM attachments WHERE id = ${id}`) as AttachmentRow | undefined;
}

export function deleteAttachment(id: string, db: Db = defaultDb) {
  db.run(sql`DELETE FROM attachments WHERE id = ${id}`);
}
