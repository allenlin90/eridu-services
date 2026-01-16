import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminShowTypeController } from './admin-show-type.controller';

import type {
  CreateShowTypeDto,
  ListShowTypesQueryDto,
  UpdateShowTypeDto,
} from '@/models/show-type/schemas/show-type.schema';
import { ShowTypeService } from '@/models/show-type/show-type.service';

describe('adminShowTypeController', () => {
  let controller: AdminShowTypeController;

  const mockShowTypeService = {
    listShowTypes: jest.fn(),
    createShowType: jest.fn(),
    getShowTypes: jest.fn(),
    countShowTypes: jest.fn(),
    getShowTypeById: jest.fn(),
    updateShowType: jest.fn(),
    deleteShowType: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminShowTypeController],
      providers: [{ provide: ShowTypeService, useValue: mockShowTypeService }],
    }).compile();

    controller = module.get<AdminShowTypeController>(AdminShowTypeController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createShowType', () => {
    it('should create a show type', async () => {
      const createDto: CreateShowTypeDto = {
        name: 'Live',
        metadata: {},
      } as CreateShowTypeDto;
      const createdType = { uid: 'show_type_123', ...createDto };

      mockShowTypeService.createShowType.mockResolvedValue(createdType as any);

      const result = await controller.createShowType(createDto);
      expect(mockShowTypeService.createShowType).toHaveBeenCalledWith(
        createDto,
      );
      expect(result).toEqual(createdType);
    });
  });

  describe('getShowTypes', () => {
    it('should return paginated list of show types', async () => {
      const query: ListShowTypesQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        uid: undefined,
        name: undefined,
        include_deleted: false,
      };
      const types = [
        { uid: 'show_type_1', name: 'Live' },
        { uid: 'show_type_2', name: 'Recorded' },
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

      mockShowTypeService.listShowTypes.mockResolvedValue({
        data: types,
        total,
      } as any);

      const result = await controller.getShowTypes(query);
      expect(mockShowTypeService.listShowTypes).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        uid: query.uid,
        name: query.name,
        include_deleted: query.include_deleted,
      });
      expect(result).toEqual({
        data: types,
        meta: paginationMeta,
      });
    });
  });

  describe('getShowType', () => {
    it('should return a show type by id', async () => {
      const typeId = 'show_type_123';
      const type = { uid: typeId, name: 'Live' };

      mockShowTypeService.getShowTypeById.mockResolvedValue(type as any);

      const result = await controller.getShowType(typeId);
      expect(mockShowTypeService.getShowTypeById).toHaveBeenCalledWith(typeId);
      expect(result).toEqual(type);
    });
  });

  describe('updateShowType', () => {
    it('should update a show type', async () => {
      const typeId = 'show_type_123';
      const updateDto: UpdateShowTypeDto = {
        name: 'Updated Type',
      } as UpdateShowTypeDto;
      const updatedType = { uid: typeId, ...updateDto };

      mockShowTypeService.updateShowType.mockResolvedValue(updatedType as any);

      const result = await controller.updateShowType(typeId, updateDto);
      expect(mockShowTypeService.updateShowType).toHaveBeenCalledWith(
        typeId,
        updateDto,
      );
      expect(result).toEqual(updatedType);
    });
  });

  describe('deleteShowType', () => {
    it('should delete a show type', async () => {
      const typeId = 'show_type_123';

      mockShowTypeService.deleteShowType.mockResolvedValue(undefined);

      await controller.deleteShowType(typeId);
      expect(mockShowTypeService.deleteShowType).toHaveBeenCalledWith(typeId);
    });
  });
});
