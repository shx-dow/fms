import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api';
import { getUserProfile, updateUserProfile } from '$lib/server/db/repositories/users';

const emptyProfile = { subjects: [], research: [], duties: [], outreach: [] };

const profileSchema = z.object({
  subjects: z.array(z.unknown()).default([]),
  research: z.array(z.unknown()).default([]),
  duties: z.array(z.unknown()).default([]),
  outreach: z.array(z.unknown()).default([]),
});

export const GET: RequestHandler = ({ locals }) => {
  const user = requireUser(locals);
  const stored = getUserProfile(user.id)?.profile_json;
  try { return json({ profile: stored ? { ...emptyProfile, ...JSON.parse(stored) } : emptyProfile }); }
  catch { return json({ profile: emptyProfile }); }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireUser(locals);
  const parsed = profileSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ ok: false, error: 'Invalid profile.' }, { status: 400 });
  const profile = parsed.data;
  updateUserProfile(user.id, JSON.stringify(profile));
  return json({ ok: true, profile });
};
