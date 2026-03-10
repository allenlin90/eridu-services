import { describe, expect, it } from 'vitest';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { hasStudioRouteAccess } from '../studio-route-access';

describe('hasStudioRouteAccess', () => {
  it('allows admin, manager, and talent manager on shows route', () => {
    expect(hasStudioRouteAccess(STUDIO_ROLE.ADMIN, 'shows')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.MANAGER, 'shows')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.TALENT_MANAGER, 'shows')).toBe(false);
  });

  it('denies member/designer/moderation manager on shows route', () => {
    expect(hasStudioRouteAccess(STUDIO_ROLE.MEMBER, 'shows')).toBe(false);
    expect(hasStudioRouteAccess(STUDIO_ROLE.DESIGNER, 'shows')).toBe(false);
    expect(hasStudioRouteAccess(STUDIO_ROLE.MODERATION_MANAGER, 'shows')).toBe(false);
  });

  it('allows admin, manager, and talent manager on creators route', () => {
    expect(hasStudioRouteAccess(STUDIO_ROLE.ADMIN, 'creators')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.MANAGER, 'creators')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.TALENT_MANAGER, 'creators')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.MEMBER, 'creators')).toBe(false);
  });

  it('keeps tasks route as manager/admin only', () => {
    expect(hasStudioRouteAccess(STUDIO_ROLE.MANAGER, 'tasks')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.ADMIN, 'tasks')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.TALENT_MANAGER, 'tasks')).toBe(false);
  });

  it('allows non-manager roles to access member-level routes', () => {
    expect(hasStudioRouteAccess(STUDIO_ROLE.TALENT_MANAGER, 'dashboard')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.DESIGNER, 'myTasks')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.MODERATION_MANAGER, 'myShifts')).toBe(true);
  });

  it('keeps members route as admin only', () => {
    expect(hasStudioRouteAccess(STUDIO_ROLE.ADMIN, 'members')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.MANAGER, 'members')).toBe(false);
    expect(hasStudioRouteAccess(STUDIO_ROLE.MEMBER, 'members')).toBe(false);
    expect(hasStudioRouteAccess(STUDIO_ROLE.TALENT_MANAGER, 'members')).toBe(false);
  });
});
