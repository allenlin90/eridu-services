import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminShowPlatformController } from './admin-show-platform.controller';

import type { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import type {
  CreateShowPlatformDto,
  UpdateShowPlatformDto,
} from '@/models/show-platform/schemas/show-platform.schema';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

describe('adminShowPlatformController', () => {
  let controller: AdminShowPlatformController;

  const mockShowPlatformService = {
    create: jest.fn(),
    findOne: jest.fn(),
    getShowPlatforms: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShowPlatformController],
      providers: [
        { provide: ShowPlatformService, useValue: mockShowPlatformService },
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

      mockShowPlatformService.create.mockResolvedValue(
        createdShowPlatform as any,
      );
      mockShowPlatformService.findOne.mockResolvedValue(
        showPlatformWithRelations as any,
      );

      const result = await controller.createShowPlatform(createDto);
      expect(
        mockShowPlatformService.create,
      ).toHaveBeenCalledWith(createDto);
      expect(mockShowPlatformService.findOne).toHaveBeenCalledWith(
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
        sort: 'desc',
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

      mockShowPlatformService.getShowPlatforms.mockResolvedValue({
        data: showPlatforms,
        total,
      } as any);

      const result = await controller.getShowPlatforms(query);
      expect(
        mockShowPlatformService.getShowPlatforms,
      ).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          show: true,
          platform: true,
        },
      });
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

      mockShowPlatformService.findOne.mockResolvedValue(
        showPlatform as any,
      );

      const result = await controller.getShowPlatform(showPlatformId);
      expect(mockShowPlatformService.findOne).toHaveBeenCalledWith(
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

      mockShowPlatformService.update.mockResolvedValue(
        updatedShowPlatform as any,
      );
      mockShowPlatformService.findOne.mockResolvedValue(
        showPlatformWithRelations as any,
      );

      const result = await controller.updateShowPlatform(
        showPlatformId,
        updateDto,
      );

      // First findOne call to check existence
      expect(mockShowPlatformService.findOne).toHaveBeenNthCalledWith(
        1,
        showPlatformId,
      );

      expect(
        mockShowPlatformService.update,
      ).toHaveBeenCalledWith(showPlatformId, updateDto);

      // Second findOne call to get result
      expect(mockShowPlatformService.findOne).toHaveBeenNthCalledWith(
        2,
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
      const showPlatform = { uid: showPlatformId };

      mockShowPlatformService.findOne.mockResolvedValue(showPlatform as any);
      mockShowPlatformService.softDelete.mockResolvedValue(undefined);

      await controller.deleteShowPlatform(showPlatformId);

      expect(mockShowPlatformService.findOne).toHaveBeenCalledWith(showPlatformId);
      expect(mockShowPlatformService.softDelete).toHaveBeenCalledWith(
        showPlatformId,
      );
    });
  });
});
