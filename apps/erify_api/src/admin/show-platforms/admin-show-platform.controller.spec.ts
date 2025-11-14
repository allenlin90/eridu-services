import { Test, TestingModule } from '@nestjs/testing';

import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import {
  CreateShowPlatformDto,
  UpdateShowPlatformDto,
} from '@/models/show-platform/schemas/show-platform.schema';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { UtilityService } from '@/utility/utility.service';

import { AdminShowPlatformController } from './admin-show-platform.controller';

describe('AdminShowPlatformController', () => {
  let controller: AdminShowPlatformController;

  const mockShowPlatformService = {
    createShowPlatformFromDto: jest.fn(),
    getShowPlatformById: jest.fn(),
    getActiveShowPlatforms: jest.fn(),
    countShowPlatforms: jest.fn(),
    updateShowPlatformFromDto: jest.fn(),
    deleteShowPlatform: jest.fn(),
  };

  const mockUtilityService = {
    createPaginationMeta: jest.fn(),
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShowPlatformController],
      providers: [
        { provide: ShowPlatformService, useValue: mockShowPlatformService },
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    controller = module.get<AdminShowPlatformController>(
      AdminShowPlatformController,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createShowPlatform', () => {
    it('should create a show platform', async () => {
      const createDto: CreateShowPlatformDto = {
        showId: 'show_123',
        platformId: 'platform_123',
        metadata: {},
      } as CreateShowPlatformDto;
      const createdShowPlatform = { uid: 'show_platform_123', ...createDto };
      const showPlatformWithRelations = {
        ...createdShowPlatform,
        show: { uid: 'show_123' },
        platform: { uid: 'platform_123' },
      };

      mockShowPlatformService.createShowPlatformFromDto.mockResolvedValue(
        createdShowPlatform as any,
      );
      mockShowPlatformService.getShowPlatformById.mockResolvedValue(
        showPlatformWithRelations as any,
      );

      const result = await controller.createShowPlatform(createDto);

      expect(
        mockShowPlatformService.createShowPlatformFromDto,
      ).toHaveBeenCalledWith(createDto);
      expect(mockShowPlatformService.getShowPlatformById).toHaveBeenCalledWith(
        createdShowPlatform.uid,
        {
          show: true,
          platform: true,
        },
      );
      expect(result).toEqual(showPlatformWithRelations);
    });
  });

  describe('getShowPlatforms', () => {
    it('should return paginated list of show platforms', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const showPlatforms = [
        { uid: 'show_platform_1', showId: 'show_1', platformId: 'platform_1' },
        { uid: 'show_platform_2', showId: 'show_2', platformId: 'platform_2' },
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

      mockShowPlatformService.getActiveShowPlatforms.mockResolvedValue(
        showPlatforms as any,
      );
      mockShowPlatformService.countShowPlatforms.mockResolvedValue(total);
      mockUtilityService.createPaginationMeta.mockReturnValue(paginationMeta);

      const result = await controller.getShowPlatforms(query);

      expect(
        mockShowPlatformService.getActiveShowPlatforms,
      ).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          show: true,
          platform: true,
        },
      });
      expect(mockShowPlatformService.countShowPlatforms).toHaveBeenCalled();
      expect(mockUtilityService.createPaginationMeta).toHaveBeenCalledWith(
        query.page,
        query.limit,
        total,
      );
      expect(result).toEqual({
        data: showPlatforms,
        meta: paginationMeta,
      });
    });
  });

  describe('getShowPlatform', () => {
    it('should return a show platform by id', async () => {
      const showPlatformId = 'show_platform_123';
      const showPlatform = {
        uid: showPlatformId,
        showId: 'show_123',
        platformId: 'platform_123',
        show: { uid: 'show_123' },
        platform: { uid: 'platform_123' },
      };

      mockShowPlatformService.getShowPlatformById.mockResolvedValue(
        showPlatform as any,
      );

      const result = await controller.getShowPlatform(showPlatformId);

      expect(mockShowPlatformService.getShowPlatformById).toHaveBeenCalledWith(
        showPlatformId,
        {
          show: true,
          platform: true,
        },
      );
      expect(result).toEqual(showPlatform);
    });
  });

  describe('updateShowPlatform', () => {
    it('should update a show platform', async () => {
      const showPlatformId = 'show_platform_123';
      const updateDto: UpdateShowPlatformDto = {
        metadata: {},
      } as UpdateShowPlatformDto;
      const updatedShowPlatform = { uid: showPlatformId, ...updateDto };
      const showPlatformWithRelations = {
        ...updatedShowPlatform,
        show: { uid: 'show_123' },
        platform: { uid: 'platform_123' },
      };

      mockShowPlatformService.updateShowPlatformFromDto.mockResolvedValue(
        updatedShowPlatform as any,
      );
      mockShowPlatformService.getShowPlatformById.mockResolvedValue(
        showPlatformWithRelations as any,
      );

      const result = await controller.updateShowPlatform(
        showPlatformId,
        updateDto,
      );

      expect(
        mockShowPlatformService.updateShowPlatformFromDto,
      ).toHaveBeenCalledWith(showPlatformId, updateDto);
      expect(mockShowPlatformService.getShowPlatformById).toHaveBeenCalledWith(
        updatedShowPlatform.uid,
        {
          show: true,
          platform: true,
        },
      );
      expect(result).toEqual(showPlatformWithRelations);
    });
  });

  describe('deleteShowPlatform', () => {
    it('should delete a show platform', async () => {
      const showPlatformId = 'show_platform_123';

      mockShowPlatformService.deleteShowPlatform.mockResolvedValue(undefined);

      await controller.deleteShowPlatform(showPlatformId);

      expect(mockShowPlatformService.deleteShowPlatform).toHaveBeenCalledWith(
        showPlatformId,
      );
    });
  });
});
