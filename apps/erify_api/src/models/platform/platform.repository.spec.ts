import type { TransactionHost } from '@nestjs-cls/transactional';
import type { Prisma } from '@prisma/client';

import { PlatformRepository } from './platform.repository';

import type { PrismaService } from '@/prisma/prisma.service';

/**
 * Characterization spec for PlatformRepository (WI-T-platform).
 *
 * Pins the current query-building behavior — soft-delete filtering,
 * case-insensitive search, and the findMany override that bypasses the
 * BaseRepository soft-delete default — before WI-33 / D10 act on it. The
 * findMany footgun and the findByUids docstring mismatch are tagged inline as
 * known smells, not endorsed behavior.
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
  const prismaDelegate = createPlatformDelegateMock();
  const txDelegate = createPlatformDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = { platform: prismaDelegate } as unknown as PrismaService;
    const txHost = { tx: { platform: txDelegate } } as unknown as TransactionHost<any>;

    repository = new PlatformRepository(prisma, txHost);
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
    // The docstring says "ignores deleted", but the code filters deletedAt: null
    // and so EXCLUDES soft-deleted rows. WI-33 corrects the docstring to match.
    it('filters by uid list and excludes soft-deleted rows (despite the "ignores deleted" docstring)', async () => {
      txDelegate.findMany.mockResolvedValue([]);

      await repository.findByUids(['plt_1', 'plt_2']);

      expect(txDelegate.findMany).toHaveBeenCalledWith({
        where: { uid: { in: ['plt_1', 'plt_2'] }, deletedAt: null },
      });
    });
  });

  describe('findMany (override)', () => {
    // CURRENT BEHAVIOR — known smell (C3 / WI-33 / D10): this override forwards
    // params verbatim and does NOT inject the deletedAt: null default that
    // BaseRepository.findMany applies, so soft-deleted rows leak unless the
    // caller filters. No caller routes through it today; WI-33 removes it.
    it('forwards an explicit where verbatim without injecting a soft-delete filter', async () => {
      txDelegate.findMany.mockResolvedValue([]);

      await repository.findMany({ where: { name: { contains: 'x' } } });

      expect(txDelegate.findMany).toHaveBeenCalledWith({ where: { name: { contains: 'x' } } });
    });

    it('passes no soft-delete filter when called without a where (the footgun)', async () => {
      txDelegate.findMany.mockResolvedValue([]);

      await repository.findMany({});

      const callArg = txDelegate.findMany.mock.calls[0][0];
      expect(callArg).toEqual({});
      expect(callArg.where).toBeUndefined();
    });
  });
});
