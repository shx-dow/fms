import { describe, expect, it } from 'vitest';
import { computeRouteRedirect, isBlockedDuringPasswordReset } from './route-guard';

describe('computeRouteRedirect', () => {
  it('lets anonymous users reach public paths', () => {
    expect(computeRouteRedirect('/login', null)).toBeNull();
    expect(computeRouteRedirect('/logout', null)).toBeNull();
    expect(computeRouteRedirect('/_app/immutable/entry.js', null)).toBeNull();
  });

  it('redirects anonymous users off protected paths, carrying the next param', () => {
    expect(computeRouteRedirect('/dashboard', null)).toBe('/login?next=%2Fdashboard');
    expect(computeRouteRedirect('/admin/settings', null)).toBe('/login?next=%2Fadmin%2Fsettings');
  });

  it('blocks FACULTY from /admin', () => {
    expect(computeRouteRedirect('/admin', { role: 'FACULTY' })).toBe('/dashboard');
    expect(computeRouteRedirect('/dashboard', { role: 'FACULTY' })).toBeNull();
  });

  it('lets every teaching role reach /reports, and keeps ADMIN out', () => {
    for (const path of ['/reports', '/reports/current', '/reports/current/print', '/reports/abc']) {
      expect(computeRouteRedirect(path, { role: 'FACULTY' })).toBeNull();
      // A department head teaches too, so they get the report pages as well.
      expect(computeRouteRedirect(path, { role: 'HOD' })).toBeNull();
      // ADMIN is the director or dean: they review, and do not file a report.
      expect(computeRouteRedirect(path, { role: 'ADMIN' })).toBe('/admin');
    }
  });

  it('lets HOD reach admin overview and review queue but blocks admin-only pages', () => {
    expect(computeRouteRedirect('/admin', { role: 'HOD' })).toBeNull();
    expect(computeRouteRedirect('/admin/reports', { role: 'HOD' })).toBeNull();
    expect(computeRouteRedirect('/admin/faculty/123', { role: 'HOD' })).toBe('/admin');
    expect(computeRouteRedirect('/admin/settings/x', { role: 'HOD' })).toBe('/admin');
    expect(computeRouteRedirect('/admin/settings', { role: 'HOD' })).toBe('/admin');
    expect(computeRouteRedirect('/admin/audit', { role: 'HOD' })).toBe('/admin');
    expect(computeRouteRedirect('/admin/faculty', { role: 'HOD' })).toBe('/admin');
  });

  it('lets ADMIN reach admin-only pages', () => {
    expect(computeRouteRedirect('/admin', { role: 'ADMIN' })).toBeNull();
    expect(computeRouteRedirect('/admin/settings', { role: 'ADMIN' })).toBeNull();
  });

  it('redirects logged-in users away from /login by role', () => {
    expect(computeRouteRedirect('/login', { role: 'ADMIN' })).toBe('/admin');
    expect(computeRouteRedirect('/login', { role: 'HOD' })).toBe('/dashboard');
    expect(computeRouteRedirect('/login', { role: 'FACULTY' })).toBe('/dashboard');
  });

  it('forces temporary-password holders to the change page', () => {
    const forced = { role: 'FACULTY' as const, mustChangePassword: true };
    expect(computeRouteRedirect('/dashboard', forced)).toBe('/change-password');
    expect(computeRouteRedirect('/admin', forced)).toBe('/change-password');
    expect(computeRouteRedirect('/reports/current', forced)).toBe('/change-password');
    expect(computeRouteRedirect('/change-password', forced)).toBeNull();
    expect(computeRouteRedirect('/logout', forced)).toBeNull();
    expect(computeRouteRedirect('/api/me/password', forced)).toBeNull();
    expect(computeRouteRedirect('/dashboard', { role: 'FACULTY' as const })).toBeNull();
  });

  it('sends ADMIN to the administration overview instead of the empty reporter dashboard', () => {
    // ADMIN files no report, so /dashboard would render no cards at all.
    expect(computeRouteRedirect('/dashboard', { role: 'ADMIN' })).toBe('/admin');
    expect(computeRouteRedirect('/dashboard/weeks', { role: 'ADMIN' })).toBe('/admin');
    expect(computeRouteRedirect('/dashboard', { role: 'HOD' })).toBeNull();
  });
});

describe('isBlockedDuringPasswordReset', () => {
  const forced = { role: 'FACULTY' as const, mustChangePassword: true };

  it('refuses the API surface while a temporary password is in force', () => {
    // The API used to be waved through wholesale, which let a temporary-password
    // holder reach every data route. It has to be answered with 403, not a redirect.
    for (const path of [
      '/api/periods',
      '/api/reports',
      '/api/reviews',
      '/api/dashboard/weeks',
      '/api/attachments',
    ]) {
      expect(isBlockedDuringPasswordReset(path, forced)).toBe(true);
    }
  });

  it('still allows the calls needed to clear the temporary password', () => {
    for (const path of ['/api/me/password', '/api/me/profile', '/api/notifications', '/api/health']) {
      expect(isBlockedDuringPasswordReset(path, forced)).toBe(false);
    }
  });

  it('never blocks pages, and never blocks an account with no forced reset', () => {
    expect(isBlockedDuringPasswordReset('/dashboard', forced)).toBe(false);
    expect(isBlockedDuringPasswordReset('/api/reports', { role: 'FACULTY' })).toBe(false);
    expect(isBlockedDuringPasswordReset('/api/reports', null)).toBe(false);
  });
});
