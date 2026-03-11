import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminShowCreatorController } from './admin-show-creator.controller';

import type { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import type {
  CreateShowMcDto,
  UpdateShowMcDto,
} from '@/models/show-mc/schemas/show-mc.schema';
import { ShowMcService } from '@/models/show-mc/show-mc.service';

describe('adminShowCreatorController', () => {
  let controller: AdminShowCreatorController;

  const mockShowMcService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findPaginated: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShowCreatorController],
      providers: [{ provide: ShowMcService, useValue: mockShowMcService }],
    }).compile();

    controller = module.get<AdminShowCreatorController>(AdminShowCreatorController);
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

      mockShowMcService.create.mockResolvedValue(createdShowMc as any);
      mockShowMcService.findOne.mockResolvedValue(showMcWithRelations as any);

      const result = await controller.createShowMc(createDto);
      expect(mockShowMcService.create).toHaveBeenCalledWith(createDto);
      expect(mockShowMcService.findOne).toHaveBeenCalledWith(
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
        sort: 'desc',
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

      mockShowMcService.findPaginated.mockResolvedValue({
        data: showMcs,
        total,
      });

      const result = await controller.getShowMcs(query);
      expect(mockShowMcService.findPaginated).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      });
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

      mockShowMcService.findOne.mockResolvedValue(showMc as any);

      const result = await controller.getShowMc(showMcId);
      expect(mockShowMcService.findOne).toHaveBeenCalledWith(showMcId, {
        show: true,
        mc: true,
      });
      expect(result).toEqual(showMc);
    });

    it('should throw if show MC not found', async () => {
      mockShowMcService.findOne.mockResolvedValue(null);
      await expect(controller.getShowMc('show_mc_404')).rejects.toThrow();
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

      // First call check existence
      mockShowMcService.findOne
        .mockResolvedValueOnce({ uid: showMcId } as any)
        // Second call for return value
        .mockResolvedValueOnce(showMcWithRelations as any);

      mockShowMcService.update.mockResolvedValue(updatedShowMc as any);

      const result = await controller.updateShowMc(showMcId, updateDto);

      expect(mockShowMcService.update).toHaveBeenCalledWith(
        showMcId,
        updateDto,
      );
      expect(mockShowMcService.findOne).toHaveBeenCalledWith(
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

      mockShowMcService.findOne.mockResolvedValue({ uid: showMcId } as any);
      mockShowMcService.softDelete.mockResolvedValue(undefined);

      await controller.deleteShowMc(showMcId);
      expect(mockShowMcService.softDelete).toHaveBeenCalledWith(showMcId);
    });
  });
});
