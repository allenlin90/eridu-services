import { describe, expect, it } from 'vitest';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { hasStudioRouteAccess, STUDIO_ROUTE_ACCESS } from '../studio-route-access';

describe('studioRouteAccess', () => {
  it('keeps taskSetup separate from shows, since task setup is a mutation surface ACCOUNT_MANAGER must not reach', () => {
    expect(STUDIO_ROUTE_ACCESS.shows).toContain(STUDIO_ROLE.ACCOUNT_MANAGER);
    expect(STUDIO_ROUTE_ACCESS.taskSetup).not.toContain(STUDIO_ROLE.ACCOUNT_MANAGER);
    expect(hasStudioRouteAccess(STUDIO_ROLE.ACCOUNT_MANAGER, 'taskSetup')).toBe(false);
    expect(hasStudioRouteAccess(STUDIO_ROLE.MANAGER, 'taskSetup')).toBe(true);
    expect(hasStudioRouteAccess(STUDIO_ROLE.ADMIN, 'taskSetup')).toBe(true);
  });
});
