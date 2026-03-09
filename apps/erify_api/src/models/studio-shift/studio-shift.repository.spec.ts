import type { TransactionHost } from '@nestjs-cls/transactional';

import { StudioShiftRepository } from './studio-shift.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaStudioShiftDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

describe('studioShiftRepository', () => {
  let repository: StudioShiftRepository;
  const prismaStudioShiftDelegate = createPrismaStudioShiftDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      studioShift: prismaStudioShiftDelegate,
    } as unknown as PrismaService;

    const txHost = {
      tx: {
        studioShift: prismaStudioShiftDelegate,
        studioShiftBlock: {
          findFirst: jest.fn(),
        },
      },
    } as unknown as TransactionHost<any>;

    repository = new StudioShiftRepository(prisma, txHost);
  });

  it('maps daytime window to same operational date', async () => {
    prismaStudioShiftDelegate.findMany.mockResolvedValue([]);

    await repository.findByShowWindow(
      BigInt(1),
      new Date('2026-03-07T10:00:00.000Z'),
      new Date('2026-03-07T12:00:00.000Z'),
    );

    const where = prismaStudioShiftDelegate.findMany.mock.calls[0][0].where as { date: { gte: Date; lte: Date } };
    expect(where.date.gte.toISOString()).toBe('2026-03-07T00:00:00.000Z');
    expect(where.date.lte.toISOString()).toBe('2026-03-07T00:00:00.000Z');
  });

  it('maps pre-06:00 end time to previous operational date', async () => {
    prismaStudioShiftDelegate.findMany.mockResolvedValue([]);

    await repository.findByShowWindow(
      BigInt(1),
      new Date('2026-03-07T22:00:00.000Z'),
      new Date('2026-03-08T02:00:00.000Z'),
    );

    const where = prismaStudioShiftDelegate.findMany.mock.calls[0][0].where as { date: { gte: Date; lte: Date } };
    expect(where.date.gte.toISOString()).toBe('2026-03-07T00:00:00.000Z');
    expect(where.date.lte.toISOString()).toBe('2026-03-07T00:00:00.000Z');
  });

  it('keeps 06:00 boundary on next operational day', async () => {
    prismaStudioShiftDelegate.findMany.mockResolvedValue([]);

    await repository.findByShowWindow(
      BigInt(1),
      new Date('2026-03-07T23:00:00.000Z'),
      new Date('2026-03-08T06:00:00.000Z'),
    );

    const where = prismaStudioShiftDelegate.findMany.mock.calls[0][0].where as { date: { gte: Date; lte: Date } };
    expect(where.date.gte.toISOString()).toBe('2026-03-07T00:00:00.000Z');
    expect(where.date.lte.toISOString()).toBe('2026-03-08T00:00:00.000Z');
  });
});
