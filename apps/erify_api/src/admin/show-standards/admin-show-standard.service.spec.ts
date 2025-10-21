/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';

import { UpdateShowStandardDto } from '../../show-standard/schemas/show-standard.schema';
import { ShowStandardService } from '../../show-standard/show-standard.service';
import { UtilityService } from '../../utility/utility.service';
import { AdminShowStandardService } from './admin-show-standard.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('AdminShowStandardService', () => {
  let service: AdminShowStandardService;
  let showStandardService: ShowStandardService;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminShowStandardService,
        {
          provide: ShowStandardService,
          useValue: {
            createShowStandard: jest.fn(),
            getShowStandardById: jest.fn(),
            updateShowStandard: jest.fn(),
            deleteShowStandard: jest.fn(),
            getShowStandards: jest.fn(),
            countShowStandards: jest.fn(),
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

    service = module.get<AdminShowStandardService>(AdminShowStandardService);
    showStandardService = module.get<ShowStandardService>(ShowStandardService);
    utilityService = module.get<UtilityService>(UtilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShowStandard', () => {
    it('should call showStandardService.createShowStandard with correct data', async () => {
      const createShowStandardDto = {
        name: 'Test Show Standard',
        metadata: { description: 'Test description' },
      };

      const expectedResult = {
        id: 1n,
        uid: 'shs_00000001',
        name: 'Test Show Standard',
        metadata: { description: 'Test description' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStandardService, 'createShowStandard')
        .mockResolvedValue(expectedResult);

      const result = await service.createShowStandard(createShowStandardDto);

      expect(showStandardService.createShowStandard).toHaveBeenCalledWith({
        name: createShowStandardDto.name,
        metadata: createShowStandardDto.metadata,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getShowStandardById', () => {
    it('should call showStandardService.getShowStandardById with correct uid', async () => {
      const uid = 'shs_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Test Show Standard',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStandardService, 'getShowStandardById')
        .mockResolvedValue(expectedResult);

      const result = await service.getShowStandardById(uid);

      expect(showStandardService.getShowStandardById).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateShowStandard', () => {
    it('should call showStandardService.updateShowStandard with correct uid and data', async () => {
      const uid = 'shs_00000001';
      const updateShowStandardDto: Partial<UpdateShowStandardDto> = {
        name: 'Updated Show Standard',
        metadata: { description: 'Updated description' },
      };

      const expectedResult = {
        id: 1n,
        uid,
        name: 'Updated Show Standard',
        metadata: { description: 'Updated description' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStandardService, 'updateShowStandard')
        .mockResolvedValue(expectedResult);

      const result = await service.updateShowStandard(
        uid,
        updateShowStandardDto as UpdateShowStandardDto,
      );

      expect(showStandardService.updateShowStandard).toHaveBeenCalledWith(
        uid,
        updateShowStandardDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteShowStandard', () => {
    it('should call showStandardService.deleteShowStandard with correct uid', async () => {
      const uid = 'shs_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Test Show Standard',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      jest
        .spyOn(showStandardService, 'deleteShowStandard')
        .mockResolvedValue(expectedResult);

      const result = await service.deleteShowStandard(uid);

      expect(showStandardService.deleteShowStandard).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getShowStandards', () => {
    it('should return paginated show standards', async () => {
      const params = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };

      const showStandards = [
        {
          id: 1n,
          uid: 'shs_00000001',
          name: 'Show Standard 1',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 2n,
          uid: 'shs_00000002',
          name: 'Show Standard 2',
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

      jest
        .spyOn(showStandardService, 'getShowStandards')
        .mockResolvedValue(showStandards);
      jest
        .spyOn(showStandardService, 'countShowStandards')
        .mockResolvedValue(2);
      jest.spyOn(utilityService, 'createPaginationMeta').mockReturnValue(meta);

      const result = await service.getShowStandards(params);

      expect(showStandardService.getShowStandards).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(showStandardService.countShowStandards).toHaveBeenCalled();
      expect(utilityService.createPaginationMeta).toHaveBeenCalledWith(
        1,
        10,
        2,
      );
      expect(result).toEqual({ data: showStandards, meta });
    });
  });
});
