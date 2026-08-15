import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { getUserProfile, updateUserProfile } from '$lib/server/db/repositories/users';

const emptyProfile = { subjects: [], research: [], duties: [], outreach: [] };

const profileSchema = z.object({
  subjects: z.array(z.unknown()).default([]),
  research: z.array(z.unknown()).default([]),
  duties: z.array(z.unknown()).default([]),
  outreach: z.array(z.unknown()).default([]),
});

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const stored = getUserProfile(locals.user.id)?.profile_json;
  try { return json({ profile: stored ? { ...emptyProfile, ...JSON.parse(stored) } : emptyProfile }); }
  catch { return json({ profile: emptyProfile }); }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ ok: false, error: 'Invalid profile.' }, { status: 400 });
  const profile = parsed.data;
  updateUserProfile(locals.user.id, JSON.stringify(profile));
  return json({ ok: true, profile });
};
