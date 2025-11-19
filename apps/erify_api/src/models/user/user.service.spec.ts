import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

import { CreateUserDto, UpdateUserDto } from './schemas/user.schema';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('UserService', () => {
  let service: UserService;
  let userRepositoryMock: Partial<jest.Mocked<UserRepository>>;
  let utilityMock: Partial<jest.Mocked<UtilityService>>;

  beforeEach(async () => {
    userRepositoryMock = createMockRepository<UserRepository>();
    utilityMock = createMockUtilityService('user_123');

    const module = await createModelServiceTestModule({
      serviceClass: UserService,
      repositoryClass: UserRepository,
      repositoryMock: userRepositoryMock,
      utilityMock: utilityMock,
    });

    service = module.get<UserService>(UserService);
  });

  beforeEach(() => {
    setupTestMocks();
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

    expect(utilityMock.generateBrandedId).toHaveBeenCalledWith(
      'user',
      undefined,
    );
    expect(userRepositoryMock.create).toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('createUser maps P2002 to Conflict', async () => {
    const dto: CreateUserDto = {
      email: 'a@b.com',
      name: 'A',
      metadata: {},
    } as CreateUserDto;
    const error = createMockUniqueConstraintError(['email']);
    (userRepositoryMock.create as jest.Mock).mockRejectedValue(error);

    await expect(service.createUser(dto)).rejects.toThrow(error);
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
    const error = createMockUniqueConstraintError(['email']);
    (userRepositoryMock.update as jest.Mock).mockRejectedValue(error);

    await expect(
      service.updateUser('user_1', { email: 'a@b.com' } as UpdateUserDto),
    ).rejects.toThrow(error);
  });
});
