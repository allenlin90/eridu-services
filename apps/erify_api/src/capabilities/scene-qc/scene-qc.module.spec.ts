import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MODULE_METADATA } from '@nestjs/common/constants';

import { StudioSceneProfileController } from './http/studio-scene-profile.controller';
import { StudioSceneQcQueryController } from './http/studio-scene-qc-query.controller';
import { StudioSceneQcReviewController } from './http/studio-scene-qc-review.controller';
import { SceneProfileService } from './scene-profile.service';
import { SceneQcModule } from './scene-qc.module';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import { SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';
import { SceneQcHttpModule } from './scene-qc-http.module';
import { SceneQcQueryService } from './scene-qc-query.service';
import { SceneQcRepository } from './scene-qc-review.repository';
import { SceneQcWorkflowService } from './scene-qc-review-workflow.service';

import { StorageModule } from '@/lib/storage/storage.module';
import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { ClientModule } from '@/models/client/client.module';
import { ShowModule } from '@/models/show/show.module';
import { UserModule } from '@/models/user/user.module';
import { PrismaModule } from '@/prisma/prisma.module';

describe('sceneQcModule', () => {
  it('exports exactly the Scene Profile, Scene QC query, and Scene QC workflow capability services', () => {
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      SceneQcModule,
    ) as unknown[];

    expect(exports).toEqual([SceneProfileService, SceneQcQueryService, SceneQcWorkflowService]);
  });

  it('registers no HTTP controllers -- the HTTP module owns that', () => {
    const controllers = (Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      SceneQcModule,
    ) ?? []) as unknown[];

    expect(controllers).toEqual([]);
  });

  it('imports only the foundation modules it needs, and never AuditModule -- Child PR 3 adds no new module import', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      SceneQcModule,
    ) as unknown[];

    expect(imports).toEqual([PrismaModule, UidGeneratorModule, StorageModule, UserModule]);
    expect(imports.map((m: any) => m.name)).not.toContain('AuditModule');
  });

  it('provides SceneQcAuditWriter, SceneQcRepository, and SceneQcEvidenceResolver privately -- present in providers, absent from exports', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      SceneQcModule,
    ) as unknown[];
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      SceneQcModule,
    ) as unknown[];

    expect(providers).toContain(SceneQcAuditWriter);
    expect(providers).toContain(SceneQcRepository);
    expect(providers).toContain(SceneQcEvidenceResolver);
    expect(exports).not.toContain(SceneQcAuditWriter);
    expect(exports).not.toContain(SceneQcRepository);
    expect(exports).not.toContain(SceneQcEvidenceResolver);
  });

  it('keeps persistence private — no exported provider is a repository', () => {
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      SceneQcModule,
    ) as { name: string }[];

    for (const exported of exports) {
      expect(exported.name.endsWith('Repository')).toBe(false);
    }
  });
});

describe('sceneQcHttpModule', () => {
  it('registers exactly the Scene Profile, Scene QC query, and Scene QC review controllers', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      SceneQcHttpModule,
    ) as unknown[];

    expect(controllers).toEqual([
      StudioSceneProfileController,
      StudioSceneQcQueryController,
      StudioSceneQcReviewController,
    ]);
  });

  it('imports the capability module plus the linkage-check dependencies', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      SceneQcHttpModule,
    ) as unknown[];

    expect(imports).toEqual([SceneQcModule, ClientModule, ShowModule]);
  });
});

describe('scene QC registration in the app composition root', () => {
  it('is registered transitively via StudiosModule importing SceneQcHttpModule, not directly in AppModule', () => {
    // Reads source as text rather than importing app.module.ts / studios.module.ts:
    // importing app.module.ts evaluates its top-level `ConfigModule.forRoot({
    // validate })` call as a side effect of the `@Module` decorator, which
    // requires a fully populated `.env` (R2, BACKDOOR_API_KEY, ...) that this
    // unit-test environment does not provide. A source-text check proves the
    // same claim without paying that cost.
    const appModuleSource = readFileSync(
      join(__dirname, '..', '..', 'app.module.ts'),
      'utf-8',
    );
    const studiosModuleSource = readFileSync(
      join(__dirname, '..', '..', 'studios', 'studios.module.ts'),
      'utf-8',
    );

    expect(appModuleSource).not.toContain('SceneQcModule');
    expect(appModuleSource).not.toContain('SceneQcHttpModule');
    expect(studiosModuleSource).toContain('SceneQcHttpModule');
  });
});
