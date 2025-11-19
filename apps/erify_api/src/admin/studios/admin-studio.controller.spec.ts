import { Test, TestingModule } from '@nestjs/testing';

import { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import {
  CreateStudioDto,
  UpdateStudioDto,
} from '@/models/studio/schemas/studio.schema';
import { StudioService } from '@/models/studio/studio.service';

import { AdminStudioController } from './admin-studio.controller';

describe('AdminStudioController', () => {
  let controller: AdminStudioController;

  const mockStudioService = {
    createStudio: jest.fn(),
    getStudios: jest.fn(),
    countStudios: jest.fn(),
    getStudioById: jest.fn(),
    updateStudio: jest.fn(),
    deleteStudio: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStudioController],
      providers: [{ provide: StudioService, useValue: mockStudioService }],
    }).compile();

    controller = module.get<AdminStudioController>(AdminStudioController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudio', () => {
    it('should create a studio', async () => {
      const createDto: CreateStudioDto = {
        name: 'Test Studio',
        metadata: {},
      } as CreateStudioDto;
      const createdStudio = { uid: 'studio_123', ...createDto };

      mockStudioService.createStudio.mockResolvedValue(createdStudio as any);

      const result = await controller.createStudio(createDto);
      expect(mockStudioService.createStudio).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdStudio);
    });
  });

  describe('getStudios', () => {
    it('should return paginated list of studios', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const studios = [
        { uid: 'studio_1', name: 'Studio 1' },
        { uid: 'studio_2', name: 'Studio 2' },
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

      mockStudioService.getStudios.mockResolvedValue(studios as any);
      mockStudioService.countStudios.mockResolvedValue(total);

      const result = await controller.getStudios(query);
      expect(mockStudioService.getStudios).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
      });
      expect(mockStudioService.countStudios).toHaveBeenCalled();
      expect(result).toEqual({
        data: studios,
        meta: paginationMeta,
      });
    });
  });

  describe('getStudio', () => {
    it('should return a studio by id', async () => {
      const studioId = 'studio_123';
      const studio = { uid: studioId, name: 'Test Studio' };

      mockStudioService.getStudioById.mockResolvedValue(studio as any);

      const result = await controller.getStudio(studioId);
      expect(mockStudioService.getStudioById).toHaveBeenCalledWith(studioId);
      expect(result).toEqual(studio);
    });
  });

  describe('updateStudio', () => {
    it('should update a studio', async () => {
      const studioId = 'studio_123';
      const updateDto: UpdateStudioDto = {
        name: 'Updated Studio',
      } as UpdateStudioDto;
      const updatedStudio = { uid: studioId, ...updateDto };

      mockStudioService.updateStudio.mockResolvedValue(updatedStudio as any);

      const result = await controller.updateStudio(studioId, updateDto);
      expect(mockStudioService.updateStudio).toHaveBeenCalledWith(
        studioId,
        updateDto,
      );
      expect(result).toEqual(updatedStudio);
    });
  });

  describe('deleteStudio', () => {
    it('should delete a studio', async () => {
      const studioId = 'studio_123';

      mockStudioService.deleteStudio.mockResolvedValue(undefined);

      await controller.deleteStudio(studioId);
      expect(mockStudioService.deleteStudio).toHaveBeenCalledWith(studioId);
    });
  });
});
