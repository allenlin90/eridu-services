import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminShowStandardController } from './admin-show-standard.controller';

import type { PaginationQueryDto } from '@/lib/pagination/pagination.schema';
import type {
  CreateShowStandardDto,
  UpdateShowStandardDto,
} from '@/models/show-standard/schemas/show-standard.schema';
import { ShowStandardService } from '@/models/show-standard/show-standard.service';

describe('adminShowStandardController', () => {
  let controller: AdminShowStandardController;

  const mockShowStandardService = {
    listShowStandards: jest.fn(),
    createShowStandard: jest.fn(),
    getShowStandards: jest.fn(),
    countShowStandards: jest.fn(),
    getShowStandardById: jest.fn(),
    updateShowStandard: jest.fn(),
    deleteShowStandard: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShowStandardController],
      providers: [
        { provide: ShowStandardService, useValue: mockShowStandardService },
      ],
    }).compile();

    controller = module.get<AdminShowStandardController>(
      AdminShowStandardController,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createShowStandard', () => {
    it('should create a show standard', async () => {
      const createDto: CreateShowStandardDto = {
        name: 'HD',
        metadata: {},
      } as CreateShowStandardDto;
      const createdStandard = { uid: 'show_standard_123', ...createDto };

      mockShowStandardService.createShowStandard.mockResolvedValue(
        createdStandard as any,
      );

      const result = await controller.createShowStandard(createDto);
      expect(mockShowStandardService.createShowStandard).toHaveBeenCalledWith(
        createDto,
      );
      expect(result).toEqual(createdStandard);
    });
  });

  describe('getShowStandards', () => {
    it('should return paginated list of show standards', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const standards = [
        { uid: 'show_standard_1', name: 'HD' },
        { uid: 'show_standard_2', name: '4K' },
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

      mockShowStandardService.listShowStandards.mockResolvedValue({
        data: standards,
        total,
      } as any);

      const result = await controller.getShowStandards(query);
      expect(mockShowStandardService.listShowStandards).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
      });
      expect(result).toEqual({
        data: standards,
        meta: paginationMeta,
      });
    });
  });

  describe('getShowStandard', () => {
    it('should return a show standard by id', async () => {
      const standardId = 'show_standard_123';
      const standard = { uid: standardId, name: 'HD' };

      mockShowStandardService.getShowStandardById.mockResolvedValue(
        standard as any,
      );

      const result = await controller.getShowStandard(standardId);
      expect(mockShowStandardService.getShowStandardById).toHaveBeenCalledWith(
        standardId,
      );
      expect(result).toEqual(standard);
    });
  });

  describe('updateShowStandard', () => {
    it('should update a show standard', async () => {
      const standardId = 'show_standard_123';
      const updateDto: UpdateShowStandardDto = {
        name: 'Updated Standard',
      } as UpdateShowStandardDto;
      const updatedStandard = { uid: standardId, ...updateDto };

      mockShowStandardService.updateShowStandard.mockResolvedValue(
        updatedStandard as any,
      );

      const result = await controller.updateShowStandard(standardId, updateDto);
      expect(mockShowStandardService.updateShowStandard).toHaveBeenCalledWith(
        standardId,
        updateDto,
      );
      expect(result).toEqual(updatedStandard);
    });
  });

  describe('deleteShowStandard', () => {
    it('should delete a show standard', async () => {
      const standardId = 'show_standard_123';

      mockShowStandardService.deleteShowStandard.mockResolvedValue(undefined);

      await controller.deleteShowStandard(standardId);
      expect(mockShowStandardService.deleteShowStandard).toHaveBeenCalledWith(
        standardId,
      );
    });
  });
});
