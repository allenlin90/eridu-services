import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Prisma, User } from '@prisma/client';

import { BackdoorUserController } from './backdoor-user.controller';

import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import type {
  BulkCreateUserDto,
  CreateUserDto,
  UpdateUserDto,
} from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

describe('backdoorUserController', () => {
  let controller: BackdoorUserController;

  const mockUserService = {
    createUser: jest.fn(),
    createUsersBulk: jest.fn(),
    findUserById: jest.fn(),
    updateUser: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'BACKDOOR_API_KEY')
          return undefined;
        if (key === 'NODE_ENV')
          return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackdoorUserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
        BackdoorApiKeyGuard,
      ],
    }).compile();

    controller = module.get<BackdoorUserController>(BackdoorUserController);
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
        extId: null,
        profileUrl: null,
        creator: undefined,
      };
      const createdUser: User = {
        id: BigInt(1),
        uid: 'user_123',
        email: createDto.email,
        name: createDto.name,
        extId: null,
        isBanned: false,
        isSystemAdmin: false,
        profileUrl: null,
        metadata: createDto.metadata as Prisma.JsonObject,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockUserService.createUser.mockResolvedValue(createdUser);
      mockUserService.findUserById.mockResolvedValue({ ...createdUser, creator: null });

      const result = await controller.createUser(createDto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(createDto);
      expect(mockUserService.findUserById).toHaveBeenCalledWith(createdUser.uid, { creator: true });
      expect(result).toEqual({ ...createdUser, creator: null });
    });

    it('should handle user creation with creator', async () => {
      const createDto: CreateUserDto = {
        email: 'creator@example.com',
        name: 'Creator User',
        extId: null,
        profileUrl: null,
        metadata: {},
        creator: {
          name: 'Creator One',
          aliasName: 'Creator One',
          metadata: {},
        },
      };
      const createdUser = {
        id: BigInt(1),
        uid: 'user_456',
        email: 'creator@example.com',
        name: 'Creator User',
        extId: null,
        isBanned: false,
        isSystemAdmin: false,
        profileUrl: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        creator: {
          id: BigInt(1),
          uid: 'creator_123',
          name: 'Creator One',
          aliasName: 'Creator One',
          isBanned: false,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          userId: BigInt(1),
        },
      };

      mockUserService.createUser.mockResolvedValue(createdUser as any);
      mockUserService.findUserById.mockResolvedValue(createdUser as any);

      const result = await controller.createUser(createDto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(createDto);
      expect(mockUserService.findUserById).toHaveBeenCalledWith(createdUser.uid, { creator: true });
      expect(result).toEqual(createdUser);
    });
  });

  describe('createUsersBulk', () => {
    it('should create multiple users', async () => {
      const userData: Array<BulkCreateUserDto['data'][number]> = [
        {
          email: 'user1@example.com',
          name: 'User 1',
          extId: null,
          profileUrl: null,
          metadata: {},
          creator: undefined,
        },
        {
          email: 'user2@example.com',
          name: 'User 2',
          extId: null,
          profileUrl: null,
          metadata: {},
          creator: {
            name: 'Creator',
            aliasName: 'Creator',
            metadata: {},
          },
        },
      ];
      const bulkDto: BulkCreateUserDto = { data: userData };
      const createdUsers = userData.map((dto, i) => ({
        id: BigInt(i),
        uid: `user_${i}`,
        email: dto.email,
        name: dto.name,
        extId: dto.extId,
        isBanned: false,
        isSystemAdmin: false,
        profileUrl: dto.profileUrl,
        metadata: dto.metadata as Prisma.JsonObject,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        creator: dto.creator
          ? {
              id: BigInt(i),
              uid: `creator_${i}`,
              name: dto.creator.name,
              aliasName: dto.creator.aliasName,
              isBanned: false,
              metadata: dto.creator.metadata as Prisma.JsonObject,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              userId: BigInt(i),
            }
          : null,
      }));

      mockUserService.createUsersBulk.mockResolvedValue(createdUsers);
      mockUserService.findUserById
        .mockResolvedValueOnce(createdUsers[0] as any)
        .mockResolvedValueOnce(createdUsers[1] as any);

      const result = await controller.createUsersBulk(bulkDto);

      expect(mockUserService.createUsersBulk).toHaveBeenCalledWith(userData);
      expect(mockUserService.findUserById).toHaveBeenNthCalledWith(1, 'user_0', { creator: true });
      expect(mockUserService.findUserById).toHaveBeenNthCalledWith(2, 'user_1', { creator: true });
      expect(result).toEqual(createdUsers);
    });
  });

  describe('updateUser', () => {
    it('should update a user', async () => {
      const userId = 'user_123';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };
      const updatedUser: User = {
        id: BigInt(1),
        uid: userId,
        email: 'test@example.com',
        name: 'Updated Name',
        extId: null,
        isBanned: false,
        isSystemAdmin: false,
        profileUrl: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(userId, updateDto);

      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should handle partial user updates', async () => {
      const userId = 'user_123';
      const updateDto: UpdateUserDto = {
        metadata: { updated: true },
      };
      const updatedUser: User = {
        id: BigInt(1),
        uid: userId,
        email: 'test@example.com',
        name: 'Test User',
        extId: null,
        isBanned: false,
        isSystemAdmin: false,
        profileUrl: null,
        metadata: { updated: true } as Prisma.JsonObject,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(userId, updateDto);

      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(result).toEqual(updatedUser);
    });
  });
});
