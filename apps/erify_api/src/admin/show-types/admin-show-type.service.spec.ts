/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';

import { UpdateShowTypeDto } from '../../show-type/schemas/show-type.schema';
import { ShowTypeService } from '../../show-type/show-type.service';
import { UtilityService } from '../../utility/utility.service';
import { AdminShowTypeService } from './admin-show-type.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('AdminShowTypeService', () => {
  let service: AdminShowTypeService;
  let showTypeService: ShowTypeService;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminShowTypeService,
        {
          provide: ShowTypeService,
          useValue: {
            createShowType: jest.fn(),
            getShowTypeById: jest.fn(),
            updateShowType: jest.fn(),
            deleteShowType: jest.fn(),
            getShowTypes: jest.fn(),
            countShowTypes: jest.fn(),
          },
        },
        {
          provide: UtilityService,
          useValue: {
            createPaginationMeta: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminShowTypeService>(AdminShowTypeService);
    showTypeService = module.get<ShowTypeService>(ShowTypeService);
    utilityService = module.get<UtilityService>(UtilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShowType', () => {
    it('should call showTypeService.createShowType with correct data', async () => {
      const createShowTypeDto = {
        name: 'Test Show Type',
        metadata: { description: 'Test description' },
      };

      const expectedResult = {
        id: 1n,
        uid: 'sht_00000001',
        name: 'Test Show Type',
        metadata: { description: 'Test description' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showTypeService, 'createShowType')
        .mockResolvedValue(expectedResult);

      const result = await service.createShowType(createShowTypeDto);

      expect(showTypeService.createShowType).toHaveBeenCalledWith({
        name: createShowTypeDto.name,
        metadata: createShowTypeDto.metadata,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getShowTypeById', () => {
    it('should call showTypeService.getShowTypeById with correct uid', async () => {
      const uid = 'sht_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Test Show Type',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showTypeService, 'getShowTypeById')
        .mockResolvedValue(expectedResult);

      const result = await service.getShowTypeById(uid);

      expect(showTypeService.getShowTypeById).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateShowType', () => {
    it('should call showTypeService.updateShowType with correct uid and data', async () => {
      const uid = 'sht_00000001';
      const updateShowTypeDto: Partial<UpdateShowTypeDto> = {
        name: 'Updated Show Type',
        metadata: { description: 'Updated description' },
      };

      const expectedResult = {
        id: 1n,
        uid,
        name: 'Updated Show Type',
        metadata: { description: 'Updated description' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showTypeService, 'updateShowType')
        .mockResolvedValue(expectedResult);

      const result = await service.updateShowType(
        uid,
        updateShowTypeDto as UpdateShowTypeDto,
      );

      expect(showTypeService.updateShowType).toHaveBeenCalledWith(
        uid,
        updateShowTypeDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteShowType', () => {
    it('should call showTypeService.deleteShowType with correct uid', async () => {
      const uid = 'sht_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Test Show Type',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      jest
        .spyOn(showTypeService, 'deleteShowType')
        .mockResolvedValue(expectedResult);

      const result = await service.deleteShowType(uid);

      expect(showTypeService.deleteShowType).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getShowTypes', () => {
    it('should return paginated show types', async () => {
      const params = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };

      const showTypes = [
        {
          id: 1n,
          uid: 'sht_00000001',
          name: 'Show Type 1',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 2n,
          uid: 'sht_00000002',
          name: 'Show Type 2',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      const meta = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      jest.spyOn(showTypeService, 'getShowTypes').mockResolvedValue(showTypes);
      jest.spyOn(showTypeService, 'countShowTypes').mockResolvedValue(2);
      jest.spyOn(utilityService, 'createPaginationMeta').mockReturnValue(meta);

      const result = await service.getShowTypes(params);

      expect(showTypeService.getShowTypes).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(showTypeService.countShowTypes).toHaveBeenCalled();
      expect(utilityService.createPaginationMeta).toHaveBeenCalledWith(
        1,
        10,
        2,
      );
      expect(result).toEqual({ data: showTypes, meta });
    });
  });
});
