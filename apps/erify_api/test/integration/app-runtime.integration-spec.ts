import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminUserController } from '@/admin/users/admin-user.controller';
import { AppModule } from '@/app.module';
import { BackdoorUserController } from '@/backdoor/users/backdoor-user.controller';
import { StudioSceneProfileController } from '@/capabilities/scene-qc/http/studio-scene-profile.controller';
import { StudioSceneQcConfirmationController } from '@/capabilities/scene-qc/http/studio-scene-qc-confirmation.controller';
import { StudioSceneQcQueryController } from '@/capabilities/scene-qc/http/studio-scene-qc-query.controller';
import { StudioSceneQcRecordsController } from '@/capabilities/scene-qc/http/studio-scene-qc-records.controller';
import { StudioSceneQcReviewController } from '@/capabilities/scene-qc/http/studio-scene-qc-review.controller';
import { GoogleSheetsCreatorController } from '@/google-sheets/creators/google-sheets-creator.controller';
import { ProfileController } from '@/me/profile/profile.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { StudioShowController } from '@/studios/studio-show/studio-show.controller';
import { StudioShowIssueController } from '@/studios/studio-show-issue/studio-show-issue.controller';

/**
 * Extracts every registered Express route's method + path from the booted
 * app's router stack, skipping the body-parser and Nest catch-all layers
 * (which carry no `route`, or a `/{*path}` wildcard route matching every
 * method). This is the runtime proof that a controller is actually wired
 * into the app's route table, not just importable.
 */
function listRegisteredRoutes(app: INestApplication): { method: string; path: string }[] {
  const server = app.getHttpServer();
  const router = server._events.request._router ?? server._events.request.router;

  return router.stack
    .filter((layer: any) => layer.route && layer.route.path !== '/{*path}')
    .flatMap((layer: any) => Object.keys(layer.route.methods)
      .filter((method) => layer.route.methods[method])
      .map((method) => ({ method: method.toUpperCase(), path: layer.route.path as string })));
}

describe('HTTP application module graph', () => {
  let moduleRef: TestingModule;
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    } else {
      await moduleRef?.close();
    }
  });

  it('boots every composition-root child with the real Prisma provider', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    expect(app.get(AdminUserController)).toBeInstanceOf(AdminUserController);
    expect(app.get(BackdoorUserController)).toBeInstanceOf(BackdoorUserController);
    expect(app.get(GoogleSheetsCreatorController)).toBeInstanceOf(
      GoogleSheetsCreatorController,
    );
    expect(app.get(ProfileController)).toBeInstanceOf(ProfileController);
    expect(app.get(StudioShowController)).toBeInstanceOf(StudioShowController);
    expect(app.get(StudioShowIssueController)).toBeInstanceOf(StudioShowIssueController);
    await expect(
      app.get(PrismaService).isHealthy(),
    ).resolves.toBe(true);
  });

  it('resolves the five Scene QC controllers and serves no deleted PR #319 Scene Review route', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    expect(app.get(StudioSceneProfileController)).toBeInstanceOf(StudioSceneProfileController);
    expect(app.get(StudioSceneQcQueryController)).toBeInstanceOf(StudioSceneQcQueryController);
    expect(app.get(StudioSceneQcReviewController)).toBeInstanceOf(StudioSceneQcReviewController);
    expect(app.get(StudioSceneQcRecordsController)).toBeInstanceOf(StudioSceneQcRecordsController);
    expect(app.get(StudioSceneQcConfirmationController)).toBeInstanceOf(
      StudioSceneQcConfirmationController,
    );

    // Enumerate the real route table rather than importing the deleted
    // StudioSceneReviewController -- importing it would not compile, which
    // is a weaker and less legible proof that the surface is gone.
    const routes = listRegisteredRoutes(app);
    const sceneReviewRoutes = routes.filter(
      ({ path }) => path === '/studios/:studioId/scene-review'
        || path === '/studios/:studioId/scene-review/:taskId',
    );
    expect(sceneReviewRoutes).toEqual([]);

    // Sanity check that the enumeration itself works: the surviving Scene
    // QC capability's routes are present.
    expect(routes).toEqual(
      expect.arrayContaining([
        { method: 'GET', path: '/studios/:studioId/scene-profiles/:clientId' },
        { method: 'GET', path: '/studios/:studioId/scene-qc/summary' },
      ]),
    );
  });
});
