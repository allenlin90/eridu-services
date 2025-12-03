import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminPlatformController } from './admin-platform.controller';

import type { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import { PlatformService } from '@/models/platform/platform.service';
import type {
  CreatePlatformDto,
  UpdatePlatformDto,
} from '@/models/platform/schemas/platform.schema';

describe('adminPlatformController', () => {
  let controller: AdminPlatformController;

  const mockPlatformService = {
    createPlatform: jest.fn(),
    getPlatforms: jest.fn(),
    countPlatforms: jest.fn(),
    getPlatformById: jest.fn(),
    updatePlatform: jest.fn(),
    deletePlatform: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPlatformController],
      providers: [{ provide: PlatformService, useValue: mockPlatformService }],
    }).compile();

    controller = module.get<AdminPlatformController>(AdminPlatformController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPlatform', () => {
    it('should create a platform', async () => {
      const createDto: CreatePlatformDto = {
        name: 'Test Platform',
        metadata: {},
      } as CreatePlatformDto;
      const createdPlatform = { uid: 'platform_123', ...createDto };

      mockPlatformService.createPlatform.mockResolvedValue(
        createdPlatform as any,
      );

      const result = await controller.createPlatform(createDto);
      expect(mockPlatformService.createPlatform).toHaveBeenCalledWith(
        createDto,
      );
      expect(result).toEqual(createdPlatform);
    });
  });

  describe('getPlatforms', () => {
    it('should return paginated list of platforms', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const platforms = [
        { uid: 'platform_1', name: 'Platform 1' },
        { uid: 'platform_2', name: 'Platform 2' },
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

      mockPlatformService.getPlatforms.mockResolvedValue(platforms as any);
      mockPlatformService.countPlatforms.mockResolvedValue(total);

      const result = await controller.getPlatforms(query);
      expect(mockPlatformService.getPlatforms).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
      });
      expect(mockPlatformService.countPlatforms).toHaveBeenCalled();
      expect(result).toEqual({
        data: platforms,
        meta: paginationMeta,
      });
    });
  });

  describe('getPlatform', () => {
    it('should return a platform by id', async () => {
      const platformId = 'platform_123';
      const platform = { uid: platformId, name: 'Test Platform' };

      mockPlatformService.getPlatformById.mockResolvedValue(platform as any);

      const result = await controller.getPlatform(platformId);
      expect(mockPlatformService.getPlatformById).toHaveBeenCalledWith(
        platformId,
      );
      expect(result).toEqual(platform);
    });
  });

  describe('updatePlatform', () => {
    it('should update a platform', async () => {
      const platformId = 'platform_123';
      const updateDto: UpdatePlatformDto = {
        name: 'Updated Platform',
      } as UpdatePlatformDto;
      const updatedPlatform = { uid: platformId, ...updateDto };

      mockPlatformService.updatePlatform.mockResolvedValue(
        updatedPlatform as any,
      );

      const result = await controller.updatePlatform(platformId, updateDto);
      expect(mockPlatformService.updatePlatform).toHaveBeenCalledWith(
        platformId,
        updateDto,
      );
      expect(result).toEqual(updatedPlatform);
    });
  });

  describe('deletePlatform', () => {
    it('should delete a platform', async () => {
      const platformId = 'platform_123';

      mockPlatformService.deletePlatform.mockResolvedValue(undefined);

      await controller.deletePlatform(platformId);
      expect(mockPlatformService.deletePlatform).toHaveBeenCalledWith(
        platformId,
      );
    });
  });
});
