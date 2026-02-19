// Mock auth-sdk modules to avoid ES module import issues
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminUserController } from './admin-user.controller';

import { JwtAuthGuard } from '@/lib/auth/jwt-auth.guard';
import { AdminGuard } from '@/lib/guards/admin.guard';
import type {
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

jest.mock('@eridu/auth-sdk/adapters/nestjs/current-user.decorator', () => ({
  CurrentUser: jest.fn(() => () => {}),
}));

jest.mock('@eridu/auth-sdk/schemas/jwt-payload.schema', () => ({
  jwtPayloadSchema: {
    describe: jest.fn(() => ({
      describe: jest.fn(() => ({})),
    })),
  },
}));

jest.mock('@eridu/auth-sdk/adapters/nestjs/jwt-auth.guard', () => ({
  JwtAuthGuard: class MockSdkJwtAuthGuard {},
}));

jest.mock('@eridu/auth-sdk/server/jwks/jwks-service', () => ({
  JwksService: class MockJwksService {
    constructor() {}
    async initialize() {}
  },
}));

jest.mock('@eridu/auth-sdk/server/jwt/jwt-verifier', () => ({
  JwtVerifier: class MockJwtVerifier {
    constructor() {}
  },
}));

jest.mock('@eridu/auth-sdk/server/jwks/types', () => ({}));
jest.mock('@eridu/auth-sdk/server/jwt/types', () => ({}));
jest.mock('@eridu/auth-sdk/types', () => ({}));

describe('adminUserController', () => {
  let controller: AdminUserController;

  const mockUserService = {
    createUser: jest.fn(),
    listUsers: jest.fn(),
    getUsers: jest.fn(),
    countUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockAdminGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(AdminGuard)
      .useValue(mockAdminGuard)
      .compile();

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
      const query: ListUsersQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      } as ListUsersQueryDto;
      const users = [
        { uid: 'user_1', email: 'user1@example.com', name: 'User 1' },
        { uid: 'user_2', email: 'user2@example.com', name: 'User 2' },
      ];
      const total = 2;
      mockUserService.listUsers.mockResolvedValue({
        data: users.map((u) => ({ ...u, is_system_admin: false, ext_id: (u as any).extId ?? null, profile_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })),
        total,
      } as any);

      const result = await controller.getUsers(query);
      expect(mockUserService.listUsers).toHaveBeenCalledWith(query);
      expect(result.data[0]).toHaveProperty('is_system_admin');
    });

    it('should filter users by name and email', async () => {
      const query: ListUsersQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        name: 'test',
        email: 'test@example.com',
        extId: 'ext_123',
      } as ListUsersQueryDto;
      const users = [{ uid: 'user_1', name: 'test', email: 'test@example.com', extId: 'ext_123' }];
      const total = 1;

      mockUserService.listUsers.mockResolvedValue({
        data: users.map((u) => ({ ...u, is_system_admin: false, ext_id: u.extId ?? null, profile_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })),
        total,
      } as any);

      await controller.getUsers(query);
      expect(mockUserService.listUsers).toHaveBeenCalledWith(query);
    });

    it('should filter users by isSystemAdmin=false', async () => {
      const query: ListUsersQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        isSystemAdmin: false,
      } as ListUsersQueryDto;
      const users = [{ uid: 'user_1', isSystemAdmin: false }];
      const total = 1;

      mockUserService.listUsers.mockResolvedValue({
        data: users.map((u) => ({ ...u, is_system_admin: false, ext_id: null, profile_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), name: 'test', email: 'test@test.com' })),
        total,
      } as any);

      await controller.getUsers(query);
      expect(mockUserService.listUsers).toHaveBeenCalledWith(query);
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

    it('should throw 404 if user not found', async () => {
      const userId = 'user_404';
      mockUserService.getUserById.mockResolvedValue(null);

      // HttpError.notFound returns a NotFoundException
      await expect(controller.getUser(userId)).rejects.toThrow();
      try {
        await controller.getUser(userId);
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toContain('User not found');
      }
    });
  });

  describe('updateUser', () => {
    it('should update a user', async () => {
      const userId = 'user_123';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      } as UpdateUserDto;
      const updatedUser = { uid: userId, ...updateDto };

      mockUserService.getUserById.mockResolvedValue({ uid: userId } as any);
      mockUserService.updateUser.mockResolvedValue(updatedUser as any);

      const result = await controller.updateUser(userId, updateDto);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
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

      mockUserService.getUserById.mockResolvedValue({ uid: userId } as any);
      mockUserService.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser(userId);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(userId);
    });
  });
});
