import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminMcController } from './admin-mc.controller';

import { McService } from '@/models/mc/mc.service';
import type {
  CreateMcDto,
  ListMcsQueryDto,
  UpdateMcDto,
} from '@/models/mc/schemas/mc.schema';

describe('adminMcController', () => {
  let controller: AdminMcController;

  const mockMcService = {
    listMcs: jest.fn(),
    createMcFromDto: jest.fn(),
    getMcs: jest.fn(),
    countMcs: jest.fn(),
    getMcById: jest.fn(),
    updateMcFromDto: jest.fn(),
    deleteMc: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMcController],
      providers: [{ provide: McService, useValue: mockMcService }],
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
      const query: ListMcsQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        include_deleted: false,
      } as ListMcsQueryDto;
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

      mockMcService.listMcs.mockResolvedValue({ data: mcs, total } as any);

      const result = await controller.getMcs(query);
      expect(mockMcService.listMcs).toHaveBeenCalledWith(
        {
          skip: query.skip,
          take: query.take,
          name: undefined,
          include_deleted: false,
        },
        { user: true },
      );
      expect(result).toEqual({
        data: mcs,
        meta: paginationMeta,
      });
    });

    it('should filter MCs by name', async () => {
      const query: ListMcsQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        name: 'test',
        include_deleted: false,
      } as ListMcsQueryDto;
      const mcs = [{ uid: 'mc_1', userId: 'user_1', name: 'test' }];
      const total = 1;

      mockMcService.listMcs.mockResolvedValue({ data: mcs, total } as any);

      await controller.getMcs(query);
      expect(mockMcService.listMcs).toHaveBeenCalledWith(
        {
          skip: query.skip,
          take: query.take,
          name: 'test',
          include_deleted: false,
        },
        { user: true },
      );
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
