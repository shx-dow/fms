import { error } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';
import PDFDocument from 'pdfkit';
import { computeWeekLabel } from '$lib/week-label';

export const GET: RequestHandler = ({ locals, params }) => {
  if (!locals.user) throw error(401, 'Sign in required');

  const reportId = params.id;
  const report = sqlite
    .prepare(
      'SELECT r.*, u.name AS faculty_name, u.email AS faculty_email, u.department_id, d.name AS department_name, p.starts_on AS period_starts_on FROM reports r JOIN users u ON u.id = r.faculty_id LEFT JOIN departments d ON d.id = u.department_id JOIN reporting_periods p ON p.id = r.period_id WHERE r.id = ?',
    )
    .get(reportId) as Record<string, unknown> | undefined;
  if (!report) throw error(404, 'Report not found');
  report.period_label = computeWeekLabel(String(report.period_starts_on));

  if (locals.user.role === 'FACULTY' && report.faculty_id !== locals.user.id) throw error(403, 'Forbidden');
  if (locals.user.role === 'HOD') {
    const allowed = sqlite
      .prepare('SELECT 1 FROM reports r JOIN users u ON u.id = r.faculty_id WHERE r.id = ? AND u.department_id = ?')
      .get(reportId, locals.user.departmentId ?? '');
    if (!allowed) throw error(403, 'Report is outside your scope.');
  }

  const teaching = sqlite
    .prepare('SELECT * FROM teaching_records WHERE report_id = ?')
    .all(reportId) as Record<string, unknown>[];
  const research = sqlite
    .prepare('SELECT * FROM research_records WHERE report_id = ?')
    .all(reportId) as Record<string, unknown>[];
  const duties = sqlite
    .prepare('SELECT * FROM institutional_duties WHERE report_id = ?')
    .all(reportId) as Record<string, unknown>[];
  const outreach = sqlite
    .prepare('SELECT * FROM outreach_records WHERE report_id = ?')
    .all(reportId) as Record<string, unknown>[];
  const reviews = sqlite
    .prepare('SELECT rv.*, u.name AS reviewer_name FROM reviews rv JOIN users u ON u.id = rv.reviewer_id WHERE rv.report_id = ? ORDER BY rv.created_at DESC')
    .all(reportId) as Record<string, unknown>[];

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  const drawHeader = () => {
    doc.fontSize(9).fillColor('#087f73').text('FACULTY REPORTING SYSTEM', { continued: false });
    doc.moveDown(0.3);
    doc.fontSize(20).fillColor('#17252d').text('Faculty Weekly Report', { continued: false });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#64747a').text(`Reporting period: ${report.period_label ?? ''}`);
    doc.moveDown(0.8);
  };

  const drawMeta = () => {
    const meta = [
      ['Faculty', String(report.faculty_name ?? '')],
      ['Department', String(report.department_name ?? 'Computer Science and Engineering')],
      ['Status', String(report.status ?? '')],
      ['Submitted', report.submitted_at ? new Date(String(report.submitted_at)).toLocaleDateString() : 'Not submitted'],
      ['Completion', `${report.completion ?? 0}%`],
    ];
    meta.forEach(([label, value], i) => {
      doc.fontSize(8).fillColor('#64747a').text(label.toUpperCase(), 50, doc.y, { width: 90 });
      doc.fontSize(9).fillColor('#17252d').text(value, 140, doc.y - 11);
      if (i < meta.length - 1) doc.moveDown(0.3);
    });
    doc.moveDown(0.5);
  };

  const section = (title: string) => {
    doc.moveDown(0.5);
    doc.fontSize(13).fillColor('#17252d').text(title);
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#64747a');
  };

  const drawTeaching = () => {
    section('1. Teaching & Academic Delivery');
    if (!teaching.length) {
      doc.text('No teaching records entered.');
      return;
    }
    const headers = ['Course', 'Program', 'Type', 'Sched.', 'Taken', 'Missed', 'Syllabus'];
    const widths = [90, 70, 50, 40, 40, 40, 50];
    const startX = 50;
    let y = doc.y;

    autoTable(doc, headers, widths, startX, y, teaching.map((t) => [
      `${t.course_code ?? ''} · ${t.course_name ?? ''}`,
      String(t.program_level ?? ''),
      String(t.class_type ?? ''),
      String(t.scheduled ?? 0),
      String(t.conducted ?? 0),
      String(t.missed ?? 0),
      `${t.syllabus_completion ?? 0}%`,
    ]));
  };

  const drawSummary = () => {
    section('2. Weekly Summary');
    const summary = report.summary ? String(report.summary) : 'No weekly summary entered.';
    doc.text(summary);
  };

  const drawResearch = () => {
    if (!research.length) return;
    section('3. Research & Publications');
    research.forEach((r) => {
      doc.fontSize(9).fillColor('#17252d').text(`• ${r.title ?? ''} (${r.category ?? ''})`);
      if (r.venue_or_agency) doc.fontSize(8).fillColor('#64747a').text(`  ${r.venue_or_agency}`);
      doc.moveDown(0.2);
    });
  };

  const drawReviews = () => {
    if (!reviews.length) return;
    section('4. Review History');
    reviews.forEach((rv) => {
      doc.fontSize(9).fillColor('#17252d').text(`${rv.reviewer_name ?? ''} — ${rv.decision ?? ''}`);
      doc.fontSize(8).fillColor('#64747a').text(`  ${new Date(String(rv.created_at)).toLocaleString()}`);
      if (rv.remarks) doc.fontSize(8).fillColor('#17252d').text(`  "${rv.remarks}"`);
      doc.moveDown(0.2);
    });
  };

  const drawFooter = () => {
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#64747a').text(
      `Generated from Faculty Reporting System · ${report.period_label ?? ''} · ${new Date().toLocaleDateString()}`,
      50, doc.y,
    );
  };

  drawHeader();
  drawMeta();
  drawTeaching();

  if (doc.y > 500) doc.addPage();
  drawSummary();

  if (doc.y > 600) doc.addPage();
  drawResearch();

  if (doc.y > 650) doc.addPage();
  drawReviews();

  drawFooter();

  doc.end();

  return new Promise<Response>((resolve) => {
    doc.on('end', () => {
      resolve(new Response(Buffer.concat(buffers), {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': `attachment; filename="weekly-report-${report.period_label?.toString().replace(/\s+/g, '-').toLowerCase() ?? 'report'}.pdf"`,
        },
      }));
    });
  });
};

function autoTable(doc: PDFKit.PDFDocument, headers: string[], widths: number[], startX: number, startY: number, rows: string[][]) {
  const rowHeight = 16;
  const headerBg = '#e5f0f4';
  const altBg = '#f8faf9';
  let y = startY;
  const lineColor = '#d9e2df';

  doc.fontSize(7).fillColor('#64747a');
  let x = startX;
  headers.forEach((h, i) => {
    doc.rect(x, y, widths[i]!, rowHeight).fill(headerBg).fillColor('#64747a').fill();
    doc.fillColor('#17252d');
    doc.text(h.toUpperCase(), x + 3, y + 4, { width: widths[i]! - 6 });
    x += widths[i]!;
  });
  y += rowHeight;

  rows.forEach((row, rowIdx) => {
    const bg = rowIdx % 2 === 0 ? '#ffffff' : altBg;
    x = startX;
    row.forEach((cell, i) => {
      doc.rect(x, y, widths[i]!, rowHeight).fill(bg).fillColor('#17252d').fill();
      doc.fontSize(8).text(cell, x + 3, y + 4, { width: widths[i]! - 6 });
      x += widths[i]!;
    });
    y += rowHeight;
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
  });

  doc.y = y + 5;
}