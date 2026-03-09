import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioShowController } from './studio-show.controller';
import { StudioShowCreatorController } from './studio-show-creator.controller';
import { StudioShowMcController } from './studio-show-mc.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';

describe('studioShow role access metadata', () => {
  it('allows TALENT_MANAGER for bulk MC assignment endpoint', () => {
    const appendRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioShowController.prototype.bulkAppendMcs,
    ) as string[];
    const replaceRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioShowController.prototype.bulkReplaceMcs,
    ) as string[];

    expect(appendRoles).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
    expect(replaceRoles).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
  });

  it('allows TALENT_MANAGER for add/remove show MC endpoints', () => {
    const addRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioShowMcController.prototype.addMc,
    ) as string[];
    const removeRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioShowMcController.prototype.removeMc,
    ) as string[];

    expect(addRoles).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
    expect(removeRoles).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
  });

  it('keeps creator alias add/remove endpoints aligned', () => {
    const addRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioShowCreatorController.prototype.addCreator,
    ) as string[];
    const removeRoles = Reflect.getMetadata(
      STUDIO_ROLES_KEY,
      StudioShowCreatorController.prototype.removeCreator,
    ) as string[];

    expect(addRoles).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
    expect(removeRoles).toEqual([
      STUDIO_ROLE.ADMIN,
      STUDIO_ROLE.MANAGER,
      STUDIO_ROLE.TALENT_MANAGER,
    ]);
  });
});
