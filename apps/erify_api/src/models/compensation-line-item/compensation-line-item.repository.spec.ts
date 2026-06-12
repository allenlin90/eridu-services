import type { TransactionHost } from '@nestjs-cls/transactional';
import { Prisma } from '@prisma/client';

import { CompensationLineItemRepository } from './compensation-line-item.repository';

import type { PrismaService } from '@/prisma/prisma.service';

/**
 * Repository spec for CompensationLineItemRepository (WI-T2).
 *
 * Scope is intentionally limited to the repository's real contracts — not the
 * shape of every Prisma query it builds:
 *  - soft-deleted rows are excluded by default (data-safety invariant);
 *  - reads are scoped to a studio (tenant isolation);
 *  - the targetId-without-targetType fallback searches all four relations;
 *  - the money-summary helper short-circuits on empty input and drops rows
 *    whose showCreator relation is missing (mapping logic).
 *
 * Per-field filter plumbing (itemType / createdBy / date ranges) is delegated
 * to Prisma and is deliberately NOT asserted here — those are implementation
 * details a behavior-preserving refactor should be free to change. Repository
 * query correctness against a real database is integration-test territory.
 */

function createDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  };
}

describe('compensationLineItemRepository', () => {
  let repository: CompensationLineItemRepository;
  const txDelegate = createDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();
    txDelegate.findFirst.mockResolvedValue(null);
    txDelegate.findMany.mockResolvedValue([]);
    txDelegate.count.mockResolvedValue(0);

    const prisma = { compensationLineItem: createDelegateMock() } as unknown as PrismaService;
    const txHost = { tx: { compensationLineItem: txDelegate } } as unknown as TransactionHost<any>;

    repository = new CompensationLineItemRepository(prisma, txHost);
  });

  describe('soft-delete safety', () => {
    it('findPaginated excludes soft-deleted rows by default and returns { data, total }', async () => {
      const rows = [{ uid: 'cli_1' }];
      txDelegate.findMany.mockResolvedValue(rows);
      txDelegate.count.mockResolvedValue(1);

      const result = await repository.findPaginated({
        skip: 0,
        take: 20,
        sort: 'desc',
        includeDeleted: false,
      });

      expect(txDelegate.findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null });
      expect(result).toEqual({ data: rows, total: 1 });
    });

    it('findPaginated includes soft-deleted rows when includeDeleted is true', async () => {
      await repository.findPaginated({ skip: 0, take: 20, sort: 'desc', includeDeleted: true });

      expect(txDelegate.findMany.mock.calls[0][0].where.deletedAt).toBeUndefined();
    });

    it('findByUidWithRelations excludes soft-deleted rows by default', async () => {
      await repository.findByUidWithRelations('cli_1');

      expect(txDelegate.findFirst.mock.calls[0][0].where).toMatchObject({ deletedAt: null });
    });
  });

  describe('tenant scoping', () => {
    it('findByUidForStudio scopes the lookup to the studio', async () => {
      await repository.findByUidForStudio({ uid: 'cli_1', studioId: 'studio_1' });

      expect(txDelegate.findFirst.mock.calls[0][0].where).toMatchObject({
        studio: { uid: 'studio_1' },
        deletedAt: null,
      });
    });
  });

  describe('target filter — uid fallback', () => {
    it('searches all four target relations when a targetId is given without a targetType', async () => {
      await repository.findPaginated({
        skip: 0,
        take: 20,
        sort: 'desc',
        includeDeleted: false,
        targetId: 'tgt_1',
      });

      expect(txDelegate.findMany.mock.calls[0][0].where.target).toEqual({
        OR: [
          { show: { uid: 'tgt_1' } },
          { showCreator: { uid: 'tgt_1' } },
          { studioShift: { uid: 'tgt_1' } },
          { studioShiftBlock: { uid: 'tgt_1' } },
        ],
      });
    });
  });

  describe('findActiveAmountsByShowCreatorUids', () => {
    it('short-circuits to [] without querying when the uid list is empty', async () => {
      const result = await repository.findActiveAmountsByShowCreatorUids({
        studioId: 'studio_1',
        showCreatorUids: [],
      });

      expect(result).toEqual([]);
      expect(txDelegate.findMany).not.toHaveBeenCalled();
    });

    it('maps rows to { showCreatorUid, amount } and drops rows whose showCreator is missing', async () => {
      txDelegate.findMany.mockResolvedValue([
        { amount: new Prisma.Decimal('10.50'), target: { showCreator: { uid: 'sc_1' } } },
        { amount: new Prisma.Decimal('5.00'), target: { showCreator: null } },
        { amount: new Prisma.Decimal('3.00'), target: null },
      ]);

      const result = await repository.findActiveAmountsByShowCreatorUids({
        studioId: 'studio_1',
        showCreatorUids: ['sc_1'],
      });

      expect(result).toEqual([{ showCreatorUid: 'sc_1', amount: expect.any(Prisma.Decimal) }]);
      expect(result[0].amount.toString()).toBe('10.5');
    });
  });
});
