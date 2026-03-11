import type { TransactionHost } from '@nestjs-cls/transactional';

import { ShowRepository } from './show.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaShowDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

describe('showRepository', () => {
  let repository: ShowRepository;
  const prismaShowDelegate = createPrismaShowDelegateMock();
  const txShowDelegate = {
    findMany: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      show: prismaShowDelegate,
    } as unknown as PrismaService;

    const txHost = {
      tx: {
        show: txShowDelegate,
      },
    } as unknown as TransactionHost<any>;

    repository = new ShowRepository(prisma, txHost);
  });

  it('keeps explicit datetime cutoff for studio task-summary date_to', async () => {
    txShowDelegate.count.mockResolvedValue(0);
    txShowDelegate.findMany.mockResolvedValue([]);

    const dateTo = '2026-03-06T05:59:59.999Z';
    await repository.findPaginatedWithTaskSummary(BigInt(1), {
      date_from: '2026-03-05T00:00:00.000Z',
      date_to: dateTo,
      skip: 0,
      take: 10,
    });

    expect(txShowDelegate.count).toHaveBeenCalledTimes(1);
    const where = txShowDelegate.count.mock.calls[0][0].where as { startTime?: { lte?: Date } };
    expect(where.startTime?.lte?.toISOString()).toBe(dateTo);
  });

  it('keeps explicit datetime cutoff for admin show start_date_to filter', async () => {
    txShowDelegate.count.mockResolvedValue(0);
    txShowDelegate.findMany.mockResolvedValue([]);

    const startDateTo = '2026-03-06T05:59:59.999Z';
    await repository.findPaginated({
      page: 1,
      limit: 10,
      take: 10,
      skip: 0,
      sort: 'desc',
      include_deleted: false,
      order_by: 'created_at',
      order_direction: 'desc',
      start_date_to: startDateTo,
    } as never);

    expect(txShowDelegate.findMany).toHaveBeenCalledTimes(1);
    const where = txShowDelegate.findMany.mock.calls[0][0].where as { startTime?: { lte?: Date } };
    expect(where.startTime?.lte?.toISOString()).toBe(startDateTo);
  });

  it('maps creator_name filter to show creator relation search', async () => {
    txShowDelegate.count.mockResolvedValue(0);
    txShowDelegate.findMany.mockResolvedValue([]);

    await repository.findPaginated({
      page: 1,
      limit: 10,
      take: 10,
      skip: 0,
      sort: 'desc',
      include_deleted: false,
      order_by: 'created_at',
      order_direction: 'desc',
      creator_name: 'alice',
    } as never);

    expect(txShowDelegate.findMany).toHaveBeenCalledTimes(1);
    const where = txShowDelegate.findMany.mock.calls[0][0].where as {
      showMCs?: {
        some?: {
          mc?: { name?: { contains?: string } };
        };
      };
    };
    expect(where.showMCs?.some?.mc?.name?.contains).toBe('alice');
  });

  it('maps creator_name filter to studio task-summary creator relation search', async () => {
    txShowDelegate.count.mockResolvedValue(0);
    txShowDelegate.findMany.mockResolvedValue([]);

    await repository.findPaginatedWithTaskSummary(BigInt(1), {
      creator_name: 'alice',
      skip: 0,
      take: 10,
    });

    expect(txShowDelegate.count).toHaveBeenCalledTimes(1);
    const where = txShowDelegate.count.mock.calls[0][0].where as {
      showMCs?: {
        some?: {
          mc?: { name?: { contains?: string } };
        };
      };
    };
    expect(where.showMCs?.some?.mc?.name?.contains).toBe('alice');
  });
});
