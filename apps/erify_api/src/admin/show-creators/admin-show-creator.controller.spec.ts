import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminShowCreatorController } from './admin-show-creator.controller';

import type { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import type {
  CreateShowCreatorDto,
  UpdateShowCreatorDto,
} from '@/models/show-creator/schemas/show-creator.schema';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';

describe('adminShowCreatorController', () => {
  let controller: AdminShowCreatorController;

  const mockShowCreatorService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findPaginated: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShowCreatorController],
      providers: [{ provide: ShowCreatorService, useValue: mockShowCreatorService }],
    }).compile();

    controller = module.get<AdminShowCreatorController>(AdminShowCreatorController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createShowCreator', () => {
    it('should create a show Creator', async () => {
      const createDto: CreateShowCreatorDto = {
        showId: 'show_123',
        creatorId: 'creator_123',
        metadata: {},
      } as CreateShowCreatorDto;
      const createdShowCreator = { uid: 'show_mc_123', ...createDto };
      const showCreatorWithRelations = {
        ...createdShowCreator,
        show: { uid: 'show_123' },
        creator: { uid: 'creator_123' },
      };

      mockShowCreatorService.create.mockResolvedValue(createdShowCreator as any);
      mockShowCreatorService.findOne.mockResolvedValue(showCreatorWithRelations as any);

      const result = await controller.createShowCreator(createDto);
      expect(mockShowCreatorService.create).toHaveBeenCalledWith(createDto);
      expect(mockShowCreatorService.findOne).toHaveBeenCalledWith(
        createdShowCreator.uid,
        {
          show: true,
          creator: true,
        },
      );
      expect(result).toEqual(showCreatorWithRelations);
    });
  });

  describe('getShowCreators', () => {
    it('should return paginated list of show creators', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        sort: 'desc',
      };
      const showCreators = [
        { uid: 'show_mc_1', showId: 'show_1', creatorId: 'creator_1' },
        { uid: 'show_mc_2', showId: 'show_2', creatorId: 'creator_2' },
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

      mockShowCreatorService.findPaginated.mockResolvedValue({
        data: showCreators,
        total,
      });

      const result = await controller.getShowCreators(query);
      expect(mockShowCreatorService.findPaginated).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({
        data: showCreators,
        meta: paginationMeta,
      });
    });
  });

  describe('getShowCreator', () => {
    it('should return a show Creator by id', async () => {
      const showCreatorId = 'show_mc_123';
      const showCreator = {
        uid: showCreatorId,
        showId: 'show_123',
        creatorId: 'creator_123',
        show: { uid: 'show_123' },
        creator: { uid: 'creator_123' },
      };

      mockShowCreatorService.findOne.mockResolvedValue(showCreator as any);

      const result = await controller.getShowCreator(showCreatorId);
      expect(mockShowCreatorService.findOne).toHaveBeenCalledWith(showCreatorId, {
        show: true,
        creator: true,
      });
      expect(result).toEqual(showCreator);
    });

    it('should throw if show Creator not found', async () => {
      mockShowCreatorService.findOne.mockResolvedValue(null);
      await expect(controller.getShowCreator('show_mc_404')).rejects.toThrow();
    });
  });

  describe('updateShowCreator', () => {
    it('should update a show Creator', async () => {
      const showCreatorId = 'show_mc_123';
      const updateDto: UpdateShowCreatorDto = { metadata: {} } as UpdateShowCreatorDto;
      const updatedShowCreator = { uid: showCreatorId, ...updateDto };
      const showCreatorWithRelations = {
        ...updatedShowCreator,
        show: { uid: 'show_123' },
        creator: { uid: 'creator_123' },
      };

      // First call check existence
      mockShowCreatorService.findOne
        .mockResolvedValueOnce({ uid: showCreatorId } as any)
        // Second call for return value
        .mockResolvedValueOnce(showCreatorWithRelations as any);

      mockShowCreatorService.update.mockResolvedValue(updatedShowCreator as any);

      const result = await controller.updateShowCreator(showCreatorId, updateDto);

      expect(mockShowCreatorService.update).toHaveBeenCalledWith(
        showCreatorId,
        updateDto,
      );
      expect(mockShowCreatorService.findOne).toHaveBeenCalledWith(
        updatedShowCreator.uid,
        {
          show: true,
          creator: true,
        },
      );
      expect(result).toEqual(showCreatorWithRelations);
    });
  });

  describe('deleteShowCreator', () => {
    it('should delete a show Creator', async () => {
      const showCreatorId = 'show_mc_123';

      mockShowCreatorService.findOne.mockResolvedValue({ uid: showCreatorId } as any);
      mockShowCreatorService.softDelete.mockResolvedValue(undefined);

      await controller.deleteShowCreator(showCreatorId);
      expect(mockShowCreatorService.softDelete).toHaveBeenCalledWith(showCreatorId);
    });
  });
});
