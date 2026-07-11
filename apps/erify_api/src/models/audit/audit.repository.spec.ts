import type { TransactionHost } from '@nestjs-cls/transactional';

import { AuditRepository } from './audit.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaAuditDelegateMock() {
  return {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };
}

function createPrismaAuditTargetDelegateMock() {
  return {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
  };
}

describe('auditRepository', () => {
  let repository: AuditRepository;
  let txAuditDelegate: ReturnType<typeof createPrismaAuditDelegateMock>;
  let txAuditTargetDelegate: ReturnType<typeof createPrismaAuditTargetDelegateMock>;

  beforeEach(() => {
    txAuditDelegate = createPrismaAuditDelegateMock();
    txAuditTargetDelegate = createPrismaAuditTargetDelegateMock();
    const prisma = { audit: txAuditDelegate } as unknown as PrismaService;
    const txHost = {
      tx: { audit: txAuditDelegate, auditTarget: txAuditTargetDelegate },
    } as unknown as TransactionHost<any>;

    repository = new AuditRepository(prisma, txHost);
  });

  describe('create', () => {
    it('routes targetId into the typed FK column for each target type', async () => {
      txAuditDelegate.create.mockResolvedValue({});

      await repository.create({
        uid: 'aud_abc',
        action: 'CREATE',
        actorId: null,
        metadata: { ingestion_source: 'task_submission' },
        targets: [
          { targetType: 'SHOW', targetId: BigInt(10) },
          { targetType: 'SHOW_CREATOR', targetId: BigInt(20) },
          { targetType: 'SHOW_PLATFORM', targetId: BigInt(30) },
          { targetType: 'STUDIO_SHIFT', targetId: BigInt(40) },
        ],
      });

      expect(txAuditDelegate.create).toHaveBeenCalledTimes(1);
      const args = txAuditDelegate.create.mock.calls[0]?.[0];
      expect(args.data.uid).toBe('aud_abc');
      expect(args.data.action).toBe('CREATE');
      expect(args.data.metadata).toEqual({ ingestion_source: 'task_submission' });
      expect(args.data.actor).toBeUndefined();
      expect(args.data.targets.create).toEqual([
        { targetType: 'SHOW', targetId: BigInt(10), show: { connect: { id: BigInt(10) } } },
        {
          targetType: 'SHOW_CREATOR',
          targetId: BigInt(20),
          showCreator: { connect: { id: BigInt(20) } },
        },
        {
          targetType: 'SHOW_PLATFORM',
          targetId: BigInt(30),
          showPlatform: { connect: { id: BigInt(30) } },
        },
        {
          targetType: 'STUDIO_SHIFT',
          targetId: BigInt(40),
          studioShift: { connect: { id: BigInt(40) } },
        },
      ]);
      expect(args.include).toEqual({
        targets: {
          include: {
            show: { select: { uid: true } },
            showCreator: { select: { uid: true } },
            showPlatform: { select: { uid: true } },
            studioShift: { select: { uid: true } },
          },
        },
        actor: {
          select: {
            uid: true,
          },
        },
      });
    });

    it('connects the actor relation only when an actorId is supplied', async () => {
      txAuditDelegate.create.mockResolvedValue({});

      await repository.create({
        uid: 'aud_xyz',
        action: 'OVERRIDE',
        actorId: BigInt(99),
        ipAddress: '10.0.0.1',
        userAgent: 'jest',
        targets: [{ targetType: 'SHOW', targetId: BigInt(1) }],
      });

      const args = txAuditDelegate.create.mock.calls[0]?.[0];
      expect(args.data.actor).toEqual({ connect: { id: BigInt(99) } });
      expect(args.data.ipAddress).toBe('10.0.0.1');
      expect(args.data.userAgent).toBe('jest');
    });

    it('passes the reason through as a first-class column and defaults to null', async () => {
      txAuditDelegate.create.mockResolvedValue({});

      await repository.create({
        uid: 'aud_with_reason',
        action: 'OVERRIDE',
        actorId: BigInt(1),
        reason: 'rate correction approved by ops',
        targets: [{ targetType: 'STUDIO_SHIFT', targetId: BigInt(1) }],
      });

      await repository.create({
        uid: 'aud_no_reason',
        action: 'CREATE',
        targets: [{ targetType: 'SHOW', targetId: BigInt(1) }],
      });

      expect(txAuditDelegate.create.mock.calls[0]?.[0].data.reason).toBe(
        'rate correction approved by ops',
      );
      expect(txAuditDelegate.create.mock.calls[1]?.[0].data.reason).toBeNull();
    });

    it('defaults metadata to {} when omitted', async () => {
      txAuditDelegate.create.mockResolvedValue({});

      await repository.create({
        uid: 'aud_empty',
        action: 'CREATE',
        targets: [{ targetType: 'SHOW', targetId: BigInt(1) }],
      });

      const args = txAuditDelegate.create.mock.calls[0]?.[0];
      expect(args.data.metadata).toEqual({});
    });
  });

  describe('findForTargets', () => {
    it('returns an empty array without querying when no filters are supplied', async () => {
      const result = await repository.findForTargets([]);
      expect(result).toEqual([]);
      expect(txAuditDelegate.findMany).not.toHaveBeenCalled();
    });

    it('routes each filter into the typed FK column and orders newest first', async () => {
      txAuditDelegate.findMany.mockResolvedValue([]);

      await repository.findForTargets(
        [
          { targetType: 'SHOW', targetId: BigInt(7) },
          { targetType: 'SHOW_PLATFORM', targetId: BigInt(8) },
        ],
        { take: 50 },
      );

      const args = txAuditDelegate.findMany.mock.calls[0]?.[0];
      expect(args.where.targets.some.OR).toEqual([
        { showId: BigInt(7) },
        { showPlatformId: BigInt(8) },
      ]);
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
      expect(args.take).toBe(50);
      expect(args.include).toEqual({
        targets: {
          include: {
            show: { select: { uid: true } },
            showCreator: { select: { uid: true } },
            showPlatform: { select: { uid: true } },
            studioShift: { select: { uid: true } },
          },
        },
        actor: {
          select: {
            uid: true,
          },
        },
      });
    });
  });

  describe('findByUid', () => {
    it('queries by unique uid and includes targets', async () => {
      txAuditDelegate.findUnique.mockResolvedValue(null);

      await repository.findByUid('aud_lookup');

      expect(txAuditDelegate.findUnique).toHaveBeenCalledWith({
        where: { uid: 'aud_lookup' },
        include: {
          targets: {
            include: {
              show: { select: { uid: true } },
              showCreator: { select: { uid: true } },
              showPlatform: { select: { uid: true } },
              studioShift: { select: { uid: true } },
            },
          },
          actor: {
            select: {
              uid: true,
            },
          },
        },
      });
    });
  });

  /**
   * Finding 3 (final-review fix): `findSchedulePublishImpactsForStudio`'s
   * `where` clause only filtered on `metadata.event === 'schedule_publish_impact'`,
   * which also matches every `stale_conflict` audit row (opened, applied,
   * dismissed, superseded, auto-resolved) — those share the same `event`
   * value by design. Since `listSchedulePublishImpacts` runs this query
   * alongside the purpose-built `findPendingStaleConflictsForStudio` via
   * `Promise.all`, a stale_conflict show's pending row could appear twice and
   * its resolved rows could leak into a "needs attention" queue. This tests
   * the repository's actual `where`-clause construction (not a mocked
   * service boundary) since that's exactly what let the bug through
   * undetected.
   */
  describe('findSchedulePublishImpactsForStudio', () => {
    it('excludes impact_kind: stale_conflict rows from the where clause', async () => {
      await repository.findSchedulePublishImpactsForStudio('studio_1', {
        startDateFrom: new Date('2026-01-01T00:00:00.000Z'),
        take: 25,
        skip: 0,
      });

      expect(txAuditTargetDelegate.count).toHaveBeenCalledTimes(1);
      expect(txAuditTargetDelegate.findMany).toHaveBeenCalledTimes(1);

      const countWhere = txAuditTargetDelegate.count.mock.calls[0]?.[0].where;
      const findManyWhere = txAuditTargetDelegate.findMany.mock.calls[0]?.[0].where;

      // Both queries must apply the identical exclusion, or the paginated
      // `count`/`findMany` pair could disagree on the result set.
      expect(findManyWhere).toEqual(countWhere);

      expect(countWhere.audit.metadata).toEqual({
        path: ['event'],
        equals: 'schedule_publish_impact',
      });
      expect(countWhere.NOT).toEqual({
        audit: {
          metadata: {
            path: ['impact_kind'],
            equals: 'stale_conflict',
          },
        },
      });
    });
  });

  /**
   * PR #271 review finding: `reconcileShowConflict` can write a resolved row
   * and its replacement opened row in the same transaction. Since
   * `Audit.createdAt` is `@default(now())`, Postgres returns the same
   * timestamp for both inserts within one transaction — ordering only by
   * `createdAt` is non-deterministic between them. `audit.id` (autoincrement)
   * must break the tie so the newest row is always the actual latest one.
   */
  describe('findLatestScheduleConflictForShow', () => {
    it('orders by audit.createdAt desc with audit.id desc as a tie-breaker', async () => {
      await repository.findLatestScheduleConflictForShow(BigInt(1));

      expect(txAuditTargetDelegate.findFirst).toHaveBeenCalledTimes(1);
      const args = txAuditTargetDelegate.findFirst.mock.calls[0]?.[0];
      expect(args.orderBy).toEqual([
        { audit: { createdAt: 'desc' } },
        { audit: { id: 'desc' } },
      ]);
    });

    /**
     * PR #271 review finding (second pass): the `where` clause filtered on
     * `event: 'schedule_publish_impact'`, which also matches every
     * confirmed_future_* impact row for the same show. A show can have both
     * a still-pending stale_conflict row and a later, unrelated
     * confirmed_future_updated row (e.g. a scalar field change unaffected by
     * actuals gating) — picking the single newest event of any kind would
     * return the non-stale row and mask the pending conflict. Filtering on
     * `impact_kind: 'stale_conflict'` directly ensures only stale_conflict
     * rows are ever candidates for "latest."
     */
    it('filters the where clause to impact_kind: stale_conflict, not just the schedule_publish_impact event', async () => {
      await repository.findLatestScheduleConflictForShow(BigInt(1));

      const args = txAuditTargetDelegate.findFirst.mock.calls[0]?.[0];
      expect(args.where.audit.metadata).toEqual({
        path: ['impact_kind'],
        equals: 'stale_conflict',
      });
    });
  });

  /**
   * PR #271 review finding (second pass): this query used Prisma's `distinct`
   * with only `createdAt desc` as the sort key. `reconcileShowConflict` can
   * write a resolved row and its replacement opened row in the same
   * transaction, sharing the same `createdAt` — `distinct` could then pick
   * the resolved row over its replacement for a given show, hiding the newly
   * opened conflict from the review queue. `audit.id desc` as a secondary
   * sort key breaks the tie, same fix as `findLatestScheduleConflictForShow`.
   */
  describe('findPendingStaleConflictsForStudio', () => {
    it('orders by audit.createdAt desc with audit.id desc as a tie-breaker for distinct', async () => {
      await repository.findPendingStaleConflictsForStudio('studio_1', { take: 25, skip: 0 });

      expect(txAuditTargetDelegate.findMany).toHaveBeenCalledTimes(1);
      const args = txAuditTargetDelegate.findMany.mock.calls[0]?.[0];
      expect(args.distinct).toEqual(['showId']);
      expect(args.orderBy).toEqual([
        { audit: { createdAt: 'desc' } },
        { audit: { id: 'desc' } },
      ]);
    });
  });
});
