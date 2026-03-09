import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioMcController } from './studio-mc.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';

describe('studioMc role access metadata', () => {
  it('allows TALENT_MANAGER for roster CRUD endpoints', () => {
    const catalogRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioMcController.prototype.catalog,
    ) as string[];
    const listRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioMcController.prototype.listRoster,
    ) as string[];
    const createRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioMcController.prototype.addToRoster,
    ) as string[];
    const updateRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioMcController.prototype.updateRoster,
    ) as string[];
    const deleteRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioMcController.prototype.removeFromRoster,
    ) as string[];

    const expected = [
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ];

    expect(catalogRoles).toEqual(expected);
    expect(listRoles).toEqual(expected);
    expect(createRoles).toEqual(expected);
    expect(updateRoles).toEqual(expected);
    expect(deleteRoles).toEqual(expected);
  });
});
