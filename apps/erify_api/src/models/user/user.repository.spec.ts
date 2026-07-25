import type { TransactionHost } from '@nestjs-cls/transactional';

import { UserRepository } from './user.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaUserDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createManyAndReturn: jest.fn(),
  };
}

describe('userRepository', () => {
  let repository: UserRepository;
  let prismaUserDelegate: ReturnType<typeof createPrismaUserDelegateMock>;
  let txUserDelegate: ReturnType<typeof createPrismaUserDelegateMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaUserDelegate = createPrismaUserDelegateMock();
    txUserDelegate = createPrismaUserDelegateMock();

    const prisma = {
      user: prismaUserDelegate,
    } as unknown as PrismaService;
    const txHost = {
      tx: { user: txUserDelegate },
    } as unknown as TransactionHost<any>;

    repository = new UserRepository(prisma, txHost);
  });

  it('returns empty result without querying when search is blank after trim', async () => {
    const result = await repository.searchUsersForCreatorOnboarding({
      search: '   ',
      limit: 20,
    });

    expect(result).toEqual([]);
    expect(txUserDelegate.findMany).not.toHaveBeenCalled();
    expect(prismaUserDelegate.findMany).not.toHaveBeenCalled();
  });

  it('excludes only users linked to active creators from onboarding search', async () => {
    txUserDelegate.findMany.mockResolvedValue([]);

    await repository.searchUsersForCreatorOnboarding({
      search: 'alice',
      limit: 20,
    });

    expect(txUserDelegate.findMany).toHaveBeenCalledTimes(1);
    expect(txUserDelegate.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        NOT: {
          creator: {
            is: {
              deletedAt: null,
            },
          },
        },
        OR: [
          { uid: { contains: 'alice', mode: 'insensitive' } },
          { email: { contains: 'alice', mode: 'insensitive' } },
          { name: { contains: 'alice', mode: 'insensitive' } },
          { extId: { contains: 'alice', mode: 'insensitive' } },
        ],
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' },
      ],
      take: 20,
    });
    expect(prismaUserDelegate.findMany).not.toHaveBeenCalled();
  });

  it('routes bulk creates through the transactional client', async () => {
    txUserDelegate.createManyAndReturn.mockResolvedValue([]);

    await repository.createManyAndReturn([
      {
        uid: 'user_abc123',
        extId: 'external_abc123',
        email: 'alice@example.com',
        name: 'Alice',
      },
    ]);

    expect(txUserDelegate.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        {
          uid: 'user_abc123',
          extId: 'external_abc123',
          email: 'alice@example.com',
          name: 'Alice',
        },
      ],
    });
    expect(prismaUserDelegate.createManyAndReturn).not.toHaveBeenCalled();
  });
});
