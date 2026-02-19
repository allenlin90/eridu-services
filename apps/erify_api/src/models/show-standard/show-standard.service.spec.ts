import { Prisma } from '@prisma/client';

import { ShowStandardRepository } from './show-standard.repository';
import { ShowStandardService } from './show-standard.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('showStandardService', () => {
  let service: ShowStandardService;
  let showStandardRepository: ShowStandardRepository;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const showStandardRepositoryMock = createMockRepository<ShowStandardRepository>(
      {
        findPaginated: jest.fn(),
      },
    );

    const utilityMock = createMockUtilityService('shsd_test123');

    const module = await createModelServiceTestModule({
      serviceClass: ShowStandardService,
      repositoryClass: ShowStandardRepository,
      repositoryMock: showStandardRepositoryMock,
      utilityMock,
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
        .spyOn(showStandardRepository, 'findByUid')
        .mockResolvedValue(expectedResult);

      const result = await service.getShowStandardById(uid);

      expect(showStandardRepository.findByUid).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });

    it('should return null when not found', async () => {
      const uid = 'shs_404';

      jest.spyOn(showStandardRepository, 'findByUid').mockResolvedValue(null);

      const result = await service.getShowStandardById(uid);

      expect(showStandardRepository.findByUid).toHaveBeenCalledWith(uid);
      expect(result).toBeNull();
    });
  });

  describe('getShowStandards', () => {
    it('should return show standards with pagination', async () => {
      const params = {
        skip: 0,
        take: 10,
        orderBy: 'asc' as const,
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
        .spyOn(showStandardRepository, 'findPaginated')
        .mockResolvedValue({ data: showStandards, total: 2 });

      const result = await service.getShowStandards(params);

      expect(showStandardRepository.findPaginated).toHaveBeenCalledWith(params);
      expect(result).toEqual({ data: showStandards, total: 2 });
    });
  });

  describe('listShowStandards', () => {
    it('should filter show standards and return paginated result', async () => {
      const params = {
        skip: 0,
        take: 10,
        name: 'Standard',
        include_deleted: false,
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
        .spyOn(showStandardRepository, 'findPaginated')
        .mockResolvedValue({ data: showStandards, total: 1 });

      const result = await service.listShowStandards(params);

      // Verify explicit filtering logic
      expect(showStandardRepository.findPaginated).toHaveBeenCalledWith({
        skip: params.skip,
        take: params.take,
        name: params.name,
        uid: undefined,
        includeDeleted: false,
      });
      expect(result).toEqual({ data: showStandards, total: 1 });
    });

    it('should handle include_deleted filter', async () => {
      const params = {
        skip: 0,
        take: 10,
        include_deleted: true,
      };

      jest
        .spyOn(showStandardRepository, 'findPaginated')
        .mockResolvedValue({ data: [], total: 0 });

      await service.listShowStandards(params);

      expect(showStandardRepository.findPaginated).toHaveBeenCalledWith({
        skip: params.skip,
        take: params.take,
        name: undefined,
        uid: undefined,
        includeDeleted: true,
      });
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

    it('should throw P2025 when updating non-existent record', async () => {
      const uid = 'shs_404';
      const error = new Prisma.PrismaClientKnownRequestError(
        'No ShowStandard found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );
      jest
        .spyOn(showStandardRepository, 'update')
        .mockRejectedValue(error);

      await expect(
        service.updateShowStandard(uid, { name: 'New Name' }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
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

      const result = await service.deleteShowStandard({ uid });

      expect(showStandardRepository.softDelete).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(expectedResult);
    });

    it('should throw P2025 when deleting non-existent record', async () => {
      const uid = 'shs_404';
      const error = new Prisma.PrismaClientKnownRequestError(
        'No ShowStandard found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );
      jest
        .spyOn(showStandardRepository, 'softDelete')
        .mockRejectedValue(error);

      await expect(service.deleteShowStandard({ uid })).rejects.toThrow(
        Prisma.PrismaClientKnownRequestError,
      );
    });
  });

  describe('countShowStandards', () => {
    it('should return count of show standards', async () => {
      const expectedCount = 5;

      jest
        .spyOn(showStandardRepository, 'count')
        .mockResolvedValue(expectedCount);

      const result = await service.countShowStandards({});

      expect(showStandardRepository.count).toHaveBeenCalledWith({});
      expect(result).toEqual(expectedCount);
    });
  });
});
