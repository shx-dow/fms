import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export interface ReviewRow {
  id: string;
  report_id: string;
  reviewer_id: string;
  decision: string;
  remarks: string | null;
  created_at: string;
  reviewer_name: string;
}

export function listReviewsForReport(reportId: string, db: Db = defaultDb): ReviewRow[] {
  // SAFETY: The SELECT list matches ReviewRow (review columns plus the joined reviewer name).
  return db.all(sql`
    SELECT rv.*, u.name AS reviewer_name
    FROM reviews rv JOIN users u ON u.id = rv.reviewer_id
    WHERE rv.report_id = ${reportId} ORDER BY rv.created_at DESC
  `) as ReviewRow[];
}

export function insertReview(
  fields: { id: string; reportId: string; reviewerId: string; decision: string; remarks: string | null; createdAt: string },
  db: Db = defaultDb,
) {
  db.run(sql`
    INSERT INTO reviews VALUES (${fields.id}, ${fields.reportId}, ${fields.reviewerId}, ${fields.decision}, ${fields.remarks}, ${fields.createdAt})
  `);
}