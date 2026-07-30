import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { StudioSceneProfileController } from './http/studio-scene-profile.controller';
import { StudioSceneQcConfirmationController } from './http/studio-scene-qc-confirmation.controller';
import { StudioSceneQcQueryController } from './http/studio-scene-qc-query.controller';
import { StudioSceneQcRecordsController } from './http/studio-scene-qc-records.controller';
import { StudioSceneQcReviewController } from './http/studio-scene-qc-review.controller';

import { STUDIO_ROLES_KEY } from '@/lib/decorators/studio-protected.decorator';

/**
 * Single, consolidated pass over the whole Scene QC route surface's
 * authorization contract, in place of five separate per-controller
 * assertions. Every Scene QC controller admits exactly
 * [DESIGNER, MANAGER, ADMIN], with no method-level narrowing/widening, and
 * MODERATION_MANAGER -- the one role the PRD explicitly excludes -- along
 * with the other non-Scene-QC roles must appear nowhere. See
 * apps/erify_api/docs/SCENE_QC.md for the full route/guard contract.
 */
const SCENE_QC_CONTROLLERS: Array<{
  name: string;
  controller: new (...args: never[]) => unknown;
  path: string;
  handlers: string[];
}> = [
  {
    name: 'StudioSceneProfileController',
    controller: StudioSceneProfileController,
    path: 'studios/:studioId/scene-profiles',
    handlers: ['show', 'save', 'retire'],
  },
  {
    name: 'StudioSceneQcQueryController',
    controller: StudioSceneQcQueryController,
    path: 'studios/:studioId/scene-qc',
    handlers: ['summary', 'items', 'itemDetail'],
  },
  {
    name: 'StudioSceneQcReviewController',
    controller: StudioSceneQcReviewController,
    path: 'studios/:studioId/scene-qc-reviews',
    handlers: ['create', 'update'],
  },
  {
    name: 'StudioSceneQcRecordsController',
    controller: StudioSceneQcRecordsController,
    path: 'studios/:studioId/scene-qc-records',
    handlers: ['list', 'detail'],
  },
  {
    name: 'StudioSceneQcConfirmationController',
    controller: StudioSceneQcConfirmationController,
    path: 'studios/:studioId/scene-qc-confirmations',
    handlers: ['confirm', 'report', 'reportCsv'],
  },
];

const EXPECTED_ROLES = [STUDIO_ROLE.DESIGNER, STUDIO_ROLE.MANAGER, STUDIO_ROLE.ADMIN];

const EXCLUDED_ROLES = [
  STUDIO_ROLE.MODERATION_MANAGER,
  STUDIO_ROLE.TALENT_MANAGER,
  STUDIO_ROLE.MEMBER,
  STUDIO_ROLE.ACCOUNT_MANAGER,
];

describe('scene QC authorization surface', () => {
  it.each(SCENE_QC_CONTROLLERS)(
    '$name admits exactly [DESIGNER, MANAGER, ADMIN] at $path with no method-level override',
    ({ controller, path, handlers }) => {
      const roles = Reflect.getMetadata(STUDIO_ROLES_KEY, controller);
      expect(roles).toEqual(EXPECTED_ROLES);

      const controllerPath = Reflect.getMetadata('path', controller);
      expect(controllerPath).toBe(path);

      for (const handlerName of handlers) {
        const handler = (controller.prototype as Record<string, unknown>)[handlerName];
        expect(typeof handler).toBe('function');
        // A method-level @StudioProtected() would win over the class-level
        // guard via Reflector#getAllAndOverride -- assert none is present so
        // a future narrower/wider override on a single handler is a visible
        // diff, not a silent authorization change.
        expect(Reflect.getMetadata(STUDIO_ROLES_KEY, handler as object)).toBeUndefined();
      }
    },
  );

  it('excludes MODERATION_MANAGER, TALENT_MANAGER, MEMBER, and ACCOUNT_MANAGER from every Scene QC controller', () => {
    for (const { controller } of SCENE_QC_CONTROLLERS) {
      const roles: string[] = Reflect.getMetadata(STUDIO_ROLES_KEY, controller);
      for (const excludedRole of EXCLUDED_ROLES) {
        expect(roles).not.toContain(excludedRole);
      }
    }
  });

  it('exposes exactly the five Scene QC controller routes', () => {
    const paths = SCENE_QC_CONTROLLERS.map(({ controller }) => Reflect.getMetadata('path', controller)).sort();
    expect(paths).toEqual(
      [
        'studios/:studioId/scene-profiles',
        'studios/:studioId/scene-qc',
        'studios/:studioId/scene-qc-confirmations',
        'studios/:studioId/scene-qc-records',
        'studios/:studioId/scene-qc-reviews',
      ].sort(),
    );
  });
});
