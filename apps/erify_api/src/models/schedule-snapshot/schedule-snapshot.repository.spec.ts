import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import { ScheduleSnapshotRepository } from './schedule-snapshot.repository';

import type { PrismaService } from '@/prisma/prisma.service';

/**
 * Characterization for the WI-10 transaction-wiring fix.
 *
 * Snapshots are created/deleted inside the schedule publish flow, which is
 * `@Transactional`. Routing those writes through `txHost.tx` (instead of the
 * unbounded `PrismaService`) makes them participate in — and roll back with —
 * the ambient transaction. The prisma and txHost.tx mocks are intentionally
 * DISTINCT so the test proves writes hit the transactional client (not the
 * unbounded one) while reads stay on prisma.
 */
describe('scheduleSnapshotRepository (transaction wiring)', () => {
  const makeDelegate = () => ({
    create: jest.fn().mockResolvedValue({ uid: 'sched_snap_1' }),
    delete: jest.fn().mockResolvedValue({ uid: 'sched_snap_1' }),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  });

  let prismaDelegate: ReturnType<typeof makeDelegate>;
  let txDelegate: ReturnType<typeof makeDelegate>;
  let repository: ScheduleSnapshotRepository;

  beforeEach(() => {
    prismaDelegate = makeDelegate();
    txDelegate = makeDelegate();
    const prisma = { scheduleSnapshot: prismaDelegate } as unknown as PrismaService;
    const txHost = {
      tx: { scheduleSnapshot: txDelegate },
    } as unknown as TransactionHost<TransactionalAdapterPrisma>;
    repository = new ScheduleSnapshotRepository(prisma, txHost);
  });

  it('routes create through the transactional client, not the unbounded one', async () => {
    await repository.create({ version: 1 } as never);

    expect(txDelegate.create).toHaveBeenCalledTimes(1);
    expect(prismaDelegate.create).not.toHaveBeenCalled();
  });

  it('routes delete through the transactional client, not the unbounded one', async () => {
    await repository.delete({ uid: 'sched_snap_1' });

    expect(txDelegate.delete).toHaveBeenCalledTimes(1);
    expect(prismaDelegate.delete).not.toHaveBeenCalled();
  });

  it('keeps reads on the unbounded client (findOne)', async () => {
    await repository.findByUid('sched_snap_1');

    expect(prismaDelegate.findFirst).toHaveBeenCalledTimes(1);
    expect(txDelegate.findFirst).not.toHaveBeenCalled();
  });
});
