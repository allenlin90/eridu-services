import type { TransactionHost } from '@nestjs-cls/transactional';

import { CreatorRepository } from './creator.repository';

import type { PrismaService } from '@/prisma/prisma.service';

function createPrismaCreatorDelegateMock() {
  return {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

describe('creatorRepository', () => {
  let repository: CreatorRepository;
  const prismaCreatorDelegate = createPrismaCreatorDelegateMock();
  const txCreatorDelegate = {
    findMany: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = {
      creator: prismaCreatorDelegate,
    } as unknown as PrismaService;

    const txHost = {
      tx: {
        creator: txCreatorDelegate,
      },
    } as unknown as TransactionHost<any>;

    repository = new CreatorRepository(prisma, txHost);
  });

  it('lists creators with loose availability constraints and search matching', async () => {
    txCreatorDelegate.findMany.mockResolvedValue([]);

    const dateFrom = new Date('2026-03-15T10:00:00.000Z');
    const dateTo = new Date('2026-03-15T12:00:00.000Z');

    await repository.findAvailableForStudioWindow({
      dateFrom,
      dateTo,
      search: 'ann',
      limit: 25,
    });

    expect(txCreatorDelegate.findMany).toHaveBeenCalledTimes(1);
    const args = txCreatorDelegate.findMany.mock.calls[0][0] as {
      where: Record<string, any>;
      take: number;
      orderBy: unknown[];
    };

    expect(args.take).toBe(25);
    expect(args.where.studioCreators).toBeUndefined();
    expect(args.where.showCreators).toBeUndefined();

    expect(args.where.OR).toEqual(
      expect.arrayContaining([
        { uid: { contains: 'ann', mode: 'insensitive' } },
        { name: { contains: 'ann', mode: 'insensitive' } },
        { aliasName: { contains: 'ann', mode: 'insensitive' } },
      ]),
    );
  });
});
