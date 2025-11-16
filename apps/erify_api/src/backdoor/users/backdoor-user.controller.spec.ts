import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { BackdoorApiKeyGuard } from '@/common/guards/backdoor-api-key.guard';
import {
  CreateUserDto,
  UpdateUserDto,
} from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';
import { UtilityService } from '@/utility/utility.service';

import { BackdoorUserController } from './backdoor-user.controller';

describe('BackdoorUserController', () => {
  let controller: BackdoorUserController;

  const mockUserService = {
    createUser: jest.fn(),
    updateUser: jest.fn(),
  };

  const mockUtilityService = {
    createPaginationMeta: jest.fn(),
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'BACKDOOR_API_KEY') return undefined;
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackdoorUserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: UtilityService, useValue: mockUtilityService },
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

    it('should handle user creation with all fields', async () => {
      const createDto: CreateUserDto = {
        email: 'full@example.com',
        name: 'Full User',
        extId: 'ext_123',
        profileUrl: 'https://example.com/profile',
        metadata: { custom: 'data' },
      } as CreateUserDto;
      const createdUser = { uid: 'user_456', ...createDto };

      mockUserService.createUser.mockResolvedValue(createdUser as any);

      const result = await controller.createUser(createDto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdUser);
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
      } as UpdateUserDto;
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
