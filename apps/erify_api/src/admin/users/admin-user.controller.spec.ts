import { Test, TestingModule } from '@nestjs/testing';

import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import {
  CreateUserDto,
  UpdateUserDto,
} from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';
import { UtilityService } from '@/utility/utility.service';

import { AdminUserController } from './admin-user.controller';

describe('AdminUserController', () => {
  let controller: AdminUserController;

  const mockUserService = {
    createUser: jest.fn(),
    getUsers: jest.fn(),
    countUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockUtilityService = {
    createPaginationMeta: jest.fn(),
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    controller = module.get<AdminUserController>(AdminUserController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user', async () => {
      const createDto: CreateUserDto = {
        email: 'test@example.com',
        name: 'Test User',
        metadata: {},
      } as CreateUserDto;
      const createdUser = { uid: 'user_123', ...createDto };

      mockUserService.createUser.mockResolvedValue(createdUser as any);

      const result = await controller.createUser(createDto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdUser);
    });
  });

  describe('getUsers', () => {
    it('should return paginated list of users', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const users = [
        { uid: 'user_1', email: 'user1@example.com', name: 'User 1' },
        { uid: 'user_2', email: 'user2@example.com', name: 'User 2' },
      ];
      const total = 2;
      const paginationMeta = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockUserService.getUsers.mockResolvedValue(users as any);
      mockUserService.countUsers.mockResolvedValue(total);
      mockUtilityService.createPaginationMeta.mockReturnValue(paginationMeta);

      const result = await controller.getUsers(query);

      expect(mockUserService.getUsers).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
      });
      expect(mockUserService.countUsers).toHaveBeenCalled();
      expect(mockUtilityService.createPaginationMeta).toHaveBeenCalledWith(
        query.page,
        query.limit,
        total,
      );
      expect(result).toEqual({
        data: users,
        meta: paginationMeta,
      });
    });
  });

  describe('getUser', () => {
    it('should return a user by id', async () => {
      const userId = 'user_123';
      const user = {
        uid: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      mockUserService.getUserById.mockResolvedValue(user as any);

      const result = await controller.getUser(userId);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(user);
    });
  });

  describe('updateUser', () => {
    it('should update a user', async () => {
      const userId = 'user_123';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      } as UpdateUserDto;
      const updatedUser = { uid: userId, ...updateDto };

      mockUserService.updateUser.mockResolvedValue(updatedUser as any);

      const result = await controller.updateUser(userId, updateDto);

      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const userId = 'user_123';

      mockUserService.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser(userId);

      expect(mockUserService.deleteUser).toHaveBeenCalledWith(userId);
    });
  });
});
