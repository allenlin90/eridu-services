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
  const prismaUserDelegate = createPrismaUserDelegateMock();

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      user: prismaUserDelegate,
    } as unknown as PrismaService;

    repository = new UserRepository(prisma);
  });

  it('returns empty result without querying when search is blank after trim', async () => {
    const result = await repository.searchUsersForCreatorOnboarding({
      search: '   ',
      limit: 20,
    });

    expect(result).toEqual([]);
    expect(prismaUserDelegate.findMany).not.toHaveBeenCalled();
  });

  it('excludes only users linked to active creators from onboarding search', async () => {
    prismaUserDelegate.findMany.mockResolvedValue([]);

    await repository.searchUsersForCreatorOnboarding({
      search: 'alice',
      limit: 20,
    });

    expect(prismaUserDelegate.findMany).toHaveBeenCalledTimes(1);
    expect(prismaUserDelegate.findMany).toHaveBeenCalledWith({
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
  });
});
