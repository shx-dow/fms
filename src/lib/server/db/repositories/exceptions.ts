import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export function reopenReport(
  fields: { reportId: string; allowedUntil: string; reason: string; updatedAt: string },
  db: Db = defaultDb,
) {
  db.run(sql`
    UPDATE reports SET reopened_until = ${fields.allowedUntil}, reopen_reason = ${fields.reason}, updated_at = ${fields.updatedAt}
    WHERE id = ${fields.reportId}
  `);
}

export function insertException(
  fields: { id: string; reportId: string; actorId: string; reason: string; allowedUntil: string; createdAt: string },
  db: Db = defaultDb,
) {
  db.run(sql`
    INSERT INTO report_exceptions VALUES (${fields.id}, ${fields.reportId}, ${fields.actorId}, ${fields.reason}, ${fields.allowedUntil}, ${fields.createdAt})
  `);
}
