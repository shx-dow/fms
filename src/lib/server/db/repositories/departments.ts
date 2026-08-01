import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export function listDepartments(db: Db = defaultDb): Record<string, unknown>[] {
  return db.all(sql`
    SELECT d.*, COUNT(u.id) AS member_count
    FROM departments d LEFT JOIN users u ON u.department_id = d.id
    GROUP BY d.id ORDER BY d.name
  `) as Record<string, unknown>[];
}

export function upsertDepartment(id: string, code: string, name: string, db: Db = defaultDb) {
  db.run(sql`
    INSERT INTO departments (id, code, name) VALUES (${id}, ${code}, ${name})
    ON CONFLICT(id) DO UPDATE SET code = excluded.code, name = excluded.name
  `);
}
