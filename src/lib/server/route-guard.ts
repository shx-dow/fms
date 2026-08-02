export interface GuardUser {
  role: 'FACULTY' | 'HOD' | 'ADMIN';
}

export function computeRouteRedirect(path: string, user: GuardUser | null): string | null {
  if (!user) {
    const isPublic =
      path === '/login' || path.startsWith('/api/auth') || path === '/logout' || path.startsWith('/_app');
    if (!isPublic) return `/login?next=${encodeURIComponent(path)}`;
    return null;
  }
  if (user.role === 'FACULTY' && path.startsWith('/admin')) return '/dashboard';
  if (user.role === 'HOD' && isAdminOnlyPath(path)) return '/admin';
  if (path === '/login') return user.role === 'ADMIN' ? '/admin' : '/dashboard';
  return null;
}

export function isAdminOnlyPath(path: string): boolean {
  return (
    path === '/admin/faculty' ||
    path.startsWith('/admin/faculty') ||
    path === '/admin/settings' ||
    path.startsWith('/admin/settings') ||
    path === '/admin/audit' ||
    path.startsWith('/admin/audit')
  );
}
