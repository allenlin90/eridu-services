import type { TransactionHost } from '@nestjs-cls/transactional';

import { ShowMcRepository } from './show-mc.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaShowMcDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

describe('showMcRepository', () => {
  let repository: ShowMcRepository;
  const prismaShowMcDelegate = createPrismaShowMcDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      showMC: prismaShowMcDelegate,
    } as unknown as PrismaService;

    const txHost = {
      tx: {
        showMC: prismaShowMcDelegate,
      },
    } as unknown as TransactionHost<any>;

    repository = new ShowMcRepository(prisma, txHost);
  });

  it('restores soft-deleted assignment without clearing note/metadata when params are empty', async () => {
    prismaShowMcDelegate.update.mockResolvedValue({ id: BigInt(1) });

    await repository.restoreAndUpdateAssignment(BigInt(1), {});

    expect(prismaShowMcDelegate.update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: {
        deletedAt: null,
      },
    });
  });

  it('allows explicit nulls when clearing note/metadata is intended', async () => {
    prismaShowMcDelegate.update.mockResolvedValue({ id: BigInt(1) });

    await repository.restoreAndUpdateAssignment(BigInt(1), {
      note: null,
      metadata: {},
    });

    expect(prismaShowMcDelegate.update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: {
        note: null,
        metadata: {},
        deletedAt: null,
      },
    });
  });
});
