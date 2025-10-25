/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';

import { UtilityService } from '../utility/utility.service';
import { StudioRepository } from './studio.repository';
import { StudioService } from './studio.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('StudioService', () => {
  let service: StudioService;
  let studioRepository: StudioRepository;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioService,
        {
          provide: StudioRepository,
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
            generateBrandedId: jest.fn().mockReturnValue('std_test123'),
          },
        },
      ],
    }).compile();

    service = module.get<StudioService>(StudioService);
    studioRepository = module.get<StudioRepository>(StudioRepository);
    utilityService = module.get<UtilityService>(UtilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createStudio', () => {
    it('should create a studio with generated uid', async () => {
      const studioData = {
        name: 'Test Studio',
        address: '123 Test Street',
        metadata: { test: 'data' },
      };

      const expectedResult = {
        id: 1n,
        uid: 'std_00000001',
        name: 'Test Studio',
        address: '123 Test Street',
        metadata: { test: 'data' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(studioRepository, 'create').mockResolvedValue(expectedResult);

      const result = await service.createStudio(studioData);

      expect(utilityService.generateBrandedId).toHaveBeenCalledWith(
        'std',
        undefined,
      );
      expect(studioRepository.create).toHaveBeenCalledWith({
        ...studioData,
        uid: 'std_test123',
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getStudioById', () => {
    it('should return studio by uid', async () => {
      const uid = 'std_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Test Studio',
        address: '123 Test Street',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(studioRepository, 'findOne').mockResolvedValue(expectedResult);

      const result = await service.getStudioById(uid);

      expect(studioRepository.findOne).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getStudios', () => {
    it('should return studios with pagination', async () => {
      const params = {
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      };

      const studios = [
        {
          id: 1n,
          uid: 'std_00000001',
          name: 'Studio 1',
          address: '123 Test Street',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      jest.spyOn(studioRepository, 'findMany').mockResolvedValue(studios);

      const result = await service.getStudios(params);

      expect(studioRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(studios);
    });
  });

  describe('updateStudio', () => {
    it('should update studio by uid', async () => {
      const uid = 'std_00000001';
      const updateData = {
        name: 'Updated Studio',
        address: '456 Updated Street',
      };

      const expectedResult = {
        id: 1n,
        uid,
        name: 'Updated Studio',
        address: '456 Updated Street',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(studioRepository, 'update').mockResolvedValue(expectedResult);

      const result = await service.updateStudio(uid, updateData);

      expect(studioRepository.update).toHaveBeenCalledWith({ uid }, updateData);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteStudio', () => {
    it('should soft delete studio by uid', async () => {
      const uid = 'std_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Test Studio',
        address: '123 Test Street',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      jest
        .spyOn(studioRepository, 'softDelete')
        .mockResolvedValue(expectedResult);

      const result = await service.deleteStudio(uid);

      expect(studioRepository.softDelete).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('countStudios', () => {
    it('should return count of studios', async () => {
      jest.spyOn(studioRepository, 'count').mockResolvedValue(5);

      const result = await service.countStudios();

      expect(studioRepository.count).toHaveBeenCalledWith({});
      expect(result).toBe(5);
    });
  });
});
