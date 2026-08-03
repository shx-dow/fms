import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserProfile, updateUserProfile } from '$lib/server/db/repositories/users';

const emptyProfile = { subjects: [], research: [], duties: [], outreach: [] };

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const stored = getUserProfile(locals.user.id)?.profile_json;
  try { return json({ profile: stored ? { ...emptyProfile, ...JSON.parse(stored) } : emptyProfile }); }
  catch { return json({ profile: emptyProfile }); }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== 'object') return json({ ok: false, error: 'Invalid profile.' }, { status: 400 });
  const profile = {
    subjects: Array.isArray(body.subjects) ? body.subjects : [],
    research: Array.isArray(body.research) ? body.research : [],
    duties: Array.isArray(body.duties) ? body.duties : [],
    outreach: Array.isArray(body.outreach) ? body.outreach : [],
  };
  updateUserProfile(locals.user.id, JSON.stringify(profile));
  return json({ ok: true, profile });
};
