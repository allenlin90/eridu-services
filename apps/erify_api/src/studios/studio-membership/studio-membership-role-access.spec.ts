import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioMembershipController } from './studio-membership.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';

describe('studioMembership role access metadata', () => {
  it('allows only ADMIN on studio membership helper roster endpoints', () => {
    const classRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioMembershipController,
    ) as string[];

    expect(classRoles).toEqual([
      STUDIO_ROLE.ADMIN,
    ]);
  });

  it('allows only ADMIN for role-change endpoint', () => {
    const methodRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioMembershipController.prototype.updateRole,
    ) as string[];

    expect(methodRoles).toEqual([STUDIO_ROLE.ADMIN]);
  });
});
