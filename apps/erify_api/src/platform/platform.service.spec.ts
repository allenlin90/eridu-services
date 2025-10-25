/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';

import { UtilityService } from '../utility/utility.service';
import { PlatformRepository } from './platform.repository';
import { PlatformService } from './platform.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('PlatformService', () => {
  let service: PlatformService;
  let platformRepository: PlatformRepository;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        {
          provide: PlatformRepository,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: UtilityService,
          useValue: {
            generateBrandedId: jest.fn().mockReturnValue('plt_test123'),
          },
        },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);
    platformRepository = module.get<PlatformRepository>(PlatformRepository);
    utilityService = module.get<UtilityService>(UtilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlatform', () => {
    it('should create a platform with generated uid', async () => {
      const platformData = {
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
        .spyOn(platformRepository, 'create')
        .mockResolvedValue(expectedResult);

      const result = await service.createPlatform(platformData);

      expect(utilityService.generateBrandedId).toHaveBeenCalledWith(
        'plt',
        undefined,
      );
      expect(platformRepository.create).toHaveBeenCalledWith({
        ...platformData,
        uid: 'plt_test123',
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getPlatformById', () => {
    it('should return platform by uid', async () => {
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
        .spyOn(platformRepository, 'findOne')
        .mockResolvedValue(expectedResult);

      const result = await service.getPlatformById(uid);

      expect(platformRepository.findOne).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getPlatforms', () => {
    it('should return platforms with pagination', async () => {
      const params = {
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
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
      ];

      jest.spyOn(platformRepository, 'findMany').mockResolvedValue(platforms);

      const result = await service.getPlatforms(params);

      expect(platformRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(platforms);
    });
  });

  describe('updatePlatform', () => {
    it('should update platform by uid', async () => {
      const uid = 'plt_00000001';
      const updateData = {
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
        .spyOn(platformRepository, 'update')
        .mockResolvedValue(expectedResult);

      const result = await service.updatePlatform(uid, updateData);

      expect(platformRepository.update).toHaveBeenCalledWith(
        { uid },
        updateData,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deletePlatform', () => {
    it('should soft delete platform by uid', async () => {
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
        .spyOn(platformRepository, 'softDelete')
        .mockResolvedValue(expectedResult);

      const result = await service.deletePlatform(uid);

      expect(platformRepository.softDelete).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('countPlatforms', () => {
    it('should return count of platforms', async () => {
      jest.spyOn(platformRepository, 'count').mockResolvedValue(5);

      const result = await service.countPlatforms();

      expect(platformRepository.count).toHaveBeenCalledWith({});
      expect(result).toBe(5);
    });
  });
});
