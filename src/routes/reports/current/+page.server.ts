import { error } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { PageServerLoad } from './$types';
import type { TeachingRecord } from '$lib/domain';
import type { ActivityRecord, DutyRecord, OutreachRecord, ResearchRecord } from '$lib/report-records';
import { computeWeekLabel } from '$lib/week-label';
import { policyFor } from '$lib/server/report-policy';
import {
  listTeaching,
  listResearch,
  listDuties,
  listOutreach,
  type DutyDbRow,
  type OutreachDbRow,
  type ResearchDbRow,
} from '$lib/server/db/repositories/activity';
import { listAttachments } from '$lib/server/db/repositories/attachments';
import { listReviewsForReport } from '$lib/server/db/repositories/reviews';
import { ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
import { getReportForPeriod, insertReportOrIgnore, listReportHistory } from '$lib/server/db/repositories/reports';
import { getUserProfile } from '$lib/server/db/repositories/users';
import { getReportById } from '$lib/server/db/repositories/reports';

export interface EditorData {
  reportId: string;
  reportStatus: string;
  periodLabel: string;
  canEdit: boolean;
  deadline: string;
  researchEmpty: boolean;
  dutiesEmpty: boolean;
  outreachEmpty: boolean;
  hasTemplate: boolean;
  history: { id: string; status: string; completion: number; period_label: string; period_id: string; updated_at: string }[];
  teaching: TeachingRecord[];
  research: ResearchRecord[];
  duties: DutyRecord[];
  outreach: OutreachRecord[];
  reviews: { decision: string; remarks: string | null; created_at: string; reviewer_name: string }[];
  attachments: { id: string; filename: string; mime_type: string; size: number; created_at: string }[];
  /** Pre-fill from the faculty member's saved recurring template. */
  template: {
    subjects: ActivityRecord[];
    research: ResearchRecord[];
    duties: DutyRecord[];
    outreach: OutreachRecord[];
  };
}

const EMPTY: EditorData['template'] = { subjects: [], research: [], duties: [], outreach: [] };

const text = (value: string | null | undefined): string => value ?? '';

function toResearchRecord(row: ResearchDbRow): ResearchRecord {
  return {
    category: row.category,
    title: text(row.title),
    venueOrAgency: text(row.venue_or_agency),
    indexingOrQuality: text(row.indexing_or_quality),
    role: text(row.role),
    status: text(row.status),
  };
}

function toDutyRecord(row: DutyDbRow): DutyRecord {
  return {
    name: text(row.name),
    role: text(row.role),
    activity: text(row.activity),
    reach: text(row.reach),
    outcome: text(row.outcome),
  };
}

function toOutreachRecord(row: OutreachDbRow): OutreachRecord {
  return {
    activity: text(row.activity),
    audience: text(row.audience),
    outcome: text(row.outcome),
    date: text(row.date),
  };
}

function readProfile(userId: string) {
  const stored = getUserProfile(userId)?.profile_json;
  if (!stored) return EMPTY;
  try {
    // SAFETY: profile_json is written by this app as the same flat shape; anything else falls back to empty.
    return { ...EMPTY, ...(JSON.parse(stored) as typeof EMPTY) };
  } catch {
    return EMPTY;
  }
}

export const load = (({ locals }: Parameters<PageServerLoad>[0]): EditorData => {
  const user = locals.user;
  if (!user) throw error(401, 'Sign in required');
  if (user.role !== 'FACULTY') throw error(403, 'Only faculty can edit a report.');

  const period = ensureCurrentPeriod();
  const now = new Date();
  // Editing starts a report if this is the faculty member's first visit.
  const existing = getReportForPeriod(user.id, period.id);
  if (!existing) {
    const stamp = now.toISOString();
    insertReportOrIgnore({ id: randomUUID(), facultyId: user.id, periodId: period.id, createdAt: stamp, updatedAt: stamp });
  }
  const report = existing ?? getReportForPeriod(user.id, period.id);
  if (!report) throw error(500, 'Could not open the current report.');
  const full = getReportById(report.id) ?? report;
  const reportId = String(report.id);
  const policy = policyFor({ status: report.status, reopened_until: report.reopened_until }, now, undefined, {
    due_on: String(period.due_on),
    is_open: period.is_open,
  });

  const template = readProfile(user.id);

  return {
    reportId,
    reportStatus: report.status,
    periodLabel: computeWeekLabel(String(period.starts_on)),
    canEdit: policy.canEdit,
    deadline: policy.deadline.toISOString(),
    researchEmpty: Number(full.research_empty ?? 0) === 1,
    dutiesEmpty: Number(full.duties_empty ?? 0) === 1,
    outreachEmpty: Number(full.outreach_empty ?? 0) === 1,
    hasTemplate: Object.values(template).some((rows) => rows.length > 0),
    history: listReportHistory(user.id).map((h) => ({
      id: h.id,
      status: h.status,
      completion: h.completion,
      period_label: computeWeekLabel(String(h.starts_on)),
      period_id: h.period_id,
      updated_at: h.updated_at,
    })),
    teaching: listTeaching(reportId).map((t) => ({
      courseCode: t.course_code,
      courseName: t.course_name,
      programLevel: t.program_level,
      classType: t.class_type,
      scheduled: t.scheduled,
      conducted: t.conducted,
      missed: t.missed,
      missedAction: t.missed_action ?? '',
      syllabusCompletion: t.syllabus_completion ?? 0,
      syllabusLecture: t.syllabus_lecture ?? 0,
    })),
    research: listResearch(reportId).map(toResearchRecord),
    duties: listDuties(reportId).map(toDutyRecord),
    outreach: listOutreach(reportId).map(toOutreachRecord),
    reviews: listReviewsForReport(reportId).map((r) => ({
      decision: r.decision,
      remarks: r.remarks,
      created_at: r.created_at,
      reviewer_name: r.reviewer_name,
    })),
    attachments: listAttachments(reportId, user.id),
    template: {
      subjects: template.subjects,
      research: template.research,
      duties: template.duties,
      outreach: template.outreach,
    },
  };
}) satisfies PageServerLoad;
