import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import { showIssueDetailInclude } from './schemas/show-issue.schema';
import { ShowIssueRepository } from './show-issue.repository';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';

function createShowIssueDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  };
}

describe('showIssueRepository', () => {
  let repository: ShowIssueRepository;
  let delegate: ReturnType<typeof createShowIssueDelegateMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    delegate = createShowIssueDelegateMock();
    const txHost = {
      tx: { showIssue: delegate },
    } as unknown as TransactionHost<TransactionalAdapterPrisma>;

    repository = new ShowIssueRepository(txHost);
  });

  it('is defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('creates a show issue hydrated with the shared detail include', async () => {
      const data = { uid: 'issue_1', show: { connect: { id: 1n } } } as Prisma.ShowIssueCreateInput;
      const created = { id: 1n, uid: 'issue_1' };
      delegate.create.mockResolvedValue(created);

      await expect(repository.create(data)).resolves.toBe(created);
      expect(delegate.create).toHaveBeenCalledWith({ data, include: showIssueDetailInclude });
    });

    it('propagates a unique-constraint conflict (e.g. duplicate creator/category/origin identity)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: PRISMA_ERROR.UniqueConstraint,
        clientVersion: '5.0.0',
      });
      delegate.create.mockRejectedValue(error);

      await expect(
        repository.create({ uid: 'issue_1', show: { connect: { id: 1n } } } as Prisma.ShowIssueCreateInput),
      ).rejects.toBe(error);
    });
  });

  describe('findByUid / findByUidAndStudio', () => {
    it('filters active rows by uid', async () => {
      delegate.findFirst.mockResolvedValue(null);
      await repository.findByUid('issue_1');
      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: { uid: 'issue_1', deletedAt: null },
        include: showIssueDetailInclude,
      });
    });

    it('scopes the lookup through Show.studio for IDOR safety', async () => {
      delegate.findFirst.mockResolvedValue(null);
      await repository.findByUidAndStudio('issue_1', 'std_1');
      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: { uid: 'issue_1', deletedAt: null, show: { studio: { uid: 'std_1' } } },
        include: showIssueDetailInclude,
      });
    });
  });

  describe('findPaginated / buildWhere', () => {
    it('scopes by studio and applies every optional filter', async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await repository.findPaginated(
        {
          studioUid: 'std_1',
          showUid: 'show_1',
          ownerUid: 'user_1',
          status: 'OPEN',
          severity: 'HIGH',
          category: 'EQUIPMENT',
          origin: 'MANUAL',
          dateFrom: new Date('2026-01-01T00:00:00.000Z'),
          dateTo: new Date('2026-01-31T00:00:00.000Z'),
          search: 'camera',
        },
        { skip: 10, take: 25 },
      );

      const expectedWhere = {
        deletedAt: null,
        show: {
          studio: { uid: 'std_1' },
          deletedAt: null,
          uid: 'show_1',
          startTime: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lte: new Date('2026-01-31T00:00:00.000Z'),
          },
        },
        owner: { uid: 'user_1' },
        status: 'OPEN',
        severity: 'HIGH',
        category: 'EQUIPMENT',
        origin: 'MANUAL',
        title: { contains: 'camera', mode: 'insensitive' },
      };

      expect(delegate.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        skip: 10,
        take: 25,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: showIssueDetailInclude,
      });
      expect(delegate.count).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('narrows to only the studio scope when no optional filters are provided', () => {
      const where = repository.buildWhere({ studioUid: 'std_1' });
      expect(where).toEqual({
        deletedAt: null,
        show: { studio: { uid: 'std_1' }, deletedAt: null },
      });
    });

    it('applies statusIn as an "in" filter when status is not also provided', () => {
      const where = repository.buildWhere({ studioUid: 'std_1', statusIn: ['OPEN', 'IN_PROGRESS'] });
      expect(where.status).toEqual({ in: ['OPEN', 'IN_PROGRESS'] });
    });

    it('lets the exact-match status win when both status and statusIn are provided', () => {
      const where = repository.buildWhere({ studioUid: 'std_1', statusIn: ['OPEN', 'IN_PROGRESS'], status: 'RESOLVED' });
      expect(where.status).toBe('RESOLVED');
    });
  });

  describe('countUnresolvedBySeverity', () => {
    it('backfills every severity to 0 and merges groupBy results, scoped to OPEN/IN_PROGRESS', async () => {
      delegate.groupBy.mockResolvedValue([
        { severity: 'HIGH', _count: 3 },
        { severity: 'CRITICAL', _count: 1 },
      ]);

      const counts = await repository.countUnresolvedBySeverity({ studioUid: 'std_1' });

      expect(counts).toEqual({ LOW: 0, MEDIUM: 0, HIGH: 3, CRITICAL: 1 });
      expect(delegate.groupBy).toHaveBeenCalledWith({
        by: ['severity'],
        where: {
          deletedAt: null,
          show: { studio: { uid: 'std_1' }, deletedAt: null },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        _count: true,
      });
    });

    it('returns all-zero counts when nothing matches', async () => {
      delegate.groupBy.mockResolvedValue([]);

      const counts = await repository.countUnresolvedBySeverity({ studioUid: 'std_1' });

      expect(counts).toEqual({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
    });
  });

  describe('updateWithVersionCheck', () => {
    it('applies the update when the expected version matches', async () => {
      const updated = { id: 1n, uid: 'issue_1', version: 2 };
      delegate.update.mockResolvedValue(updated);

      await expect(
        repository.updateWithVersionCheck({ uid: 'issue_1', version: 1 }, { version: 2, status: 'IN_PROGRESS' }),
      ).resolves.toBe(updated);

      expect(delegate.update).toHaveBeenCalledWith({
        where: { uid: 'issue_1', version: 1, deletedAt: null },
        data: { version: 2, status: 'IN_PROGRESS' },
        include: showIssueDetailInclude,
      });
    });

    it('throws VersionConflictError when a concurrent write already bumped the version', async () => {
      delegate.findFirst.mockResolvedValue({ version: 3 });
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: PRISMA_ERROR.RecordNotFound,
        clientVersion: '5.0.0',
      });
      delegate.update.mockRejectedValue(prismaError);

      await expect(
        repository.updateWithVersionCheck({ uid: 'issue_1', version: 1 }, { version: 2 }),
      ).rejects.toThrow(VersionConflictError);

      expect(delegate.findFirst).toHaveBeenCalledWith({
        where: { uid: 'issue_1', deletedAt: null },
        select: { version: true },
      });
    });

    it('rethrows the original not-found error when the row is soft-deleted or missing', async () => {
      delegate.findFirst.mockResolvedValue(null);
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: PRISMA_ERROR.RecordNotFound,
        clientVersion: '5.0.0',
      });
      delegate.update.mockRejectedValue(prismaError);

      await expect(
        repository.updateWithVersionCheck({ uid: 'issue_1', version: 1 }, { version: 2 }),
      ).rejects.toBe(prismaError);
    });
  });
});
