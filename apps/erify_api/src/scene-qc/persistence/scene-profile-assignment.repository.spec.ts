import type { TransactionHost } from '@nestjs-cls/transactional';

import { SceneProfileAssignmentRepository } from './scene-profile-assignment.repository';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';

function createTxDelegateMock() {
  return {
    sceneProfileAssignment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

describe('sceneProfileAssignmentRepository', () => {
  let repository: SceneProfileAssignmentRepository;
  let tx: ReturnType<typeof createTxDelegateMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = createTxDelegateMock();
    const txHost = { tx } as unknown as TransactionHost<any>;
    repository = new SceneProfileAssignmentRepository(txHost);
  });

  describe('findActiveByShowId / findActiveByShowUid', () => {
    it('filters deletedAt: null', async () => {
      tx.sceneProfileAssignment.findFirst.mockResolvedValue(null);

      await repository.findActiveByShowId(1n);
      expect(tx.sceneProfileAssignment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { showId: 1n, deletedAt: null } }),
      );

      await repository.findActiveByShowUid('show_1');
      expect(tx.sceneProfileAssignment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { show: { uid: 'show_1' }, deletedAt: null } }),
      );
    });
  });

  describe('upsertActiveAssignment', () => {
    it('creates a fresh row when no assignment exists for the Show', async () => {
      tx.sceneProfileAssignment.findFirst.mockResolvedValue(null);
      tx.sceneProfileAssignment.create.mockResolvedValue({ id: 1n, uid: 'scasgn_1' });

      await repository.upsertActiveAssignment({ uid: 'scasgn_1', showId: 1n, profileId: 2n });

      expect(tx.sceneProfileAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { uid: 'scasgn_1', showId: 1n, profileId: 2n } }),
      );
    });

    it('revives a soft-deleted row instead of creating a duplicate', async () => {
      tx.sceneProfileAssignment.findFirst.mockResolvedValue({
        id: 9n,
        deletedAt: new Date(),
        version: 1,
      });
      tx.sceneProfileAssignment.update.mockResolvedValue({ id: 9n });

      await repository.upsertActiveAssignment({ uid: 'scasgn_1', showId: 1n, profileId: 3n });

      expect(tx.sceneProfileAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 9n },
          data: { profileId: 3n, deletedAt: null, version: 2 },
        }),
      );
    });

    it('throws VersionConflictError when reassigning an active row with a stale expectedVersion', async () => {
      tx.sceneProfileAssignment.findFirst.mockResolvedValue({
        id: 9n,
        deletedAt: null,
        version: 4,
      });

      await expect(
        repository.upsertActiveAssignment({
          uid: 'scasgn_1',
          showId: 1n,
          profileId: 3n,
          expectedVersion: 1,
        }),
      ).rejects.toBeInstanceOf(VersionConflictError);
      expect(tx.sceneProfileAssignment.update).not.toHaveBeenCalled();
    });

    it('does not conflict-check a revived (soft-deleted) row even when expectedVersion is passed', async () => {
      tx.sceneProfileAssignment.findFirst.mockResolvedValue({
        id: 9n,
        deletedAt: new Date(),
        version: 1,
      });
      tx.sceneProfileAssignment.update.mockResolvedValue({ id: 9n });

      await expect(
        repository.upsertActiveAssignment({
          uid: 'scasgn_1',
          showId: 1n,
          profileId: 3n,
          expectedVersion: 99,
        }),
      ).resolves.toEqual({ id: 9n });
    });
  });

  describe('softDeleteWithVersionCheck', () => {
    it('soft-deletes and returns the row when the version matches', async () => {
      tx.sceneProfileAssignment.updateMany.mockResolvedValue({ count: 1 });
      tx.sceneProfileAssignment.findFirst.mockResolvedValue({ id: 9n });

      const result = await repository.softDeleteWithVersionCheck({ showId: 1n, version: 3 });

      expect(tx.sceneProfileAssignment.updateMany).toHaveBeenCalledWith({
        where: { showId: 1n, version: 3, deletedAt: null },
        data: { deletedAt: expect.any(Date), version: { increment: 1 } },
      });
      expect(result).toEqual({ id: 9n });
    });

    it('returns null when no active assignment exists (404)', async () => {
      tx.sceneProfileAssignment.updateMany.mockResolvedValue({ count: 0 });
      tx.sceneProfileAssignment.findFirst.mockResolvedValue(null);

      const result = await repository.softDeleteWithVersionCheck({ showId: 1n, version: 3 });

      expect(result).toBeNull();
    });

    it('throws VersionConflictError when an active assignment exists with a different version (409)', async () => {
      tx.sceneProfileAssignment.updateMany.mockResolvedValue({ count: 0 });
      tx.sceneProfileAssignment.findFirst.mockResolvedValue({ version: 5 });

      await expect(
        repository.softDeleteWithVersionCheck({ showId: 1n, version: 3 }),
      ).rejects.toBeInstanceOf(VersionConflictError);
    });
  });
});
