import Database from 'better-sqlite3';
const db = new Database('data/faculty-reporting.db');

const report = db.prepare('SELECT id, faculty_id, period_id, status, completion FROM reports WHERE faculty_id = ?').all('dev-faculty-1');
console.log('Reports:', JSON.stringify(report, null, 2));

if (report.length > 0) {
  const records = db.prepare('SELECT course_code, course_name, class_type, scheduled, conducted, missed, syllabus_completion FROM teaching_records WHERE report_id = ?').all(report[0].id);
  console.log('Teaching records:', JSON.stringify(records, null, 2));
}
