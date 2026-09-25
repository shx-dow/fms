import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listUsers, type UserWithDepartment } from '$lib/server/db/repositories/users';

export interface FacultyDirectoryData {
  users: UserWithDepartment[];
}

export const load = (({ locals }: Parameters<PageServerLoad>[0]): FacultyDirectoryData => {
  if (locals.user?.role !== 'ADMIN') throw error(403, 'Only Admin may manage users.');
  return { users: listUsers() };
}) satisfies PageServerLoad;
