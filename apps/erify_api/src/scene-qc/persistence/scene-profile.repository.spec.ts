import type { TransactionHost } from '@nestjs-cls/transactional';
import { Prisma } from '@prisma/client';

import { SceneProfileRepository } from './scene-profile.repository';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';

function createTxDelegateMock() {
  return {
    sceneProfile: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    sceneProfileRevision: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    sceneProfileRevisionMaterial: {
      createMany: jest.fn(),
    },
    sceneProfileAssignment: {
      findFirst: jest.fn(),
    },
    studio: { findMany: jest.fn() },
    platform: { findMany: jest.fn() },
    $executeRaw: jest.fn(),
  };
}

describe('sceneProfileRepository', () => {
  let repository: SceneProfileRepository;
  let tx: ReturnType<typeof createTxDelegateMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = createTxDelegateMock();
    const txHost = { tx } as unknown as TransactionHost<any>;
    repository = new SceneProfileRepository(txHost);
  });

  describe('findByUidForClient', () => {
    it('filters deletedAt: null on both the profile and its owning client', async () => {
      tx.sceneProfile.findFirst.mockResolvedValue(null);

      await repository.findByUidForClient({ uid: 'scprof_1', clientUid: 'client_1' });

      expect(tx.sceneProfile.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            uid: 'scprof_1',
            client: { uid: 'client_1', deletedAt: null },
            deletedAt: null,
          },
        }),
      );
    });
  });

  describe('updateWithVersionCheck', () => {
    it('distinguishes a genuine 404 from a stale-version 409', async () => {
      const notFoundError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: PRISMA_ERROR.RecordNotFound,
        clientVersion: '5.0.0',
      });
      tx.sceneProfile.update.mockRejectedValue(notFoundError);

      tx.sceneProfile.findFirst.mockResolvedValueOnce(null);
      await expect(
        repository.updateWithVersionCheck({ uid: 'scprof_1', clientUid: 'client_1', version: 1 }, {}),
      ).rejects.toBe(notFoundError);

      tx.sceneProfile.findFirst.mockResolvedValueOnce({ version: 5 });
      await expect(
        repository.updateWithVersionCheck({ uid: 'scprof_1', clientUid: 'client_1', version: 1 }, {}),
      ).rejects.toBeInstanceOf(VersionConflictError);
    });
  });

  describe('findActiveDefaultForClient', () => {
    it('filters to ACTIVE, isDefault, non-deleted rows for the client', async () => {
      tx.sceneProfile.findFirst.mockResolvedValue(null);

      await repository.findActiveDefaultForClient(7n);

      expect(tx.sceneProfile.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 7n, status: 'ACTIVE', isDefault: true, deletedAt: null },
        }),
      );
    });
  });

  describe('findActiveAssignedProfileForShow', () => {
    it('joins the assignment and the target profile with deletedAt: null on both', async () => {
      tx.sceneProfileAssignment.findFirst.mockResolvedValue(null);

      await repository.findActiveAssignedProfileForShow(9n);

      expect(tx.sceneProfileAssignment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            showId: 9n,
            deletedAt: null,
            profile: { status: 'ACTIVE', deletedAt: null },
          },
        }),
      );
    });

    it('returns null when no active assignment resolves to an active profile', async () => {
      tx.sceneProfileAssignment.findFirst.mockResolvedValue(null);

      const result = await repository.findActiveAssignedProfileForShow(9n);

      expect(result).toBeNull();
    });

    it('returns the joined profile when the assignment resolves', async () => {
      const profile = { id: 1n, uid: 'scprof_1' };
      tx.sceneProfileAssignment.findFirst.mockResolvedValue({ profile });

      const result = await repository.findActiveAssignedProfileForShow(9n);

      expect(result).toBe(profile);
    });
  });

  describe('appendRevision', () => {
    it('inserts MAX(revision) + 1 and bulk-creates the ordered material links', async () => {
      tx.sceneProfileRevision.aggregate.mockResolvedValue({ _max: { revision: 1 } });
      tx.sceneProfileRevision.create.mockResolvedValue({ id: 55n, revision: 2 });

      await repository.appendRevision({
        uid: 'scprev_new',
        profileId: 3n,
        profileName: 'Default',
        profileDescription: null,
        sceneType: 'GRAPHIC_BG',
        materials: [
          { materialRevisionId: 1n, sortOrder: 0, label: 'A' },
          { materialRevisionId: 2n, sortOrder: 1, label: 'B', studioId: 4n },
        ],
      });

      expect(tx.sceneProfileRevision.aggregate).toHaveBeenCalledWith({
        where: { profileId: 3n },
        _max: { revision: true },
      });
      expect(tx.sceneProfileRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ revision: 2, profileId: 3n }) }),
      );
      expect(tx.sceneProfileRevisionMaterial.createMany).toHaveBeenCalledWith({
        data: [
          {
            profileRevisionId: 55n,
            materialRevisionId: 1n,
            sortOrder: 0,
            studioId: null,
            platformId: null,
            label: 'A',
          },
          {
            profileRevisionId: 55n,
            materialRevisionId: 2n,
            sortOrder: 1,
            studioId: 4n,
            platformId: null,
            label: 'B',
          },
        ],
      });
    });

    it('skips the bulk link create when there are no materials', async () => {
      tx.sceneProfileRevision.aggregate.mockResolvedValue({ _max: { revision: null } });
      tx.sceneProfileRevision.create.mockResolvedValue({ id: 1n, revision: 1 });

      await repository.appendRevision({
        uid: 'scprev_new',
        profileId: 3n,
        profileName: 'Default',
        profileDescription: null,
        sceneType: 'GRAPHIC_BG',
        materials: [],
      });

      expect(tx.sceneProfileRevisionMaterial.createMany).not.toHaveBeenCalled();
    });
  });

  describe('acquireClientDefaultLock', () => {
    it('locks a hashed key built from pg_advisory_xact_lock(hashtextextended(', async () => {
      tx.$executeRaw.mockResolvedValue(undefined);

      await repository.acquireClientDefaultLock(42n);

      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      const [strings] = tx.$executeRaw.mock.calls[0];
      expect(strings.join('')).toContain('pg_advisory_xact_lock(hashtextextended(');
    });
  });

  describe('clearActiveDefaultForClient', () => {
    it('clears every other active default, excluding the given profile id', async () => {
      tx.sceneProfile.updateMany.mockResolvedValue({ count: 1 });

      await repository.clearActiveDefaultForClient(7n, 3n);

      expect(tx.sceneProfile.updateMany).toHaveBeenCalledWith({
        where: { clientId: 7n, status: 'ACTIVE', isDefault: true, deletedAt: null, id: { not: 3n } },
        data: { isDefault: false },
      });
    });
  });

  describe('resolveStudioIds / resolvePlatformIds', () => {
    it('returns an empty map without querying when given no uids', async () => {
      const result = await repository.resolveStudioIds([]);

      expect(result.size).toBe(0);
      expect(tx.studio.findMany).not.toHaveBeenCalled();
    });

    it('filters deletedAt: null when resolving studio ids', async () => {
      tx.studio.findMany.mockResolvedValue([{ id: 1n, uid: 'std_1' }]);

      const result = await repository.resolveStudioIds(['std_1']);

      expect(tx.studio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { uid: { in: ['std_1'] }, deletedAt: null } }),
      );
      expect(result.get('std_1')).toBe(1n);
    });
  });
});
