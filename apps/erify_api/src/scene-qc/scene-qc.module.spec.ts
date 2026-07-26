import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { UID_PREFIXES } from '@eridu/api-types/constants';

import { SceneMaterialRepository } from './persistence/scene-material.repository';
import { SceneProfileRepository } from './persistence/scene-profile.repository';
import { SceneProfileAssignmentRepository } from './persistence/scene-profile-assignment.repository';
import { SceneMaterialService } from './scene-material.service';
import { SceneProfileService } from './scene-profile.service';
import { SceneProfileAssignmentService } from './scene-profile-assignment.service';
import { SceneQcModule } from './scene-qc.module';
import {
  SCENE_MATERIAL_REVISION_UID_PREFIX,
  SCENE_MATERIAL_UID_PREFIX,
  SCENE_PROFILE_ASSIGNMENT_UID_PREFIX,
  SCENE_PROFILE_REVISION_UID_PREFIX,
  SCENE_PROFILE_UID_PREFIX,
} from './scene-qc-uid.util';

import { UidGeneratorModule } from '@/lib/uid/uid-generator.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

// `@Transactional()`-decorated methods and `TransactionHost`-injecting
// repositories need a working ClsService + adapter in the DI graph to
// resolve; the mocked repositories never touch the real Prisma client, so
// `$transaction` here is a stub, not a functional fixture (see
// scene-material.service.spec.ts for the same pattern).
const mockPrismaForCls = { $transaction: jest.fn((callback: any) => callback({})) };

describe('sceneQcModule', () => {
  it('exports exactly the three capability services and no repository', () => {
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, SceneQcModule) as unknown[];

    expect(exports).toEqual([SceneMaterialService, SceneProfileService, SceneProfileAssignmentService]);
    expect(exports).not.toContain(SceneMaterialRepository);
    expect(exports).not.toContain(SceneProfileRepository);
    expect(exports).not.toContain(SceneProfileAssignmentRepository);
  });

  it('registers no HTTP controllers (Child PR 1 ships persistence only)', () => {
    const controllers = (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, SceneQcModule) ?? []) as unknown[];

    expect(controllers).toEqual([]);
  });

  it('imports only the expected shared infra modules', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, SceneQcModule) as unknown[];

    expect(imports).toEqual([PrismaModule, UidGeneratorModule]);
  });

  it('resolves every provider when the module is compiled standalone', async () => {
    // SceneQcModule's own repositories inject `TransactionHost`, which is
    // only supplied by the app-wide `ClsPluginTransactional` wiring (owned by
    // AppModule, not by SceneQcModule itself) — supply it here the same way
    // AppModule does, with the real `PrismaService` swapped for a stub.
    const moduleRef = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          plugins: [
            new ClsPluginTransactional({
              adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
              imports: [PrismaModule],
            }),
          ],
        }),
        SceneQcModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaForCls)
      .compile();

    expect(moduleRef.get(SceneMaterialService)).toBeInstanceOf(SceneMaterialService);
    expect(moduleRef.get(SceneProfileService)).toBeInstanceOf(SceneProfileService);
    expect(moduleRef.get(SceneProfileAssignmentService)).toBeInstanceOf(SceneProfileAssignmentService);

    await moduleRef.close();
  });
});

describe('scene-qc UID prefixes', () => {
  const prefixes = [
    SCENE_MATERIAL_UID_PREFIX,
    SCENE_MATERIAL_REVISION_UID_PREFIX,
    SCENE_PROFILE_UID_PREFIX,
    SCENE_PROFILE_REVISION_UID_PREFIX,
    SCENE_PROFILE_ASSIGNMENT_UID_PREFIX,
  ];

  it('no prefix is a string prefix of another (unambiguous UID sniffing)', () => {
    for (const a of prefixes) {
      for (const b of prefixes) {
        if (a === b) {
          continue;
        }
        expect(b.startsWith(a)).toBe(false);
      }
    }
  });

  it('matches the corresponding entry in the shared UID_PREFIXES registry', () => {
    expect(SCENE_MATERIAL_UID_PREFIX).toBe(UID_PREFIXES.SCENE_MATERIAL);
    expect(SCENE_MATERIAL_REVISION_UID_PREFIX).toBe(UID_PREFIXES.SCENE_MATERIAL_REVISION);
    expect(SCENE_PROFILE_UID_PREFIX).toBe(UID_PREFIXES.SCENE_PROFILE);
    expect(SCENE_PROFILE_REVISION_UID_PREFIX).toBe(UID_PREFIXES.SCENE_PROFILE_REVISION);
    expect(SCENE_PROFILE_ASSIGNMENT_UID_PREFIX).toBe(UID_PREFIXES.SCENE_PROFILE_ASSIGNMENT);
  });
});
