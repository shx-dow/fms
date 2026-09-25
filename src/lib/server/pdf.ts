import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { reportStatusLabel } from '$lib/domain';

const MARGIN = 48;
const INK = '#17252d';
const TEAL = '#087f73';
const MUTED = '#64747a';
const BORDER = '#d7e3e6';
const LIGHT_BG = '#f4f8f9';
const HEADER_BG = '#e6f0f2';
const ALT_BG = '#f7fafb';

const STATUS_COLOR = {
  DRAFT: '#64747a',
  SUBMITTED: '#1d6fb8',
  APPROVED: '#1f7a4d',
  CHANGES_REQUIRED: '#b0741f',
} satisfies Record<string, string>;

// The last width is the flex column; every other entry maps 1:1 to a header
// and to one cell per body row. Section specs are asserted in pdf.test.ts so
// a future field cannot silently overflow the table again.
const TEACH_HEADERS = ['Course', 'Program / level', 'Type', 'Sched.', 'Taken', 'Missed', 'Make-up action', 'Syllabus'];
const TEACH_WIDTHS = [96, 52, 40, 32, 32, 30, 56, 70];
const TEACH_ALIGN_RIGHT = [3, 4, 5];
const NO_RIGHT_ALIGN: readonly number[] = [];

const DUTY_HEADERS = ['Committee / body', 'Role', 'Activity', 'Reach', 'Outcome'];
const DUTY_WIDTHS = [104, 58, 96, 54, 70];

const OUTREACH_HEADERS = ['Activity', 'Audience', 'Date', 'Outcome'];
const OUTREACH_WIDTHS = [130, 100, 58, 70];

export interface PdfReport {
  period_label: string;
  status: string;
  faculty_name: string;
  faculty_email: string;
  department_name: string;
  completion: number | null;
  submitted_at: string | null;
  summary: string | null;
  challenges: string | null;
  next_goals: string | null;
}

export interface PdfTeaching {
  course_code: string | null;
  course_name: string | null;
  program_level: string | null;
  class_type: string | null;
  scheduled: number | null;
  conducted: number | null;
  missed: number | null;
  missed_action: string | null;
  syllabus_completion: number | null;
  syllabus_lecture: number | null;
}

export interface PdfResearch {
  title: string | null;
  category: string | null;
  status: string | null;
  venue_or_agency: string | null;
  indexing_or_quality: string | null;
  role: string | null;
}

export interface PdfDuty {
  name: string | null;
  role: string | null;
  activity: string | null;
  reach: string | null;
  outcome: string | null;
}

export interface PdfOutreach {
  activity: string | null;
  audience: string | null;
  outcome: string | null;
  date: string | null;
}

export interface PdfAttachment {
  filename: string | null;
  size: number | null;
  created_at: string | null;
}

export interface PdfReview {
  decision: string | null;
  remarks: string | null;
  reviewer_name: string | null;
  created_at: string | null;
}

export interface ReportPdfData {
  report: PdfReport;
  teaching: PdfTeaching[];
  research: PdfResearch[];
  duties: PdfDuty[];
  outreach: PdfOutreach[];
  reviews: PdfReview[];
  attachments: PdfAttachment[];
}

function logoPath(): string | null {
  const candidates = ['icfaitech_jaipur_logo.png', 'icfaitech_jaipur_cover.png', 'logo.png'];
  for (const name of candidates) {
    const fromCwd = `${process.cwd()}/static/${name}`;
    if (existsSync(fromCwd)) return fromCwd;
    const fromUrl = fileURLToPath(new URL(`../static/${name}`, import.meta.url));
    if (existsSync(fromUrl)) return fromUrl;
  }
  return null;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(status: string): string {
  // SAFETY: report statuses are constrained to ReportStatus by the write path; unknown values fall back to the raw string.
  return reportStatusLabel[status as keyof typeof reportStatusLabel] ?? status;
}

function statusColor(status: string): string {
  // SAFETY: STATUS_COLOR carries the same ReportStatus keys as reportStatusLabel; unknown values fall back to INK.
  return STATUS_COLOR[status as keyof typeof STATUS_COLOR] ?? INK;
}

/** One body cell per header, in order. Kept pure so tests can assert column parity. */
export function teachingRow(t: PdfTeaching): string[] {
  return [
    `${t.course_code ?? ''} · ${t.course_name ?? ''}`,
    String(t.program_level ?? ''),
    String(t.class_type ?? ''),
    String(t.scheduled ?? 0),
    String(t.conducted ?? 0),
    String(t.missed ?? 0),
    String(t.missed_action ?? '—'),
    [
      t.syllabus_lecture != null ? `L${t.syllabus_lecture}` : '',
      t.syllabus_completion != null ? `${t.syllabus_completion}%` : '',
    ]
      .filter(Boolean)
      .join(' · ') || '—',
  ];
}

export function dutyRow(d: PdfDuty): string[] {
  return [
    String(d.name ?? ''),
    String(d.role ?? ''),
    String(d.activity ?? '—'),
    String(d.reach ?? '—'),
    String(d.outcome ?? '—'),
  ];
}

export function outreachRow(o: PdfOutreach): string[] {
  return [String(o.activity ?? ''), String(o.audience ?? '—'), formatDate(o.date), String(o.outcome ?? '—')];
}

export const PDF_SECTIONS = {
  teaching: { headers: TEACH_HEADERS, widths: TEACH_WIDTHS, alignRight: TEACH_ALIGN_RIGHT },
  duties: { headers: DUTY_HEADERS, widths: DUTY_WIDTHS, alignRight: NO_RIGHT_ALIGN },
  outreach: { headers: OUTREACH_HEADERS, widths: OUTREACH_WIDTHS, alignRight: NO_RIGHT_ALIGN },
} as const;

export function renderReportPdf(data: ReportPdfData): Promise<Buffer> {
  const { report, teaching, research, duties, outreach, reviews, attachments } = data;
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  const pageWidth = () => doc.page.width;
  const usable = () => pageWidth() - MARGIN * 2;
  const pageBottom = () => doc.page.height - 64;

  const periodLabel = report.period_label;
  const status = report.status;
  const facultyName = report.faculty_name;
  const departmentName = report.department_name;
  const email = report.faculty_email;
  const completion = `${report.completion ?? 0}%`;
  const submittedLabel = report.submitted_at ? formatDate(report.submitted_at) : 'Not submitted';

  const conducted = teaching.reduce((n, t) => n + Number(t.conducted ?? 0), 0);
  const scheduled = teaching.reduce((n, t) => n + Number(t.scheduled ?? 0), 0);
  const deliveryRate = scheduled > 0 ? Math.round((conducted / scheduled) * 100) : 0;
  const researchActive = research.filter((r) => String(r.title ?? '') !== 'N/A').length;
  const dutiesCount = duties.filter((d) => String(d.name ?? '') !== 'N/A').length;
  const outreachCount = outreach.filter((o) => String(o.activity ?? '') !== 'N/A').length;

  const drawHeader = () => {
    let topY = MARGIN;
    const logo = logoPath();
    if (logo) {
      const w = 70;
      doc.image(logo, (pageWidth() - w) / 2, topY, { width: w });
      topY += 76;
    }

    doc.font('Helvetica-Bold').fontSize(16).fillColor(INK).text('ICFAI TECH JAIPUR', MARGIN, topY, {
      width: usable(),
      align: 'center',
      characterSpacing: 3,
    });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('FACULTY REPORTING SYSTEM', MARGIN, topY + 20, {
      width: usable(),
      align: 'center',
      characterSpacing: 1.5,
    });
    topY += 44;

    doc.strokeColor(TEAL).lineWidth(2).moveTo(MARGIN, topY).lineTo(pageWidth() - MARGIN, topY).stroke();
    doc.strokeColor(BORDER).lineWidth(0.5).moveTo(MARGIN, topY + 3).lineTo(pageWidth() - MARGIN, topY + 3).stroke();
    topY += 18;

    doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text('Faculty Weekly Report', MARGIN, topY);
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(`Reporting period: ${periodLabel}`, MARGIN, topY + 27);
    doc.y = topY + 54;
  };

  const drawMeta = () => {
    const topY = doc.y;
    const colW = usable() / 3;
    const rowH = 32;
    const boxH = rowH * 2;
    const items: string[][] = [
      ['Faculty', facultyName],
      ['Status', statusLabel(status)],
      ['Submitted', submittedLabel],
      ['Email', email],
      ['Department', departmentName],
      ['Completion', completion],
    ];

    doc.rect(MARGIN, topY, usable(), boxH).fill(LIGHT_BG);
    doc.strokeColor(BORDER).lineWidth(0.6);
    doc.rect(MARGIN, topY, usable(), boxH).stroke();

    items.forEach(([label, value], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = MARGIN + col * colW;
      const y = topY + row * rowH;

      doc.font('Helvetica-Bold').fontSize(7).fillColor(MUTED).text(label.toUpperCase(), x + 10, y + 6, {
        width: colW - 20,
        characterSpacing: 0.8,
      });
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(label === 'Status' ? statusColor(status) : INK)
        .text(value, x + 10, y + 17, { width: colW - 20 });

      if (col < 2) doc.moveTo(x + colW, topY).lineTo(x + colW, topY + boxH).stroke();
      if (row === 0) doc.moveTo(MARGIN, topY + rowH).lineTo(MARGIN + usable(), topY + rowH).stroke();
    });

    doc.y = topY + boxH + 14;
  };

  let sectionNo = 0;
  const heading = (title: string) => {
    sectionNo += 1;
    if (doc.y > pageBottom() - 30) doc.addPage();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(TEAL).text(`${sectionNo}. ${title}`);
    const ruleY = doc.y + 4;
    doc.strokeColor(TEAL).lineWidth(1).moveTo(MARGIN, ruleY).lineTo(MARGIN + 42, ruleY).stroke();
    doc.moveDown(0.6);
    doc.fillColor(INK);
  };

  const note = (text: string, opts: { na?: boolean } = {}) => {
    const msg = opts.na ? 'Marked not applicable this week.' : text;
    doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(MUTED).text(msg);
    doc.moveDown(0.4);
    doc.fillColor(INK);
  };

  const drawTable = (headers: string[], widths: number[], rows: string[][], opts: { alignRight?: number[] } = {}) => {
    const fixed = widths.slice(0, -1);
    const fixedSum = fixed.reduce((a, b) => a + b, 0);
    const cols = [...fixed, usable() - fixedSum];
    const startX = MARGIN;
    const headerH = 18;
    const pad = 4;
    const bottom = pageBottom();
    let y = doc.y;

    const rowHeight = (cells: string[]) => {
      doc.font('Helvetica').fontSize(8);
      return Math.max(
        16,
        ...cells.map((c, i) => doc.heightOfString(c, { width: cols[i]! - pad * 2, lineBreak: true }) + pad * 2),
      );
    };

    const drawHeaderRow = (yy: number) => {
      doc.rect(startX, yy, usable(), headerH).fill(HEADER_BG);
      let hx = startX;
      headers.forEach((h, i) => {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(INK).text(h.toUpperCase(), hx + pad, yy + 5.5, {
          width: cols[i]! - pad * 2,
        });
        hx += cols[i]!;
      });
      doc.strokeColor(BORDER).lineWidth(0.5);
      hx = startX;
      cols.forEach((w) => {
        doc.moveTo(hx, yy).lineTo(hx, yy + headerH).stroke();
        hx += w;
      });
      doc.moveTo(startX, yy + headerH).lineTo(startX + usable(), yy + headerH).stroke();
    };

    drawHeaderRow(y);
    y += headerH;

    rows.forEach((row, idx) => {
      const h = rowHeight(row);
      if (y + h > bottom) {
        doc.addPage();
        y = MARGIN;
        drawHeaderRow(y);
        y += headerH;
      }
      doc.rect(startX, y, usable(), h).fill(idx % 2 ? ALT_BG : '#ffffff');
      let cx = startX;
      row.forEach((cell, i) => {
        const align = opts.alignRight?.includes(i) ? 'right' : 'left';
        doc.font('Helvetica').fontSize(8).fillColor(INK).text(cell, cx + pad, y + pad, {
          width: cols[i]! - pad * 2,
          lineBreak: true,
          align,
        });
        cx += cols[i]!;
      });
      doc.strokeColor(BORDER).lineWidth(0.5);
      cx = startX;
      cols.forEach((w) => {
        doc.moveTo(cx, y).lineTo(cx, y + h).stroke();
        cx += w;
      });
      doc.moveTo(startX, y + h).lineTo(startX + usable(), y + h).stroke();
      y += h;
    });

    doc.y = y + 8;
  };

  const boxed = (text: string, opts: { label?: string } = {}) => {
    const startY = doc.y;
    const w = usable() - 24;
    doc.font('Helvetica').fontSize(9.5);
    const h = doc.heightOfString(text, { width: w, lineBreak: true }) + 20;
    if (startY + h > pageBottom()) doc.addPage();

    const y0 = doc.y;
    doc.rect(MARGIN, y0, usable(), h).fill(LIGHT_BG);
    doc.rect(MARGIN, y0, 3, h).fill(TEAL);
    if (opts.label) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(opts.label.toUpperCase(), MARGIN + 12, y0 + 7, {
        width: w,
        characterSpacing: 0.8,
      });
    }
    const textTop = y0 + (opts.label ? 22 : 9);
    doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(text, MARGIN + 12, textTop, { width: w, lineBreak: true });
    doc.y = y0 + h + 8;
  };

  const drawTeaching = () => {
    heading('Teaching & Academic Delivery');
    if (!teaching.length) {
      note('No teaching records entered this week.');
      return;
    }
    drawTable(PDF_SECTIONS.teaching.headers, PDF_SECTIONS.teaching.widths, teaching.map(teachingRow), {
      alignRight: [...PDF_SECTIONS.teaching.alignRight],
    });
  };

  const drawResearch = () => {
    heading('Research & Publications');
    const visible = research.filter((r) => String(r.title ?? '') !== 'N/A');
    if (research.length && !visible.length) {
      note('', { na: true });
      return;
    }
    if (!visible.length) {
      note('No research records this week.');
      return;
    }
    visible.forEach((r) => {
      doc.moveDown(0.15);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(`• ${r.title ?? 'Untitled'} — ${String(r.category ?? '')}`);
      const detail = [r.status, r.venue_or_agency, r.indexing_or_quality, r.role].filter(Boolean).join(' · ');
      if (detail) doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(`  ${detail}`);
      doc.fillColor(INK);
    });
    doc.moveDown(0.3);
  };

  const drawDuties = () => {
    heading('Institutional Duties');
    const visible = duties.filter((d) => String(d.name ?? '') !== 'N/A');
    if (duties.length && !visible.length) {
      note('', { na: true });
      return;
    }
    if (!visible.length) {
      note('No institutional duties recorded this week.');
      return;
    }
    drawTable(PDF_SECTIONS.duties.headers, PDF_SECTIONS.duties.widths, visible.map(dutyRow));
  };

  const drawOutreach = () => {
    heading('Outreach & Admissions');
    const visible = outreach.filter((o) => String(o.activity ?? '') !== 'N/A');
    if (outreach.length && !visible.length) {
      note('', { na: true });
      return;
    }
    if (!visible.length) {
      note('No outreach activity recorded this week.');
      return;
    }
    drawTable(PDF_SECTIONS.outreach.headers, PDF_SECTIONS.outreach.widths, visible.map(outreachRow));
  };

  const drawSummary = () => {
    heading('Weekly Executive Summary');
    const text = report.summary ? String(report.summary) : 'No weekly summary entered.';
    boxed(text);
    const metrics = [
      `Delivery ${conducted}/${scheduled} · ${deliveryRate}%`,
      `${researchActive} research`,
      `${dutiesCount} duties`,
      `${outreachCount} outreach`,
      `${attachments.length} file${attachments.length === 1 ? '' : 's'}`,
    ];
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(`This week: ${metrics.join('  ·  ')}`, MARGIN, doc.y, { width: usable(), lineBreak: true });
    doc.moveDown(0.6);
    doc.fillColor(INK);
  };

  const drawChallenges = () => {
    const challenges = String(report.challenges ?? '').trim();
    const goals = String(report.next_goals ?? '').trim();
    if (!challenges && !goals) return;
    heading('Challenges & Next Week’s Goals');
    if (challenges) boxed(challenges, { label: 'Challenges faced' });
    if (goals) boxed(goals, { label: 'Next week’s goals' });
  };

  const drawFiles = () => {
    if (!attachments.length) return;
    heading('Supporting Files');
    attachments.forEach((a) => {
      doc.moveDown(0.15);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(`• ${String(a.filename ?? '')}`);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(`  ${formatSize(Number(a.size ?? 0))} · ${formatDate(a.created_at)}`);
      doc.fillColor(INK);
    });
    doc.moveDown(0.3);
  };

  const drawReviews = () => {
    if (!reviews.length) return;
    heading('Review & Approval');
    reviews.forEach((rv) => {
      doc.moveDown(0.15);
      const decision = String(rv.decision ?? '');
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(statusColor(decision))
        .text(`${rv.reviewer_name ?? 'Reviewer'} — ${statusLabel(decision)}`);
      doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(`  ${formatDate(rv.created_at)}`);
      if (rv.remarks) doc.font('Helvetica-Oblique').fontSize(9).fillColor(INK).text(`  "${String(rv.remarks)}"`);
      doc.fillColor(INK);
    });
    doc.moveDown(0.3);
  };

  const stampFooters = () => {
    const range = doc.bufferedPageRange();
    const total = range.count;
    for (let i = range.start; i < range.start + total; i++) {
      doc.switchToPage(i);
      const fy = doc.page.height - 36;
      doc.strokeColor(BORDER).lineWidth(0.5).moveTo(MARGIN, fy).lineTo(pageWidth() - MARGIN, fy).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED);
      doc.text(`Faculty Weekly Report · ${periodLabel}`, MARGIN, fy + 5);
      doc.text(`Page ${i - range.start + 1} of ${total}`, MARGIN, fy + 5, { width: usable(), align: 'right' });
    }
  };

  drawHeader();
  drawMeta();
  drawTeaching();
  drawResearch();
  drawDuties();
  drawOutreach();
  drawSummary();
  drawChallenges();
  drawFiles();
  drawReviews();
  stampFooters();

  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.end();
  });
}
