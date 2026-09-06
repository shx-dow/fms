export interface GuardUser {
  role: 'FACULTY' | 'HOD' | 'ADMIN';
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
  if (user.role === 'FACULTY' && path.startsWith('/admin')) return '/dashboard';
  if (user.role === 'HOD' && isAdminOnlyPath(path)) return '/admin';
  if (path === '/login') return user.role === 'ADMIN' ? '/admin' : '/dashboard';
  return null;
}

const ADMIN_ONLY_PREFIXES = ['/admin/faculty', '/admin/settings', '/admin/audit'];

function isAdminOnlyPath(path: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
