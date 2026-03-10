import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminCreatorController } from './admin-creator.controller';

import { CreatorService } from '@/models/creator/creator.service';
import type {
  CreateCreatorDto,
  ListCreatorsQueryDto,
  UpdateCreatorDto,
} from '@/models/creator/schemas/creator.schema';

describe('adminCreatorController', () => {
  let controller: AdminCreatorController;

  const mockCreatorService = {
    listCreators: jest.fn(),
    createCreator: jest.fn(),
    getCreatorById: jest.fn(),
    getCreatorByIdWithUser: jest.fn(),
    updateCreator: jest.fn(),
    deleteCreator: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCreatorController],
      providers: [{ provide: CreatorService, useValue: mockCreatorService }],
    }).compile();

    controller = module.get<AdminCreatorController>(AdminCreatorController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCreator', () => {
    it('should create a creator and return with user', async () => {
      const createDto: CreateCreatorDto = {
        name: 'Test Creator',
        userId: 'user_123',
        metadata: {},
      } as CreateCreatorDto;
      const createdCreator = { uid: 'mc_123', ...createDto };
      const creatorWithUser = { ...createdCreator, user: { uid: 'user_123' } };

      mockCreatorService.createCreator.mockResolvedValue(createdCreator as any);
      mockCreatorService.getCreatorByIdWithUser.mockResolvedValue(creatorWithUser as any);

      const result = await controller.createCreator(createDto);

      expect(mockCreatorService.createCreator).toHaveBeenCalledWith({
        name: createDto.name,
        aliasName: createDto.aliasName,
        metadata: createDto.metadata,
        userId: createDto.userId,
      });
      expect(mockCreatorService.getCreatorByIdWithUser).toHaveBeenCalledWith('mc_123');
      expect(result).toEqual(creatorWithUser);
    });
  });

  describe('getCreators', () => {
    it('should return paginated list of creators', async () => {
      const query: ListCreatorsQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        include_deleted: false,
      } as ListCreatorsQueryDto;
      const creators = [
        { uid: 'mc_1', userId: 'user_1' },
        { uid: 'mc_2', userId: 'user_2' },
      ];

      mockCreatorService.listCreators.mockResolvedValue({ data: creators, total: 2 } as any);

      const result = await controller.getCreators(query);

      expect(mockCreatorService.listCreators).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        name: query.name,
        aliasName: query.aliasName,
        uid: query.uid,
        includeDeleted: query.include_deleted,
        includeUser: true,
      });
      expect(result).toEqual({
        data: creators,
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });

  describe('getCreator', () => {
    it('should return a creator by id', async () => {
      const creatorId = 'mc_123';
      const creator = { uid: creatorId, userId: 'user_123' };

      mockCreatorService.getCreatorByIdWithUser.mockResolvedValue(creator as any);

      const result = await controller.getCreator(creatorId);

      expect(mockCreatorService.getCreatorByIdWithUser).toHaveBeenCalledWith(creatorId);
      expect(result).toEqual(creator);
    });
  });

  describe('updateCreator', () => {
    it('should update a creator and return with user', async () => {
      const creatorId = 'mc_123';
      const updateDto: UpdateCreatorDto = { name: 'Updated' } as UpdateCreatorDto;
      const existingCreator = { uid: creatorId, name: 'Old' };
      const updatedCreator = { ...existingCreator, ...updateDto };
      const creatorWithUser = { ...updatedCreator, user: { uid: 'user_123' } };

      mockCreatorService.getCreatorById.mockResolvedValue(existingCreator as any);
      mockCreatorService.updateCreator.mockResolvedValue(updatedCreator as any);
      mockCreatorService.getCreatorByIdWithUser.mockResolvedValue(creatorWithUser as any);

      const result = await controller.updateCreator(creatorId, updateDto);

      expect(mockCreatorService.getCreatorById).toHaveBeenCalledWith(creatorId);
      expect(mockCreatorService.updateCreator).toHaveBeenCalledWith(creatorId, {
        name: updateDto.name,
        aliasName: updateDto.aliasName,
        isBanned: updateDto.isBanned,
        metadata: updateDto.metadata,
        userId: updateDto.userId,
      });
      expect(mockCreatorService.getCreatorByIdWithUser).toHaveBeenCalledWith(creatorId);
      expect(result).toEqual(creatorWithUser);
    });
  });

  describe('deleteCreator', () => {
    it('should delete a creator', async () => {
      const creatorId = 'mc_123';
      const existingCreator = { uid: creatorId };

      mockCreatorService.getCreatorById.mockResolvedValue(existingCreator as any);
      mockCreatorService.deleteCreator.mockResolvedValue(undefined);

      await controller.deleteCreator(creatorId);

      expect(mockCreatorService.getCreatorById).toHaveBeenCalledWith(creatorId);
      expect(mockCreatorService.deleteCreator).toHaveBeenCalledWith(creatorId);
    });
  });
});
