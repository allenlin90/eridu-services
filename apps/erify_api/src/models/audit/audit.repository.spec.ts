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

describe('auditRepository', () => {
  let repository: AuditRepository;
  let txAuditDelegate: ReturnType<typeof createPrismaAuditDelegateMock>;

  beforeEach(() => {
    txAuditDelegate = createPrismaAuditDelegateMock();
    const prisma = { audit: txAuditDelegate } as unknown as PrismaService;
    const txHost = {
      tx: { audit: txAuditDelegate },
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
      expect(args.include).toEqual({ targets: true });
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
      expect(args.include).toEqual({ targets: true });
    });
  });

  describe('findByUid', () => {
    it('queries by unique uid and includes targets', async () => {
      txAuditDelegate.findUnique.mockResolvedValue(null);

      await repository.findByUid('aud_lookup');

      expect(txAuditDelegate.findUnique).toHaveBeenCalledWith({
        where: { uid: 'aud_lookup' },
        include: { targets: true },
      });
    });
  });
});
