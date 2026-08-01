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
  if (path === '/login') return user.role === 'ADMIN' ? '/admin' : '/dashboard';
  return null;
}
