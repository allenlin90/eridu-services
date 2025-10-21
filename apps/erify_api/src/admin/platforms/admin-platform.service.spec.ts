/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';

import { PlatformService } from '../../platform/platform.service';
import { UpdatePlatformDto } from '../../platform/schemas/platform.schema';
import { UtilityService } from '../../utility/utility.service';
import { AdminPlatformService } from './admin-platform.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('AdminPlatformService', () => {
  let service: AdminPlatformService;
  let platformService: PlatformService;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPlatformService,
        {
          provide: PlatformService,
          useValue: {
            createPlatform: jest.fn(),
            getPlatformById: jest.fn(),
            updatePlatform: jest.fn(),
            deletePlatform: jest.fn(),
            getPlatforms: jest.fn(),
            countPlatforms: jest.fn(),
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

    service = module.get<AdminPlatformService>(AdminPlatformService);
    platformService = module.get<PlatformService>(PlatformService);
    utilityService = module.get<UtilityService>(UtilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlatform', () => {
    it('should call platformService.createPlatform with correct data', async () => {
      const createPlatformDto = {
        name: 'Test Platform',
        apiConfig: { key: 'value' },
        metadata: { test: 'data' },
      };

      const expectedResult = {
        id: 1n,
        uid: 'plt_00000001',
        name: 'Test Platform',
        apiConfig: { key: 'value' },
        metadata: { test: 'data' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(platformService, 'createPlatform')
        .mockResolvedValue(expectedResult);

      const result = await service.createPlatform(createPlatformDto);

      expect(platformService.createPlatform).toHaveBeenCalledWith({
        name: createPlatformDto.name,
        apiConfig: createPlatformDto.apiConfig,
        metadata: createPlatformDto.metadata,
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getPlatformById', () => {
    it('should call platformService.getPlatformById with correct uid', async () => {
      const uid = 'plt_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Test Platform',
        apiConfig: { key: 'value' },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(platformService, 'getPlatformById')
        .mockResolvedValue(expectedResult);

      const result = await service.getPlatformById(uid);

      expect(platformService.getPlatformById).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updatePlatform', () => {
    it('should call platformService.updatePlatform with correct uid and data', async () => {
      const uid = 'plt_00000001';
      const updatePlatformDto: Partial<UpdatePlatformDto> = {
        name: 'Updated Platform',
        apiConfig: { key: 'updated' },
      };

      const expectedResult = {
        id: 1n,
        uid,
        name: 'Updated Platform',
        apiConfig: { key: 'updated' },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(platformService, 'updatePlatform')
        .mockResolvedValue(expectedResult);

      const result = await service.updatePlatform(
        uid,
        updatePlatformDto as UpdatePlatformDto,
      );

      expect(platformService.updatePlatform).toHaveBeenCalledWith(
        uid,
        updatePlatformDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deletePlatform', () => {
    it('should call platformService.deletePlatform with correct uid', async () => {
      const uid = 'plt_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Test Platform',
        apiConfig: { key: 'value' },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      jest
        .spyOn(platformService, 'deletePlatform')
        .mockResolvedValue(expectedResult);

      const result = await service.deletePlatform(uid);

      expect(platformService.deletePlatform).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getPlatforms', () => {
    it('should return paginated platforms', async () => {
      const params = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      };

      const platforms = [
        {
          id: 1n,
          uid: 'plt_00000001',
          name: 'Platform 1',
          apiConfig: { key: 'value1' },
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 2n,
          uid: 'plt_00000002',
          name: 'Platform 2',
          apiConfig: { key: 'value2' },
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

      jest.spyOn(platformService, 'getPlatforms').mockResolvedValue(platforms);
      jest.spyOn(platformService, 'countPlatforms').mockResolvedValue(2);
      jest.spyOn(utilityService, 'createPaginationMeta').mockReturnValue(meta);

      const result = await service.getPlatforms(params);

      expect(platformService.getPlatforms).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(platformService.countPlatforms).toHaveBeenCalled();
      expect(utilityService.createPaginationMeta).toHaveBeenCalledWith(
        1,
        10,
        2,
      );
      expect(result).toEqual({ data: platforms, meta });
    });
  });
});
