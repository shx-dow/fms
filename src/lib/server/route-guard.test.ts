import { describe, expect, it } from 'vitest';
import { computeRouteRedirect } from './route-guard';

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

  it('lets HOD reach admin overview and review queue but blocks admin-only pages', () => {
    expect(computeRouteRedirect('/admin', { role: 'HOD' })).toBeNull();
    expect(computeRouteRedirect('/admin/reports', { role: 'HOD' })).toBeNull();
    expect(computeRouteRedirect('/admin/settings', { role: 'HOD' })).toBe('/admin');
    expect(computeRouteRedirect('/admin/audit', { role: 'HOD' })).toBe('/admin');
    expect(computeRouteRedirect('/admin/faculty', { role: 'HOD' })).toBe('/admin');
    expect(computeRouteRedirect('/admin', { role: 'ADMIN' })).toBeNull();
    expect(computeRouteRedirect('/admin/settings', { role: 'ADMIN' })).toBeNull();
  });

  it('redirects logged-in users away from /login by role', () => {
    expect(computeRouteRedirect('/login', { role: 'ADMIN' })).toBe('/admin');
    expect(computeRouteRedirect('/login', { role: 'HOD' })).toBe('/dashboard');
    expect(computeRouteRedirect('/login', { role: 'FACULTY' })).toBe('/dashboard');
  });
});
