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
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
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

  it('lists creators with loose availability constraints, search matching, and inactive roster exclusion', async () => {
    txCreatorDelegate.findMany.mockResolvedValue([]);

    const dateFrom = new Date('2026-03-15T10:00:00.000Z');
    const dateTo = new Date('2026-03-15T12:00:00.000Z');

    await repository.findAvailableForStudioWindow({
      studioUid: 'std_00000000000000000001',
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
    expect(args.where.showCreators).toBeUndefined();
    expect(args.where.NOT).toEqual({
      studioCreators: {
        some: {
          deletedAt: null,
          isActive: false,
          studio: {
            uid: 'std_00000000000000000001',
            deletedAt: null,
          },
        },
      },
    });

    expect(args.where.OR).toEqual(
      expect.arrayContaining([
        { uid: { contains: 'ann', mode: 'insensitive' } },
        { name: { contains: 'ann', mode: 'insensitive' } },
        { aliasName: { contains: 'ann', mode: 'insensitive' } },
      ]),
    );
  });

  it('creates a creator with an explicit type', async () => {
    txCreatorDelegate.create.mockResolvedValue({});

    await repository.createCreator({
      uid: 'creator_00000000000000000001',
      name: 'Ann',
      aliasName: 'Ann',
      type: 'FLEXIBLE' as any,
    });

    expect(txCreatorDelegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'FLEXIBLE' }),
    });
  });

  it('creates a creator without setting type when omitted', async () => {
    txCreatorDelegate.create.mockResolvedValue({});

    await repository.createCreator({
      uid: 'creator_00000000000000000001',
      name: 'Ann',
      aliasName: 'Ann',
    });

    const data = txCreatorDelegate.create.mock.calls[0][0].data;
    expect(data.type).toBeUndefined();
  });

  it('updates a creator type by uid', async () => {
    txCreatorDelegate.findFirst.mockResolvedValue({ uid: 'creator_00000000000000000001' });
    txCreatorDelegate.update.mockResolvedValue({});

    await repository.updateByUid('creator_00000000000000000001', { type: 'OTHER' as any });

    expect(txCreatorDelegate.update).toHaveBeenCalledWith({
      where: { uid: 'creator_00000000000000000001', deletedAt: null },
      data: { type: 'OTHER' },
    });
  });

  it('excludes active rostered creators from catalog while keeping inactive rows available', async () => {
    txCreatorDelegate.findMany.mockResolvedValue([]);

    await repository.findCatalogForStudio({
      studioUid: 'std_00000000000000000001',
      search: 'ann',
      includeRostered: true,
      excludeActiveRostered: true,
      limit: 25,
    });

    expect(txCreatorDelegate.findMany).toHaveBeenCalledTimes(1);
    const args = txCreatorDelegate.findMany.mock.calls[0][0] as {
      where: Record<string, any>;
      take: number;
    };

    expect(args.take).toBe(25);
    expect(args.where.NOT).toEqual({
      studioCreators: {
        some: {
          deletedAt: null,
          isActive: true,
          studio: {
            uid: 'std_00000000000000000001',
            deletedAt: null,
          },
        },
      },
    });
  });
});
