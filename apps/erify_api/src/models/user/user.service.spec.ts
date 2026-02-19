import type { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './schemas/user.schema';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
  setupTestMocks,
} from '@/testing/model-service-test.helper';
import type { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('userService', () => {
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
      utilityMock,
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

  it('getUserById returns null if not found', async () => {
    (userRepositoryMock.findByUid as jest.Mock).mockResolvedValue(null);

    const result = await service.getUserById('user_404');
    expect(result).toBeNull();
  });

  it('updateUser delegates to repository', async () => {
    const updated = { uid: 'user_1', email: 'a@b.com' };
    (userRepositoryMock.update as jest.Mock).mockResolvedValue(updated);

    const result = await service.updateUser('user_1', { email: 'a@b.com' } as UpdateUserDto);
    expect(userRepositoryMock.update).toHaveBeenCalledWith(
      { uid: 'user_1' },
      { email: 'a@b.com' },
    );
    expect(result).toEqual(updated);
  });

  describe('listUsers', () => {
    it('should list users with default params', async () => {
      const users = [{ uid: 'user_1' }];
      const total = 1;

      userRepositoryMock.findPaginated = jest
        .fn()
        .mockResolvedValue({ data: users, total });

      const result = await service.listUsers({} as ListUsersQueryDto);

      expect(userRepositoryMock.findPaginated).toHaveBeenCalledWith({});
      expect(result).toEqual({ data: users, total });
    });

    it('should filter by isSystemAdmin: true', async () => {
      userRepositoryMock.findPaginated = jest
        .fn()
        .mockResolvedValue({ data: [], total: 0 });

      await service.listUsers({ isSystemAdmin: true } as ListUsersQueryDto);

      expect(userRepositoryMock.findPaginated).toHaveBeenCalledWith({
        isSystemAdmin: true,
      });
    });

    it('should filter by isSystemAdmin: false', async () => {
      userRepositoryMock.findPaginated = jest
        .fn()
        .mockResolvedValue({ data: [], total: 0 });

      await service.listUsers({ isSystemAdmin: false } as ListUsersQueryDto);

      expect(userRepositoryMock.findPaginated).toHaveBeenCalledWith({
        isSystemAdmin: false,
      });
    });

    it('should combine multiple filters', async () => {
      userRepositoryMock.findPaginated = jest
        .fn()
        .mockResolvedValue({ data: [], total: 0 });

      const query = {
        name: 'test',
        isSystemAdmin: false,
      } as ListUsersQueryDto;

      await service.listUsers(query);

      expect(userRepositoryMock.findPaginated).toHaveBeenCalledWith(query);
    });
  });
});
