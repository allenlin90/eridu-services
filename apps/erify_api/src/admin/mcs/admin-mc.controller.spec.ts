import { Test, TestingModule } from '@nestjs/testing';

import { PaginationQueryDto } from '@/common/pagination/schema/pagination.schema';
import { McService } from '@/models/mc/mc.service';
import { CreateMcDto, UpdateMcDto } from '@/models/mc/schemas/mc.schema';
import { UtilityService } from '@/utility/utility.service';

import { AdminMcController } from './admin-mc.controller';

describe('AdminMcController', () => {
  let controller: AdminMcController;

  const mockMcService = {
    createMcFromDto: jest.fn(),
    getMcs: jest.fn(),
    countMcs: jest.fn(),
    getMcById: jest.fn(),
    updateMcFromDto: jest.fn(),
    deleteMc: jest.fn(),
  };

  const mockUtilityService = {
    createPaginationMeta: jest.fn(),
    generateBrandedId: jest.fn(),
    isTimeOverlapping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMcController],
      providers: [
        { provide: McService, useValue: mockMcService },
        { provide: UtilityService, useValue: mockUtilityService },
      ],
    }).compile();

    controller = module.get<AdminMcController>(AdminMcController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMc', () => {
    it('should create an MC', async () => {
      const createDto: CreateMcDto = {
        userId: 'user_123',
        metadata: {},
      } as CreateMcDto;
      const createdMc = { uid: 'mc_123', ...createDto };

      mockMcService.createMcFromDto.mockResolvedValue(createdMc as any);

      const result = await controller.createMc(createDto);

      expect(mockMcService.createMcFromDto).toHaveBeenCalledWith(createDto, {
        user: true,
      });
      expect(result).toEqual(createdMc);
    });
  });

  describe('getMcs', () => {
    it('should return paginated list of MCs', async () => {
      const query: PaginationQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };
      const mcs = [
        { uid: 'mc_1', userId: 'user_1' },
        { uid: 'mc_2', userId: 'user_2' },
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

      mockMcService.getMcs.mockResolvedValue(mcs as any);
      mockMcService.countMcs.mockResolvedValue(total);
      mockUtilityService.createPaginationMeta.mockReturnValue(paginationMeta);

      const result = await controller.getMcs(query);

      expect(mockMcService.getMcs).toHaveBeenCalledWith(
        { skip: query.skip, take: query.take },
        { user: true },
      );
      expect(mockMcService.countMcs).toHaveBeenCalled();
      expect(mockUtilityService.createPaginationMeta).toHaveBeenCalledWith(
        query.page,
        query.limit,
        total,
      );
      expect(result).toEqual({
        data: mcs,
        meta: paginationMeta,
      });
    });
  });

  describe('getMc', () => {
    it('should return an MC by id', async () => {
      const mcId = 'mc_123';
      const mc = { uid: mcId, userId: 'user_123' };

      mockMcService.getMcById.mockResolvedValue(mc as any);

      const result = await controller.getMc(mcId);

      expect(mockMcService.getMcById).toHaveBeenCalledWith(mcId, {
        user: true,
      });
      expect(result).toEqual(mc);
    });
  });

  describe('updateMc', () => {
    it('should update an MC', async () => {
      const mcId = 'mc_123';
      const updateDto: UpdateMcDto = { metadata: {} } as UpdateMcDto;
      const updatedMc = { uid: mcId, ...updateDto };

      mockMcService.updateMcFromDto.mockResolvedValue(updatedMc as any);

      const result = await controller.updateMc(mcId, updateDto);

      expect(mockMcService.updateMcFromDto).toHaveBeenCalledWith(
        mcId,
        updateDto,
        {
          user: true,
        },
      );
      expect(result).toEqual(updatedMc);
    });
  });

  describe('deleteMc', () => {
    it('should delete an MC', async () => {
      const mcId = 'mc_123';

      mockMcService.deleteMc.mockResolvedValue(undefined);

      await controller.deleteMc(mcId);

      expect(mockMcService.deleteMc).toHaveBeenCalledWith(mcId);
    });
  });
});
