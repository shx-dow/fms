import type Database from 'better-sqlite3';
import { randomBytes, scryptSync } from 'node:crypto';

const pad = (n: number) => String(n).padStart(2, '0');

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function mondayOf(reference: Date): Date {
  const copy = new Date(reference);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

/** UTC timestamp `hour` into the day `days` after `from`, for demo timestamps. */
function stamp(from: Date, days: number, hour: number): string {
  return `${isoDate(addDays(from, days))}T${pad(hour)}:00:00Z`;
}

interface DemoWeek {
  id: string;
  startsOn: string;
  endsOn: string;
  dueOn: string;
}

/** Week boundaries for the demo data, keyed the same way ensureCurrentPeriod
 * keys a real week, so seeding then running the app agree on the period. */
function demoWeeks(today: Date) {
  const monday = mondayOf(today);
  const week = (from: Date): DemoWeek => {
    const end = addDays(from, 4);
    return {
      id: `week-${isoDate(from)}`,
      startsOn: isoDate(from),
      endsOn: isoDate(end),
      dueOn: `${isoDate(end)}T18:00:00+05:30`,
    };
  };
  return { previous: week(addDays(monday, -7)), current: week(monday), next: week(addDays(monday, 7)), monday };
}

const FACULTY_PASSWORD =
  '5fe3c91dbf21bce504960f6494a585db:619af50403ec244d5f6c2ea06f2468675a93a46042d40473fcbe81b137dbf38fcd1d905a4f89521785626ce2e454513bc8c600b000ec2eafb8dc2badc6d07265';
const HOD_PASSWORD =
  '1ef8c7c2aa29ae03686e66331f8a7eaf:d1ba524089acdbfa7d14bdcedf059393b84e065e49c8ff7766e3fa64f9d4b2a339e50ec0d170f769029449cc76db878ed9cf20f93132b1f3be852090473a4e3b';
const ADMIN_PASSWORD =
  '1432d24266710fcb1b7cbf1d3e50fcb3:b1647c946a4287f806d83470f6164fe022ad94113d7161987d334cb12a07f6d5a3f8e618331cb05212e7b8a6d0c8f4dc8218f7ae942e4627da8a17953e9aa266';

/** Fresh scrypt hash, matching the format the auth layer verifies. */
function hashPassword(plaintext: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(plaintext, salt, 64).toString('hex')}`;
}

export function seedDatabase(sqlite: Database.Database, demoPassword?: string) {
  const week = demoWeeks(new Date());
  const { previous, current, next } = week;
  const monday = week.monday;

  // The checked-in hashes have no published plaintext, so a seeded dev database
  // has nobody who can log in. DEMO_PASSWORD makes that recoverable on demand
  // without putting a usable password in the repository.
  const shared = demoPassword ? hashPassword(demoPassword) : FACULTY_PASSWORD;
  const hodHash = demoPassword ? hashPassword(demoPassword) : HOD_PASSWORD;
  const adminHash = demoPassword ? hashPassword(demoPassword) : ADMIN_PASSWORD;

  sqlite
    .prepare(
      "INSERT OR IGNORE INTO departments VALUES ('tech', 'TECH', 'IcfaiTech'), ('cse', 'CSE', 'Computer Science and Engineering')",
    )
    .run();

  // Dev accounts are rebuilt on every seed so a password change during testing
  // does not lock the next person out of the demo.
  const devUserIds = ['dev-faculty-1', 'dev-faculty-2', 'dev-faculty-3', 'dev-hod-1', 'dev-admin-1'];
  const devUserList = devUserIds.map((id) => `'${id}'`).join(', ');
  sqlite.prepare(`DELETE FROM credentials WHERE user_id IN (${devUserList})`).run();
  sqlite.prepare(`DELETE FROM users WHERE id IN (${devUserList})`).run();
  sqlite
    .prepare(
      "INSERT INTO users (id, name, email, role, department_id, is_active) VALUES ('dev-faculty-1', 'Faculty User 1', 'faculty1@example.edu', 'FACULTY', 'cse', 1), ('dev-faculty-2', 'Faculty User 2', 'faculty2@example.edu', 'FACULTY', 'cse', 1), ('dev-faculty-3', 'Faculty User 3', 'faculty3@example.edu', 'FACULTY', 'cse', 1), ('dev-hod-1', 'Department HOD', 'hod.cse@example.edu', 'HOD', 'cse', 1), ('dev-admin-1', 'System Administrator', 'admin@example.edu', 'ADMIN', NULL, 1)",
    )
    .run();
  sqlite
    .prepare(
      'INSERT OR IGNORE INTO credentials VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?)',
    )
    .run('dev-faculty-1', shared, 'dev-faculty-2', shared, 'dev-faculty-3', shared, 'dev-hod-1', hodHash, 'dev-admin-1', adminHash);

  sqlite.prepare('UPDATE reporting_periods SET is_open = 0 WHERE is_open = 1').run();
  const insertPeriod = sqlite.prepare(
    'INSERT OR REPLACE INTO reporting_periods VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  insertPeriod.run(current.id, '', 'WEEKLY', current.startsOn, current.endsOn, current.dueOn, 1);
  insertPeriod.run(previous.id, '', 'WEEKLY', previous.startsOn, previous.endsOn, previous.dueOn, 0);
  insertPeriod.run(next.id, '', 'WEEKLY', next.startsOn, next.endsOn, next.dueOn, 0);

  const insertReport = sqlite.prepare(
    'INSERT OR REPLACE INTO reports (id, faculty_id, period_id, status, summary, completion, created_at, updated_at, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  // Last week is settled: one submitted by faculty 1, one approved for faculty 2.
  insertReport.run(
    'demo-report-submitted',
    'dev-faculty-1',
    previous.id,
    'SUBMITTED',
    'This week covered advanced database topics including indexing strategies and query optimization. Students showed strong engagement in lab sessions.',
    82,
    stamp(monday, -7, 10),
    stamp(monday, -4, 16),
    stamp(monday, -4, 16),
  );
  insertReport.run(
    'demo-report-approved',
    'dev-faculty-2',
    previous.id,
    'APPROVED',
    'Covered software engineering fundamentals including Agile methodologies and sprint planning. Team project milestones were met.',
    95,
    stamp(monday, -7, 9),
    stamp(monday, -3, 11),
    stamp(monday, -4, 14),
  );
  // This week has one report waiting in the review queue. Faculty 1 is left
  // without one on purpose, so opening the editor creates a fresh draft and
  // "load recurring template" can pull last week's teaching rows.
  insertReport.run(
    'demo-report-pending',
    'dev-faculty-3',
    current.id,
    'SUBMITTED',
    'Ran the second lab on transactions and covered locking in the lecture. Two students need help with the deadlock exercise.',
    64,
    stamp(monday, 0, 10),
    stamp(monday, 2, 16),
    stamp(monday, 2, 16),
  );
  // The department head teaches too, so they file a report like anyone else.
  // This one is already approved by the admin, so the queue shows a settled
  // review alongside the one still waiting.
  insertReport.run(
    'demo-report-hod',
    'dev-hod-1',
    previous.id,
    'APPROVED',
    'Taught two sections and chaired the departmental meeting. Cleared the pending course approvals and set the exam schedule.',
    88,
    stamp(monday, -7, 11),
    stamp(monday, -3, 12),
    stamp(monday, -4, 15),
  );

  const insertTeaching = sqlite.prepare(
    'INSERT OR REPLACE INTO teaching_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  insertTeaching.run(
    'demo-tr-1',
    'demo-report-submitted',
    'CSE-401',
    'Advanced Databases',
    'B.Tech · IV Year',
    'Lecture',
    4,
    3,
    1,
    'Makeup scheduled for Friday',
    75,
    18,
    'demo-tr-2',
    'demo-report-submitted',
    'CSE-401',
    'Advanced Databases Lab',
    'B.Tech · IV Year',
    'Lab',
    2,
    2,
    0,
    '',
    80,
    12,
  );
  insertTeaching.run(
    'demo-tr-3',
    'demo-report-approved',
    'CSE-301',
    'Software Engineering',
    'B.Tech · III Year',
    'Lecture',
    5,
    5,
    0,
    '',
    90,
    20,
    'demo-tr-4',
    'demo-report-approved',
    'CSE-302',
    'Software Engineering Lab',
    'B.Tech · III Year',
    'Lab',
    2,
    2,
    0,
    '',
    100,
    16,
  );
  insertTeaching.run(
    'demo-tr-7',
    'demo-report-hod',
    'CSE-501',
    'Advanced Database Systems',
    'B.Tech · V Year',
    'Lecture',
    3,
    3,
    0,
    '',
    70,
    15,
    'demo-tr-8',
    'demo-report-hod',
    'CSE-502',
    'Database Lab',
    'B.Tech · V Year',
    'Lab',
    1,
    1,
    0,
    '',
    100,
    10,
  );
  insertTeaching.run(
    'demo-tr-5',
    'demo-report-pending',
    'CSE-401',
    'Advanced Databases',
    'B.Tech · IV Year',
    'Lecture',
    4,
    2,
    0,
    'Indexing topic carries into next week.',
    50,
    12,
    'demo-tr-6',
    'demo-report-pending',
    'CSE-401',
    'Advanced Databases Lab',
    'B.Tech · IV Year',
    'Lab',
    2,
    2,
    0,
    '',
    60,
    8,
  );

  const insertReview = sqlite.prepare(
    'INSERT OR REPLACE INTO reviews (id, report_id, reviewer_id, decision, remarks, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  insertReview.run(
    'demo-review-1',
    'demo-report-approved',
    'dev-hod-1',
    'APPROVED',
    'Well-structured report. Good coverage of the syllabus.',
    stamp(monday, -3, 11),
  );
  // An HOD may review any report, including their own.
  insertReview.run(
    'demo-review-2',
    'demo-report-hod',
    'dev-hod-1',
    'APPROVED',
    'Teaching load and committee work both accounted for. Approved.',
    stamp(monday, -3, 12),
  );

  sqlite
    .prepare(
      'INSERT OR REPLACE INTO audit_events (id, actor_id, action, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
    )
    .run(
      'demo-audit-1',
      'dev-faculty-1',
      'REPORT_SUBMITTED',
      'REPORT',
      'demo-report-submitted',
      stamp(monday, -4, 16),
      'demo-audit-2',
      'dev-faculty-3',
      'REPORT_SUBMITTED',
      'REPORT',
      'demo-report-pending',
      stamp(monday, 2, 16),
      'demo-audit-3',
      'dev-hod-1',
      'APPROVED',
      'REPORT',
      'demo-report-approved',
      stamp(monday, -3, 11),
    );
}
