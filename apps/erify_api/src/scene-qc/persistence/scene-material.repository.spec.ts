import type { TransactionHost } from '@nestjs-cls/transactional';
import { Prisma } from '@prisma/client';

import { SceneMaterialRepository } from './scene-material.repository';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';

function createTxDelegateMock() {
  return {
    sceneMaterial: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sceneMaterialRevision: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

describe('sceneMaterialRepository', () => {
  let repository: SceneMaterialRepository;
  let tx: ReturnType<typeof createTxDelegateMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = createTxDelegateMock();
    const txHost = { tx } as unknown as TransactionHost<any>;
    repository = new SceneMaterialRepository(txHost);
  });

  describe('findByUidForClient', () => {
    it('filters deletedAt: null on both the material and its owning client', async () => {
      tx.sceneMaterial.findFirst.mockResolvedValue(null);

      await repository.findByUidForClient({ uid: 'scmat_1', clientUid: 'client_1' });

      expect(tx.sceneMaterial.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            uid: 'scmat_1',
            client: { uid: 'client_1', deletedAt: null },
            deletedAt: null,
          },
        }),
      );
    });
  });

  describe('findPaginated', () => {
    it('defaults to excluding soft-deleted rows', async () => {
      tx.sceneMaterial.findMany.mockResolvedValue([]);
      tx.sceneMaterial.count.mockResolvedValue(0);

      await repository.findPaginated({ clientUid: 'client_1' });

      expect(tx.sceneMaterial.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { client: { uid: 'client_1' }, deletedAt: null } }),
      );
      expect(tx.sceneMaterial.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { client: { uid: 'client_1' }, deletedAt: null } }),
      );
    });

    it('includes soft-deleted rows when includeDeleted is set', async () => {
      tx.sceneMaterial.findMany.mockResolvedValue([]);
      tx.sceneMaterial.count.mockResolvedValue(0);

      await repository.findPaginated({ clientUid: 'client_1', includeDeleted: true });

      expect(tx.sceneMaterial.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { client: { uid: 'client_1' } } }),
      );
    });
  });

  describe('updateWithVersionCheck', () => {
    it('distinguishes a genuine 404 from a stale-version 409', async () => {
      const notFoundError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: PRISMA_ERROR.RecordNotFound,
        clientVersion: '5.0.0',
      });
      tx.sceneMaterial.update.mockRejectedValue(notFoundError);

      // Case 1: no row at all -> the version-conflict re-fetch also finds nothing -> raw error propagates.
      tx.sceneMaterial.findFirst.mockResolvedValueOnce(null);
      await expect(
        repository.updateWithVersionCheck({ uid: 'scmat_1', clientUid: 'client_1', version: 1 }, {}),
      ).rejects.toBe(notFoundError);

      // Case 2: row exists with a different version -> VersionConflictError.
      tx.sceneMaterial.findFirst.mockResolvedValueOnce({ version: 3 });
      await expect(
        repository.updateWithVersionCheck({ uid: 'scmat_1', clientUid: 'client_1', version: 1 }, {}),
      ).rejects.toBeInstanceOf(VersionConflictError);
    });
  });

  describe('appendRevision', () => {
    it('inserts MAX(revision) + 1 for the material', async () => {
      tx.sceneMaterialRevision.aggregate.mockResolvedValue({ _max: { revision: 2 } });
      tx.sceneMaterialRevision.create.mockResolvedValue({ id: 1n, revision: 3 });

      await repository.appendRevision({
        uid: 'scmrev_new',
        materialId: 10n,
        objectKey: 'k',
        fileUrl: 'https://cdn/k',
        mimeType: 'image/png',
        fileSize: 10,
      });

      expect(tx.sceneMaterialRevision.aggregate).toHaveBeenCalledWith({
        where: { materialId: 10n },
        _max: { revision: true },
      });
      expect(tx.sceneMaterialRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ revision: 3, materialId: 10n }) }),
      );
    });

    it('starts at revision 1 for a material with no prior revisions', async () => {
      tx.sceneMaterialRevision.aggregate.mockResolvedValue({ _max: { revision: null } });
      tx.sceneMaterialRevision.create.mockResolvedValue({ id: 1n, revision: 1 });

      await repository.appendRevision({
        uid: 'scmrev_new',
        materialId: 10n,
        objectKey: 'k',
        fileUrl: 'https://cdn/k',
        mimeType: 'image/png',
        fileSize: 10,
      });

      expect(tx.sceneMaterialRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ revision: 1 }) }),
      );
    });
  });

  describe('findRevisionsForClient', () => {
    it('scopes revisions to material.clientId (cross-Client composition guard)', async () => {
      tx.sceneMaterialRevision.findMany.mockResolvedValue([]);

      await repository.findRevisionsForClient({ clientId: 5n, revisionUids: ['scmrev_1', 'scmrev_2'] });

      expect(tx.sceneMaterialRevision.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            uid: { in: ['scmrev_1', 'scmrev_2'] },
            material: { clientId: 5n, deletedAt: null },
          },
        }),
      );
    });
  });
});
