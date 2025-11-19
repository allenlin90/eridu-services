/* eslint-disable @typescript-eslint/unbound-method */
import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

import { ShowStandardRepository } from './show-standard.repository';
import { ShowStandardService } from './show-standard.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('ShowStandardService', () => {
  let service: ShowStandardService;
  let showStandardRepository: ShowStandardRepository;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const showStandardRepositoryMock =
      createMockRepository<ShowStandardRepository>();
    const utilityMock = createMockUtilityService('shsd_test123');

    const module = await createModelServiceTestModule({
      serviceClass: ShowStandardService,
      repositoryClass: ShowStandardRepository,
      repositoryMock: showStandardRepositoryMock,
      utilityMock: utilityMock,
    });

    service = module.get<ShowStandardService>(ShowStandardService);
    showStandardRepository = module.get<ShowStandardRepository>(
      ShowStandardRepository,
    );
    utilityService = module.get<UtilityService>(UtilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShowStandard', () => {
    it('should create a show standard with generated uid', async () => {
      const showStandardData = {
        name: 'Standard',
        metadata: { description: 'Standard show quality' },
      };

      const expectedResult = {
        id: 1n,
        uid: 'shs_00000001',
        name: 'Standard',
        metadata: { description: 'Standard show quality' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStandardRepository, 'create')
        .mockResolvedValue(expectedResult);

      const result = await service.createShowStandard(showStandardData);

      expect(utilityService.generateBrandedId).toHaveBeenCalledWith(
        'shsd',
        undefined,
      );
      expect(showStandardRepository.create).toHaveBeenCalledWith({
        ...showStandardData,
        uid: 'shsd_test123',
      });
      expect(result).toEqual(expectedResult);
    });

    it('should map P2002 to Conflict', async () => {
      const showStandardData = {
        name: 'Standard',
        metadata: {},
      };

      const error = createMockUniqueConstraintError(['name']);
      jest.spyOn(showStandardRepository, 'create').mockRejectedValue(error);

      await expect(
        service.createShowStandard(showStandardData),
      ).rejects.toThrow(error);
    });
  });

  describe('getShowStandardById', () => {
    it('should return show standard when found', async () => {
      const uid = 'shs_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Standard',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStandardRepository, 'findOne')
        .mockResolvedValue(expectedResult);

      const result = await service.getShowStandardById(uid);

      expect(showStandardRepository.findOne).toHaveBeenCalledWith(
        { uid },
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException when not found', async () => {
      const uid = 'shs_404';

      jest.spyOn(showStandardRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getShowStandardById(uid)).rejects.toMatchObject({
        status: 404,
        message: 'Show Standard not found with id shs_404',
      });

      expect(showStandardRepository.findOne).toHaveBeenCalledWith(
        { uid },
        undefined,
      );
    });
  });

  describe('getShowStandards', () => {
    it('should return show standards with pagination', async () => {
      const params = {
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' as const },
      };

      const showStandards = [
        {
          id: 1n,
          uid: 'shs_00000001',
          name: 'Standard',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 2n,
          uid: 'shs_00000002',
          name: 'Premium',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      jest
        .spyOn(showStandardRepository, 'findMany')
        .mockResolvedValue(showStandards);

      const result = await service.getShowStandards(params);

      expect(showStandardRepository.findMany).toHaveBeenCalledWith(params);
      expect(result).toEqual(showStandards);
    });

    it('should return show standards without orderBy', async () => {
      const params = {
        skip: 0,
        take: 10,
      };

      const showStandards = [
        {
          id: 1n,
          uid: 'shs_00000001',
          name: 'Standard',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      jest
        .spyOn(showStandardRepository, 'findMany')
        .mockResolvedValue(showStandards);

      const result = await service.getShowStandards(params);

      expect(showStandardRepository.findMany).toHaveBeenCalledWith(params);
      expect(result).toEqual(showStandards);
    });
  });

  describe('updateShowStandard', () => {
    it('should update show standard successfully', async () => {
      const uid = 'shs_00000001';
      const updateData = {
        name: 'Updated Standard',
        metadata: { description: 'Updated description' },
      };

      const expectedResult = {
        id: 1n,
        uid,
        name: 'Updated Standard',
        metadata: { description: 'Updated description' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStandardRepository, 'update')
        .mockResolvedValue(expectedResult);

      const result = await service.updateShowStandard(uid, updateData);

      expect(showStandardRepository.update).toHaveBeenCalledWith(
        { uid },
        updateData,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should map P2002 to Conflict', async () => {
      const uid = 'shs_00000001';
      const updateData = {
        name: 'Duplicate Standard',
      };

      const error = createMockUniqueConstraintError(['name']);
      jest.spyOn(showStandardRepository, 'update').mockRejectedValue(error);

      await expect(service.updateShowStandard(uid, updateData)).rejects.toThrow(
        error,
      );
    });
  });

  describe('deleteShowStandard', () => {
    it('should soft delete show standard successfully', async () => {
      const uid = 'shs_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Standard',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      jest
        .spyOn(showStandardRepository, 'softDelete')
        .mockResolvedValue(expectedResult);

      const result = await service.deleteShowStandard(uid);

      expect(showStandardRepository.softDelete).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('countShowStandards', () => {
    it('should return count of show standards', async () => {
      const expectedCount = 5;

      jest
        .spyOn(showStandardRepository, 'count')
        .mockResolvedValue(expectedCount);

      const result = await service.countShowStandards();

      expect(showStandardRepository.count).toHaveBeenCalledWith({});
      expect(result).toEqual(expectedCount);
    });
  });
});
