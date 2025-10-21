import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { PRISMA_ERROR } from '../common/errors/prisma-error-codes';
import { UtilityService } from '../utility/utility.service';
import { CreateUserDto } from './schemas/user.schema';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('UserService', () => {
  let service: UserService;

  const userRepositoryMock: Partial<jest.Mocked<UserRepository>> = {
    create: jest.fn(),
    findByUid: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };

  const utilityMock: Partial<jest.Mocked<UtilityService>> = {
    generateBrandedId: jest.fn().mockReturnValue('user_123'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: userRepositoryMock },
        { provide: UtilityService, useValue: utilityMock },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createUser returns created user', async () => {
    const dto: CreateUserDto = {
      email: 'a@b.com',
      name: 'A',
      metadata: {},
    } as CreateUserDto;
    const created = { uid: 'user_123', ...dto } as const;
    (userRepositoryMock.create as jest.Mock).mockResolvedValue(created);

    const result = await service.createUser(dto);

    expect(userRepositoryMock.create).toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('createUser maps P2002 to Conflict', async () => {
    const dto: CreateUserDto = {
      email: 'a@b.com',
      name: 'A',
      metadata: {},
    } as CreateUserDto;
    const error = new Prisma.PrismaClientKnownRequestError('message', {
      code: PRISMA_ERROR.UniqueConstraint,
      clientVersion: '6.14.0',
    });
    (userRepositoryMock.create as jest.Mock).mockRejectedValue(error);

    await expect(service.createUser(dto)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('getUserById throws not found', async () => {
    (userRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

    await expect(service.getUserById('user_404')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('updateUser maps P2002 to Conflict', async () => {
    (userRepositoryMock.findByUid as jest.Mock).mockResolvedValue({
      uid: 'user_1',
      email: 'x@y.com',
    });
    const error = new Prisma.PrismaClientKnownRequestError('message', {
      code: PRISMA_ERROR.UniqueConstraint,
      clientVersion: '6.14.0',
    });
    (userRepositoryMock.update as jest.Mock).mockRejectedValue(error);

    await expect(
      service.updateUser('user_1', { email: { set: 'a@b.com' } }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
