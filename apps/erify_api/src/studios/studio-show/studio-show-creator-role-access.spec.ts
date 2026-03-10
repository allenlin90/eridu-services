import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioShowCreatorController } from './studio-show-creator.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';

describe('studioShowCreator role access metadata', () => {
  it('allows ADMIN, MANAGER, and TALENT_MANAGER on show creator endpoints', () => {
    const classRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioShowCreatorController,
    ) as string[];

    expect(classRoles).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
  });
});
