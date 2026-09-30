export interface GuardUser {
  role: 'FACULTY' | 'HOD' | 'ADMIN';
  mustChangePassword?: boolean;
}

// While a temporary password is in force, the account may still do exactly the
// things needed to clear it: read and update its own profile and password, poll
// its own notifications, and sign out. Everything else, including every other
// API route, is refused.
const PASSWORD_CHANGE_ALLOWED = [
  '/change-password',
  '/logout',
  '/api/me/password',
  '/api/me/profile',
  '/api/notifications',
  '/api/health',
];

function isPasswordChangeAllowed(path: string): boolean {
  return PASSWORD_CHANGE_ALLOWED.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * True when a request must be refused with 403 because the caller is still on a
 * temporary password. Returned separately from computeRouteRedirect because an
 * API route must be answered with a status, not a redirect to an HTML page.
 */
export function isBlockedDuringPasswordReset(path: string, user: GuardUser | null): boolean {
  if (!user?.mustChangePassword) return false;
  if (!path.startsWith('/api/')) return false;
  return !isPasswordChangeAllowed(path);
}

export function computeRouteRedirect(path: string, user: GuardUser | null): string | null {
  if (!user) {
    const isPublic =
      path === '/login' ||
      path === '/api/health' ||
      path === '/logout' ||
      path.startsWith('/_app');
    if (!isPublic) return `/login?next=${encodeURIComponent(path)}`;
    return null;
  }
  if (user.mustChangePassword && !isPasswordChangeAllowed(path)) {
    if (!path.startsWith('/api/')) return '/change-password';
    return null;
  }
  if (user.role === 'FACULTY' && path.startsWith('/admin')) return '/dashboard';
  // A department head teaches too, so HOD gets the report pages. Only ADMIN
  // (director or dean) does not file a report, so it is the only role kept out.
  if (user.role === 'ADMIN' && path.startsWith('/reports')) return '/admin';
  // ADMIN files no report, so the reporter dashboard would render an empty
  // page. The administration overview is the landing page for this role.
  if (user.role === 'ADMIN' && (path === '/dashboard' || path.startsWith('/dashboard/'))) return '/admin';
  if (user.role === 'HOD' && isAdminOnlyPath(path)) return '/admin';
  // Reviewing belongs to the HOD. ADMIN looks after the system, so it is kept
  // out of the reporting flow rather than appearing in a review queue.
  if (user.role === 'ADMIN' && (path === '/admin/reports' || path.startsWith('/admin/reports/'))) return '/admin';
  if (path === '/login') return user.role === 'ADMIN' ? '/admin' : '/dashboard';
  return null;
}

const ADMIN_ONLY_PREFIXES = ['/admin/faculty', '/admin/settings', '/admin/audit'];

function isAdminOnlyPath(path: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
