import type { TransactionHost } from '@nestjs-cls/transactional';

import { StudioMcRepository } from './studio-mc.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaStudioMcDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

describe('studioMcRepository', () => {
  let repository: StudioMcRepository;
  const prismaStudioMcDelegate = createPrismaStudioMcDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      studioMc: prismaStudioMcDelegate,
    } as unknown as PrismaService;

    const txHost = {
      tx: {
        studioMc: prismaStudioMcDelegate,
      },
    } as unknown as TransactionHost<any>;

    repository = new StudioMcRepository(prisma, txHost);
  });

  it('always filters out soft-deleted creators in roster listing without search', async () => {
    prismaStudioMcDelegate.findMany.mockResolvedValue([]);
    prismaStudioMcDelegate.count.mockResolvedValue(0);

    await repository.findByStudioUidPaginated('std_1', {
      skip: 0,
      take: 20,
    });

    expect(prismaStudioMcDelegate.findMany).toHaveBeenCalledTimes(1);
    const where = prismaStudioMcDelegate.findMany.mock.calls[0][0].where as {
      mc?: { deletedAt?: null };
    };
    expect(where.mc?.deletedAt).toBeNull();
  });

  it('keeps creator soft-delete filter when search is provided', async () => {
    prismaStudioMcDelegate.findMany.mockResolvedValue([]);
    prismaStudioMcDelegate.count.mockResolvedValue(0);

    await repository.findByStudioUidPaginated('std_1', {
      skip: 0,
      take: 20,
      search: 'alice',
    });

    const where = prismaStudioMcDelegate.findMany.mock.calls[0][0].where as {
      mc?: { deletedAt?: null; OR?: unknown[] };
    };
    expect(where.mc?.deletedAt).toBeNull();
    expect(where.mc?.OR).toHaveLength(3);
  });

  it('increments version on updateById', async () => {
    prismaStudioMcDelegate.update.mockResolvedValue({ id: BigInt(1) });

    await repository.updateById(BigInt(1), { isActive: false });

    expect(prismaStudioMcDelegate.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: BigInt(1) },
      data: expect.objectContaining({
        isActive: false,
        version: { increment: 1 },
      }),
    }));
  });

  it('updates with version check and increments version', async () => {
    prismaStudioMcDelegate.updateMany.mockResolvedValue({ count: 1 });
    prismaStudioMcDelegate.findFirstOrThrow.mockResolvedValue({ id: BigInt(1) });

    await repository.updateByIdWithVersionCheck(BigInt(1), 3, { isActive: false });

    expect(prismaStudioMcDelegate.updateMany).toHaveBeenCalledWith({
      where: {
        id: BigInt(1),
        version: 3,
        deletedAt: null,
      },
      data: {
        isActive: false,
        version: { increment: 1 },
      },
    });
  });
});
