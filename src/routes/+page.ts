import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ parent }) => {
  // ADMIN files no report, so the reporter dashboard would be empty for them.
  // Sending them straight to the administration overview avoids a redirect hop
  // through a page that has nothing to show.
  return parent().then(({ user }) => {
    redirect(307, user?.role === 'ADMIN' ? '/admin' : '/dashboard');
  });
};
