import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminCreatorController } from './admin-creator.controller';

import { McService } from '@/models/mc/mc.service';
import type {
  CreateMcDto,
  ListMcsQueryDto,
  UpdateMcDto,
} from '@/models/mc/schemas/mc.schema';

describe('adminCreatorController', () => {
  let controller: AdminCreatorController;

  const mockMcService = {
    listMcs: jest.fn(),
    createMc: jest.fn(),
    getMcById: jest.fn(),
    getMcByIdWithUser: jest.fn(),
    updateMc: jest.fn(),
    deleteMc: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCreatorController],
      providers: [{ provide: McService, useValue: mockMcService }],
    }).compile();

    controller = module.get<AdminCreatorController>(AdminCreatorController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCreator', () => {
    it('should create a creator and return with user', async () => {
      const createDto: CreateMcDto = {
        name: 'Test MC',
        userId: 'user_123',
        metadata: {},
      } as CreateMcDto;
      const createdMc = { uid: 'mc_123', ...createDto };
      const mcWithUser = { ...createdMc, user: { uid: 'user_123' } };

      mockMcService.createMc.mockResolvedValue(createdMc as any);
      mockMcService.getMcByIdWithUser.mockResolvedValue(mcWithUser as any);

      const result = await controller.createCreator(createDto);

      expect(mockMcService.createMc).toHaveBeenCalledWith({
        name: createDto.name,
        aliasName: createDto.aliasName,
        metadata: createDto.metadata,
        userId: createDto.userId,
      });
      expect(mockMcService.getMcByIdWithUser).toHaveBeenCalledWith('mc_123');
      expect(result).toEqual(mcWithUser);
    });
  });

  describe('getCreators', () => {
    it('should return paginated list of creators', async () => {
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

      const result = await controller.getCreators(query);
      expect(mockMcService.listMcs).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        name: query.name,
        aliasName: query.aliasName,
        uid: query.uid,
        includeDeleted: query.include_deleted,
        includeUser: true,
      });
      expect(result).toEqual({
        data: mcs,
        meta: paginationMeta,
      });
    });

    it('should filter creators by name and aliasName', async () => {
      const query: ListMcsQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        name: 'test',
        aliasName: 'alias',
        include_deleted: false,
      } as ListMcsQueryDto;
      const mcs = [
        { uid: 'mc_1', userId: 'user_1', name: 'test', aliasName: 'alias' },
      ];
      const total = 1;

      mockMcService.listMcs.mockResolvedValue({ data: mcs, total } as any);

      await controller.getCreators(query);
      expect(mockMcService.listMcs).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        name: query.name,
        aliasName: query.aliasName,
        uid: query.uid,
        includeDeleted: query.include_deleted,
        includeUser: true,
      });
    });
  });

  describe('getCreator', () => {
    it('should return a creator by id', async () => {
      const mcId = 'mc_123';
      const mc = { uid: mcId, userId: 'user_123' };

      mockMcService.getMcByIdWithUser.mockResolvedValue(mc as any);

      const result = await controller.getCreator(mcId);
      expect(mockMcService.getMcByIdWithUser).toHaveBeenCalledWith(mcId);
      expect(result).toEqual(mc);
    });
  });

  describe('updateCreator', () => {
    it('should update a creator and return with user', async () => {
      const mcId = 'mc_123';
      const updateDto: UpdateMcDto = { name: 'Updated' } as UpdateMcDto;
      const existingMc = { uid: mcId, name: 'Old' };
      const updatedMc = { ...existingMc, ...updateDto };
      const mcWithUser = { ...updatedMc, user: { uid: 'user_123' } };

      mockMcService.getMcById.mockResolvedValue(existingMc as any);
      mockMcService.updateMc.mockResolvedValue(updatedMc as any);
      mockMcService.getMcByIdWithUser.mockResolvedValue(mcWithUser as any);

      const result = await controller.updateCreator(mcId, updateDto);

      expect(mockMcService.getMcById).toHaveBeenCalledWith(mcId);
      expect(mockMcService.updateMc).toHaveBeenCalledWith(mcId, {
        name: updateDto.name,
        aliasName: updateDto.aliasName,
        isBanned: updateDto.isBanned,
        metadata: updateDto.metadata,
        userId: updateDto.userId,
      });
      expect(mockMcService.getMcByIdWithUser).toHaveBeenCalledWith(mcId);
      expect(result).toEqual(mcWithUser);
    });
  });

  describe('deleteCreator', () => {
    it('should delete a creator', async () => {
      const mcId = 'mc_123';
      const existingMc = { uid: mcId };

      mockMcService.getMcById.mockResolvedValue(existingMc as any);
      mockMcService.deleteMc.mockResolvedValue(undefined);

      await controller.deleteCreator(mcId);
      expect(mockMcService.getMcById).toHaveBeenCalledWith(mcId);
      expect(mockMcService.deleteMc).toHaveBeenCalledWith(mcId);
    });
  });
});
