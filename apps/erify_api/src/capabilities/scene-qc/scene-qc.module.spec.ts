import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MODULE_METADATA } from '@nestjs/common/constants';

import { SceneProfileService } from './scene-profile.service';
import { SceneQcModule } from './scene-qc.module';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';

describe('sceneQcModule', () => {
  it('exports only the Scene Profile capability service', () => {
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      SceneQcModule,
    ) as unknown[];

    expect(exports).toEqual([SceneProfileService]);
  });

  it('registers no HTTP controllers — this PR ships no routes', () => {
    const controllers = (Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      SceneQcModule,
    ) ?? []) as unknown[];

    expect(controllers).toEqual([]);
  });

  it('imports only the foundation modules it needs', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      SceneQcModule,
    ) as unknown[];

    expect(imports).toEqual([PrismaModule, UidGeneratorModule]);
  });

  it('keeps persistence private — no exported provider is a repository', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      SceneQcModule,
    ) as { name: string }[];

    for (const provider of providers) {
      expect(provider.name.endsWith('Repository')).toBe(false);
    }
  });

  it('is not yet registered in AppModule — this PR ships no controllers or public routes', () => {
    // Reads app.module.ts as text rather than importing it: importing the
    // module evaluates its top-level `ConfigModule.forRoot({ validate })`
    // call as a side effect of the `@Module` decorator, which requires a
    // fully populated `.env` (R2, BACKDOOR_API_KEY, ...) that this unit-test
    // environment does not provide. A source-text check proves the same
    // claim — no import, no reference in the composition root — without
    // paying that cost. `app-runtime.integration-spec.ts` covers the real
    // module graph under the guarded real-database gate.
    const appModuleSource = readFileSync(
      join(__dirname, '..', '..', 'app.module.ts'),
      'utf-8',
    );

    expect(appModuleSource).not.toContain('SceneQcModule');
  });
});
