import type { TransactionHost } from '@nestjs-cls/transactional';
import type { Prisma } from '@prisma/client';

import { PlatformRepository } from './platform.repository';

/**
 * Behavior spec for PlatformRepository.
 *
 * Pins the query-building contracts: soft-delete filtering and case-insensitive
 * search on findPaginated, the explicit deletedAt filter on findByUids, and the
 * inherited BaseRepository.findMany soft-delete default (WI-33 removed the
 * bespoke override that bypassed it).
 */

function createPlatformDelegateMock() {
  return {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

describe('platformRepository', () => {
  let repository: PlatformRepository;
  const txDelegate = createPlatformDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();

    const txHost = { tx: { platform: txDelegate } } as unknown as TransactionHost<any>;

    repository = new PlatformRepository(txHost);
  });

  describe('findPaginated', () => {
    beforeEach(() => {
      txDelegate.findMany.mockResolvedValue([]);
      txDelegate.count.mockResolvedValue(0);
    });

    it('excludes soft-deleted rows by default (deletedAt: null) for both data and count', async () => {
      await repository.findPaginated({});

      expect(txDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
      expect(txDelegate.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    });

    it('includes soft-deleted rows when includeDeleted is true (no deletedAt filter)', async () => {
      await repository.findPaginated({ includeDeleted: true });

      expect(txDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(txDelegate.count).toHaveBeenCalledWith({ where: {} });
    });

    it('builds case-insensitive contains filters for name and uid', async () => {
      await repository.findPaginated({ name: 'tik', uid: 'plt_' });

      expect(txDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            name: { contains: 'tik', mode: 'insensitive' },
            uid: { contains: 'plt_', mode: 'insensitive' },
          },
        }),
      );
    });

    it('forwards pagination + orderBy and returns { data, total }', async () => {
      const rows = [{ uid: 'plt_1' }];
      const orderBy: Prisma.PlatformOrderByWithRelationInput = { name: 'asc' };
      txDelegate.findMany.mockResolvedValue(rows);
      txDelegate.count.mockResolvedValue(1);

      const result = await repository.findPaginated({ skip: 10, take: 5, orderBy });

      expect(txDelegate.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        where: { deletedAt: null },
        orderBy,
      });
      expect(result).toEqual({ data: rows, total: 1 });
    });
  });

  describe('findByUids', () => {
    it('filters by uid list and excludes soft-deleted rows (deletedAt: null)', async () => {
      txDelegate.findMany.mockResolvedValue([]);

      await repository.findByUids(['plt_1', 'plt_2']);

      expect(txDelegate.findMany).toHaveBeenCalledWith({
        where: { uid: { in: ['plt_1', 'plt_2'] }, deletedAt: null },
      });
    });
  });

  describe('findMany (inherited BaseRepository default)', () => {
    // WI-33 removed the bespoke override that forwarded params verbatim and
    // leaked soft-deleted rows. findMany now comes from BaseRepository, which
    // injects deletedAt: null unless includeDeleted is set — restoring the
    // soft-delete invariant. The base repository resolves the ambient
    // transaction delegate for every operation.
    it('injects deletedAt: null alongside the caller where by default', async () => {
      txDelegate.findMany.mockResolvedValue([]);

      await repository.findMany({ where: { name: { contains: 'x' } } });

      expect(txDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: { contains: 'x' }, deletedAt: null } }),
      );
    });

    it('suppresses the soft-delete filter when includeDeleted is true', async () => {
      txDelegate.findMany.mockResolvedValue([]);

      await repository.findMany({ includeDeleted: true, where: { name: { contains: 'x' } } });

      expect(txDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: { contains: 'x' } } }),
      );
    });
  });
});
