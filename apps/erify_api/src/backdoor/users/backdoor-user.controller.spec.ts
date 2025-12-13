import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { BackdoorUserController } from './backdoor-user.controller';

import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';
import type {
  CreateUserDto,
  UpdateUserDto,
} from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

describe('backdoorUserController', () => {
  let controller: BackdoorUserController;

  const mockUserService = {
    createUser: jest.fn(),
    createUsersBulk: jest.fn(),
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
      } as CreateUserDto;
      const createdUser = { uid: 'user_123', ...createDto };

      mockUserService.createUser.mockResolvedValue(createdUser as any);

      const result = await controller.createUser(createDto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdUser);
    });

    it('should handle user creation with MC', async () => {
      const createDto: CreateUserDto = {
        email: 'mc@example.com',
        name: 'MC User',
        mc: {
          name: 'MC One',
          aliasName: 'MC One',
        },
      } as CreateUserDto;
      const createdUser = {
        uid: 'user_456',
        email: 'mc@example.com',
        name: 'MC User',
        extId: null,
        profileUrl: null,
        metadata: {},
        mc: {
          uid: 'mc_123',
          name: 'MC One',
          aliasName: 'MC One',
          isBanned: false,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      };

      mockUserService.createUser.mockResolvedValue(createdUser as any);

      const result = await controller.createUser(createDto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdUser);
    });
  });

  describe('createUsersBulk', () => {
    it('should create multiple users', async () => {
      const userData = [
        {
          email: 'user1@example.com',
          name: 'User 1',
        },
        {
          email: 'user2@example.com',
          name: 'User 2',
          mc: {
            name: 'MC',
            aliasName: 'MC',
          },
        },
      ];
      const bulkDto = { data: userData };
      const createdUsers = userData.map((dto, i) => ({
        uid: `user_${i}`,
        email: dto.email,
        name: dto.name,
        extId: null,
        profileUrl: null,
        metadata: {},
        mc: dto.mc
          ? {
              uid: `mc_${i}`,
              name: dto.mc.name,
              aliasName: dto.mc.aliasName,
              isBanned: false,
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            }
          : null,
      }));

      mockUserService.createUsersBulk.mockResolvedValue(createdUsers);

      const result = await controller.createUsersBulk(bulkDto);

      expect(mockUserService.createUsersBulk).toHaveBeenCalledWith(userData);
      expect(result).toEqual(createdUsers);
    });
  });

  describe('updateUser', () => {
    it('should update a user', async () => {
      const userId = 'user_123';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      } as UpdateUserDto;
      const updatedUser = {
        uid: userId,
        email: 'test@example.com',
        name: 'Updated Name',
      };

      mockUserService.updateUser.mockResolvedValue(updatedUser as any);

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
      } as unknown as UpdateUserDto;
      const updatedUser = {
        uid: userId,
        email: 'test@example.com',
        name: 'Test User',
        metadata: { updated: true },
      };

      mockUserService.updateUser.mockResolvedValue(updatedUser as any);

      const result = await controller.updateUser(userId, updateDto);

      expect(mockUserService.updateUser).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(result).toEqual(updatedUser);
    });
  });
});
