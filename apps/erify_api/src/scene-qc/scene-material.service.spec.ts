import { Module } from '@nestjs/common';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';

import { SceneMaterialRepository } from './persistence/scene-material.repository';
import { SceneMaterialService } from './scene-material.service';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { PrismaService } from '@/prisma/prisma.service';
import {
  createMockRepository,
  createMockUidGeneratorService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';

// `appendMaterialRevision` is `@Transactional()`; the decorator only needs a
// working ClsService + adapter in the DI graph to execute. The mocked
// repository never touches the real Prisma client, so `$transaction` here is
// a stub, not a functional fixture.
const mockPrismaForCls = { $transaction: jest.fn((callback: any) => callback({})) };

@Module({
  providers: [{ provide: PrismaService, useValue: mockPrismaForCls }],
  exports: [PrismaService],
})
class MockPrismaModule {}

const now = new Date('2026-06-08T00:00:00.000Z');

function buildMaterial(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 1n,
    uid: 'scmat_abc',
    client: { uid: 'client_1' },
    name: 'Client logo',
    status: 'ACTIVE',
    version: 1,
    revisions: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('sceneMaterialService', () => {
  let service: SceneMaterialService;
  let repository: jest.Mocked<SceneMaterialRepository>;

  beforeEach(async () => {
    const repositoryMock = createMockRepository<SceneMaterialRepository>({
      findByUidForClient: jest.fn(),
      updateWithVersionCheck: jest.fn(),
      appendRevision: jest.fn(),
      resolveUserId: jest.fn(),
    });

    const module = await createModelServiceTestModule({
      serviceClass: SceneMaterialService,
      repositoryClass: SceneMaterialRepository,
      repositoryMock,
      uidGeneratorMock: createMockUidGeneratorService('scmat_test'),
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
    });

    service = module.get(SceneMaterialService);
    repository = module.get(SceneMaterialRepository);
  });

  describe('appendMaterialRevision', () => {
    it('rejects a non-image MIME type before touching persistence', async () => {
      await expect(
        service.appendMaterialRevision(
          { materialUid: 'scmat_abc', clientUid: 'client_1' },
          {
            objectKey: 'k',
            fileUrl: 'https://cdn/k',
            mimeType: 'application/pdf',
            fileSize: 10,
            version: 0,
          },
        ),
      ).rejects.toThrow(/mime type/i);

      expect(repository.findByUidForClient).not.toHaveBeenCalled();
      expect(repository.appendRevision).not.toHaveBeenCalled();
    });

    it('never mutates a prior revision — it only appends and bumps the material version', async () => {
      const existing = buildMaterial({ version: 2 });
      repository.findByUidForClient.mockResolvedValue(existing as any);
      repository.appendRevision.mockResolvedValue({ id: 9n, revision: 1 } as any);
      repository.updateWithVersionCheck.mockResolvedValue(buildMaterial({ version: 3 }) as any);

      await service.appendMaterialRevision(
        { materialUid: 'scmat_abc', clientUid: 'client_1' },
        {
          objectKey: 'scene-qc/scmat_abc/1.png',
          fileUrl: 'https://cdn/scmat_abc/1.png',
          mimeType: 'image/png',
          fileSize: 10,
          version: 2,
        },
      );

      // appendRevision only ever creates — no update/delete call exists on the
      // repository's revision surface for this flow.
      expect(repository.appendRevision).toHaveBeenCalledTimes(1);
      expect(repository.appendRevision).toHaveBeenCalledWith(
        expect.objectContaining({ materialId: existing.id, objectKey: 'scene-qc/scmat_abc/1.png' }),
      );
      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: 'scmat_abc', clientUid: 'client_1', version: 2 },
        { version: 3 },
      );
    });

    it('maps a version conflict to HttpError 409', async () => {
      repository.findByUidForClient.mockResolvedValue(buildMaterial() as any);
      repository.appendRevision.mockResolvedValue({ id: 9n, revision: 1 } as any);
      repository.updateWithVersionCheck.mockRejectedValue(
        new VersionConflictError('stale', 1, 2),
      );

      await expect(
        service.appendMaterialRevision(
          { materialUid: 'scmat_abc', clientUid: 'client_1' },
          {
            objectKey: 'k',
            fileUrl: 'https://cdn/k',
            mimeType: 'image/png',
            fileSize: 10,
            version: 1,
          },
        ),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('retireMaterial', () => {
    it('is idempotent for an already-retired material', async () => {
      const retired = buildMaterial({ status: 'RETIRED' });
      repository.findByUidForClient.mockResolvedValue(retired as any);

      const result = await service.retireMaterial({ materialUid: 'scmat_abc', clientUid: 'client_1' });

      expect(result).toBe(retired);
      expect(repository.updateWithVersionCheck).not.toHaveBeenCalled();
    });

    it('retires an active material and bumps its version', async () => {
      const active = buildMaterial({ status: 'ACTIVE', version: 4 });
      repository.findByUidForClient.mockResolvedValue(active as any);
      repository.updateWithVersionCheck.mockResolvedValue(
        buildMaterial({ status: 'RETIRED', version: 5 }) as any,
      );

      await service.retireMaterial({ materialUid: 'scmat_abc', clientUid: 'client_1' });

      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: 'scmat_abc', clientUid: 'client_1', version: 4 },
        { status: 'RETIRED', version: 5 },
      );
    });

    it('returns null for a material that does not exist under the client', async () => {
      repository.findByUidForClient.mockResolvedValue(null);

      const result = await service.retireMaterial({ materialUid: 'scmat_missing', clientUid: 'client_1' });

      expect(result).toBeNull();
    });
  });

  describe('updateMaterial', () => {
    it('bumps version only on a real field change (semantic mutation)', async () => {
      const existing = buildMaterial({ version: 1 });
      repository.findByUidForClient.mockResolvedValue(existing as any);
      repository.updateWithVersionCheck.mockResolvedValue(buildMaterial({ version: 2 }) as any);

      await service.updateMaterial(
        { materialUid: 'scmat_abc', clientUid: 'client_1' },
        { name: 'Renamed', version: 1 },
      );

      expect(repository.updateWithVersionCheck).toHaveBeenCalledWith(
        { uid: 'scmat_abc', clientUid: 'client_1', version: 1 },
        { name: 'Renamed', version: 2 },
      );
    });
  });
});
