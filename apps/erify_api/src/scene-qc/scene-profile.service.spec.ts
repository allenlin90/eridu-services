import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { SceneMaterialRepository } from './persistence/scene-material.repository';
import { SceneProfileRepository } from './persistence/scene-profile.repository';
import { SceneProfileService } from './scene-profile.service';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createMockRepository, createMockUidGeneratorService } from '@/testing/model-service-test.helper';

// See scene-material.service.spec.ts for why this stub is sufficient for
// `@Transactional()` methods under unit test.
const mockPrismaForCls = { $transaction: jest.fn((callback: any) => callback({})) };

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

const now = new Date('2026-06-08T00:00:00.000Z');

function buildProfile(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 3n,
    uid: 'scprof_abc',
    clientId: 7n,
    client: { uid: 'client_1' },
    name: 'Default composition',
    description: null,
    status: 'ACTIVE',
    isDefault: false,
    sceneType: 'GRAPHIC_BG',
    version: 1,
    revisions: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('sceneProfileService', () => {
  let service: SceneProfileService;
  let profileRepository: jest.Mocked<SceneProfileRepository>;
  let materialRepository: jest.Mocked<SceneMaterialRepository>;

  beforeEach(async () => {
    profileRepository = createMockRepository<SceneProfileRepository>({
      findByUidForClient: jest.fn(),
      updateWithVersionCheck: jest.fn(),
      acquireClientDefaultLock: jest.fn(),
      clearActiveDefaultForClient: jest.fn(),
      appendRevision: jest.fn(),
      resolveStudioIds: jest.fn().mockResolvedValue(new Map()),
      resolvePlatformIds: jest.fn().mockResolvedValue(new Map()),
      resolveUserId: jest.fn(),
      findActiveDefaultForClient: jest.fn(),
      findActiveAssignedProfileForShow: jest.fn(),
    }) as any;
    materialRepository = createMockRepository<SceneMaterialRepository>({
      findRevisionsForClient: jest.fn(),
    }) as any;

    const module = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          plugins: [
            new ClsPluginTransactional({
              adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
              imports: [MockPrismaModule],
            }),
          ],
        }),
      ],
      providers: [
        SceneProfileService,
        { provide: SceneProfileRepository, useValue: profileRepository },
        { provide: SceneMaterialRepository, useValue: materialRepository },
        { provide: UidGeneratorService, useValue: createMockUidGeneratorService('scprev_new') },
      ],
    }).compile();

    service = module.get(SceneProfileService);
  });

  describe('saveComposition', () => {
    it('rejects a material revision owned by another Client', async () => {
      profileRepository.findByUidForClient.mockResolvedValue(buildProfile() as any);
      // Only 1 of the 2 requested revisions resolves under this Client — the
      // other belongs to a different Client (or does not exist).
      materialRepository.findRevisionsForClient.mockResolvedValue([
        { id: 1n, uid: 'scmrev_1', materialId: 10n, materialName: 'Logo', revision: 1 },
      ]);

      await expect(
        service.saveComposition(
          { profileUid: 'scprof_abc', clientUid: 'client_1' },
          {
            materials: [
              { materialRevisionUid: 'scmrev_1', sortOrder: 0 },
              { materialRevisionUid: 'scmrev_other_client', sortOrder: 1 },
            ],
            version: 1,
          },
        ),
      ).rejects.toMatchObject({ message: expect.stringContaining('SCENE_PROFILE_CROSS_CLIENT_MATERIAL') });

      expect(profileRepository.appendRevision).not.toHaveBeenCalled();
    });

    it('appends revision + 1 and snapshots profileName/sceneType', async () => {
      const existing = buildProfile({ name: 'Default composition', sceneType: 'REAL_BACKDROP', version: 2 });
      profileRepository.findByUidForClient.mockResolvedValue(existing as any);
      materialRepository.findRevisionsForClient.mockResolvedValue([
        { id: 1n, uid: 'scmrev_1', materialId: 10n, materialName: 'Logo', revision: 1 },
      ]);
      profileRepository.appendRevision.mockResolvedValue({ id: 55n, revision: 1 } as any);
      profileRepository.updateWithVersionCheck.mockResolvedValue(buildProfile({ version: 3 }) as any);

      await service.saveComposition(
        { profileUid: 'scprof_abc', clientUid: 'client_1' },
        { materials: [{ materialRevisionUid: 'scmrev_1', sortOrder: 0 }], version: 2 },
      );

      expect(profileRepository.appendRevision).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: existing.id,
          profileName: 'Default composition',
          sceneType: 'REAL_BACKDROP',
        }),
      );
      expect(profileRepository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: 'scprof_abc', clientUid: 'client_1', version: 2 },
        { version: 3 },
      );
    });

    it('defaults an unlabeled material link to the material name at composition time', async () => {
      profileRepository.findByUidForClient.mockResolvedValue(buildProfile() as any);
      materialRepository.findRevisionsForClient.mockResolvedValue([
        { id: 1n, uid: 'scmrev_1', materialId: 10n, materialName: 'Client Logo', revision: 1 },
      ]);
      profileRepository.appendRevision.mockResolvedValue({ id: 55n, revision: 1 } as any);
      profileRepository.updateWithVersionCheck.mockResolvedValue(buildProfile() as any);

      await service.saveComposition(
        { profileUid: 'scprof_abc', clientUid: 'client_1' },
        { materials: [{ materialRevisionUid: 'scmrev_1', sortOrder: 0 }], version: 1 },
      );

      expect(profileRepository.appendRevision).toHaveBeenCalledWith(
        expect.objectContaining({
          materials: [expect.objectContaining({ label: 'Client Logo' })],
        }),
      );
    });
  });

  describe('setClientDefault', () => {
    it('acquires the advisory lock before clearing, and clears exactly the prior default', async () => {
      const existing = buildProfile({ id: 3n, clientId: 7n, version: 1 });
      profileRepository.findByUidForClient.mockResolvedValue(existing as any);
      profileRepository.updateWithVersionCheck.mockResolvedValue(
        buildProfile({ isDefault: true, version: 2 }) as any,
      );

      const callOrder: string[] = [];
      profileRepository.acquireClientDefaultLock.mockImplementation(async () => {
        callOrder.push('lock');
      });
      profileRepository.clearActiveDefaultForClient.mockImplementation(async () => {
        callOrder.push('clear');
      });

      await service.setClientDefault({ profileUid: 'scprof_abc', clientUid: 'client_1' });

      expect(callOrder).toEqual(['lock', 'clear']);
      expect(profileRepository.acquireClientDefaultLock).toHaveBeenCalledWith(7n);
      expect(profileRepository.clearActiveDefaultForClient).toHaveBeenCalledWith(7n, 3n);
    });
  });

  describe('updateProfile', () => {
    it('maps a version conflict to HttpError 409', async () => {
      profileRepository.findByUidForClient.mockResolvedValue(buildProfile() as any);
      profileRepository.updateWithVersionCheck.mockRejectedValue(new VersionConflictError('stale', 1, 2));

      await expect(
        service.updateProfile({ profileUid: 'scprof_abc', clientUid: 'client_1' }, { name: 'New', version: 1 }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });
});
