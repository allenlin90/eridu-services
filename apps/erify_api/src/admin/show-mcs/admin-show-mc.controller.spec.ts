import { Test, TestingModule } from '@nestjs/testing';

import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import {
  CreateShowMcDto,
  UpdateShowMcDto,
} from '@/models/show-mc/schemas/show-mc.schema';
import { ShowMcService } from '@/models/show-mc/show-mc.service';
import { UtilityService } from '@/utility/utility.service';

import { AdminShowMcController } from './admin-show-mc.controller';

describe('AdminShowMcController', () => {
  let controller: AdminShowMcController;

  const mockShowMcService = {
    createShowMcFromDto: jest.fn(),
    getShowMcById: jest.fn(),
    getActiveShowMcs: jest.fn(),
    countShowMcs: jest.fn(),
    updateShowMcFromDto: jest.fn(),
    deleteShowMc: jest.fn(),
  };

  const mockUtilityService = {
    createPaginationMeta: jest.fn(),
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShowMcController],
      providers: [
        { provide: ShowMcService, useValue: mockShowMcService },
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    controller = module.get<AdminShowMcController>(AdminShowMcController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createShowMc', () => {
    it('should create a show MC', async () => {
      const createDto: CreateShowMcDto = {
        showId: 'show_123',
        mcId: 'mc_123',
        metadata: {},
      } as CreateShowMcDto;
      const createdShowMc = { uid: 'show_mc_123', ...createDto };
      const showMcWithRelations = {
        ...createdShowMc,
        show: { uid: 'show_123' },
        mc: { uid: 'mc_123' },
      };

      mockShowMcService.createShowMcFromDto.mockResolvedValue(
        createdShowMc as any,
      );
      mockShowMcService.getShowMcById.mockResolvedValue(
        showMcWithRelations as any,
      );

      const result = await controller.createShowMc(createDto);

      expect(mockShowMcService.createShowMcFromDto).toHaveBeenCalledWith(
        createDto,
      );
      expect(mockShowMcService.getShowMcById).toHaveBeenCalledWith(
        createdShowMc.uid,
        {
          show: true,
          mc: true,
        },
      );
      expect(result).toEqual(showMcWithRelations);
    });
  });

  describe('getShowMcs', () => {
    it('should return paginated list of show MCs', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const showMcs = [
        { uid: 'show_mc_1', showId: 'show_1', mcId: 'mc_1' },
        { uid: 'show_mc_2', showId: 'show_2', mcId: 'mc_2' },
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

      mockShowMcService.getActiveShowMcs.mockResolvedValue(showMcs as any);
      mockShowMcService.countShowMcs.mockResolvedValue(total);
      mockUtilityService.createPaginationMeta.mockReturnValue(paginationMeta);

      const result = await controller.getShowMcs(query);

      expect(mockShowMcService.getActiveShowMcs).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          show: true,
          mc: true,
        },
      });
      expect(mockShowMcService.countShowMcs).toHaveBeenCalled();
      expect(mockUtilityService.createPaginationMeta).toHaveBeenCalledWith(
        query.page,
        query.limit,
        total,
      );
      expect(result).toEqual({
        data: showMcs,
        meta: paginationMeta,
      });
    });
  });

  describe('getShowMc', () => {
    it('should return a show MC by id', async () => {
      const showMcId = 'show_mc_123';
      const showMc = {
        uid: showMcId,
        showId: 'show_123',
        mcId: 'mc_123',
        show: { uid: 'show_123' },
        mc: { uid: 'mc_123' },
      };

      mockShowMcService.getShowMcById.mockResolvedValue(showMc as any);

      const result = await controller.getShowMc(showMcId);

      expect(mockShowMcService.getShowMcById).toHaveBeenCalledWith(showMcId, {
        show: true,
        mc: true,
      });
      expect(result).toEqual(showMc);
    });
  });

  describe('updateShowMc', () => {
    it('should update a show MC', async () => {
      const showMcId = 'show_mc_123';
      const updateDto: UpdateShowMcDto = { metadata: {} } as UpdateShowMcDto;
      const updatedShowMc = { uid: showMcId, ...updateDto };
      const showMcWithRelations = {
        ...updatedShowMc,
        show: { uid: 'show_123' },
        mc: { uid: 'mc_123' },
      };

      mockShowMcService.updateShowMcFromDto.mockResolvedValue(
        updatedShowMc as any,
      );
      mockShowMcService.getShowMcById.mockResolvedValue(
        showMcWithRelations as any,
      );

      const result = await controller.updateShowMc(showMcId, updateDto);

      expect(mockShowMcService.updateShowMcFromDto).toHaveBeenCalledWith(
        showMcId,
        updateDto,
      );
      expect(mockShowMcService.getShowMcById).toHaveBeenCalledWith(
        updatedShowMc.uid,
        {
          show: true,
          mc: true,
        },
      );
      expect(result).toEqual(showMcWithRelations);
    });
  });

  describe('deleteShowMc', () => {
    it('should delete a show MC', async () => {
      const showMcId = 'show_mc_123';

      mockShowMcService.deleteShowMc.mockResolvedValue(undefined);

      await controller.deleteShowMc(showMcId);

      expect(mockShowMcService.deleteShowMc).toHaveBeenCalledWith(showMcId);
    });
  });
});
