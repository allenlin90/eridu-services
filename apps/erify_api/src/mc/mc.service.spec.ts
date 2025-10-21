import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { PRISMA_ERROR } from '../common/errors/prisma-error-codes';
import { UtilityService } from '../utility/utility.service';
import { McRepository } from './mc.repository';
import { McService } from './mc.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('McService', () => {
  let service: McService;

  const mcRepositoryMock: Partial<jest.Mocked<McRepository>> = {
    create: jest.fn(),
    findByUid: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };

  const utilityMock: Partial<jest.Mocked<UtilityService>> = {
    generateBrandedId: jest.fn().mockReturnValue('mc_123'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McService,
        { provide: McRepository, useValue: mcRepositoryMock },
        { provide: UtilityService, useValue: utilityMock },
      ],
    }).compile();

    service = module.get<McService>(McService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createMc returns created mc', async () => {
    const dto = {
      name: 'MC A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const created = { uid: 'mc_123', ...dto } as const;
    (mcRepositoryMock.create as jest.Mock).mockResolvedValue(created);

    const result = await service.createMc(dto);

    expect(mcRepositoryMock.create).toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('createMc maps P2002 to Conflict', async () => {
    const dto = {
      name: 'MC A',
      aliasName: 'A',
      metadata: {},
      userId: null,
    };
    const error = new Prisma.PrismaClientKnownRequestError('message', {
      code: PRISMA_ERROR.UniqueConstraint,
      clientVersion: '6.14.0',
    });
    (mcRepositoryMock.create as jest.Mock).mockRejectedValue(error);

    await expect(service.createMc(dto)).rejects.toMatchObject({ status: 409 });
  });

  it('getMcById throws not found', async () => {
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

    await expect(service.getMcById('mc_404')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('updateMc maps P2002 to Conflict', async () => {
    (mcRepositoryMock.findByUid as jest.Mock).mockResolvedValue({
      uid: 'mc_1',
      name: 'Old',
    });
    const error = new Prisma.PrismaClientKnownRequestError('message', {
      code: PRISMA_ERROR.UniqueConstraint,
      clientVersion: '6.14.0',
    });
    (mcRepositoryMock.update as jest.Mock).mockRejectedValue(error);

    await expect(
      service.updateMc('mc_1', {
        name: 'MC A',
        aliasName: 'mc-a',
        userId: null,
        isBanned: false,
        metadata: {},
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
