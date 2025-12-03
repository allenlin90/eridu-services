import { ShowStatusRepository } from './show-status.repository';
import { ShowStatusService } from './show-status.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';
import { createMockUniqueConstraintError } from '@/testing/prisma-error.helper';
import { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('showStatusService', () => {
  let service: ShowStatusService;
  let showStatusRepository: ShowStatusRepository;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const showStatusRepositoryMock
      = createMockRepository<ShowStatusRepository>();
    const utilityMock = createMockUtilityService('shst_test123');

    const module = await createModelServiceTestModule({
      serviceClass: ShowStatusService,
      repositoryClass: ShowStatusRepository,
      repositoryMock: showStatusRepositoryMock,
      utilityMock,
    });

    service = module.get<ShowStatusService>(ShowStatusService);
    showStatusRepository
      = module.get<ShowStatusRepository>(ShowStatusRepository);
    utilityService = module.get<UtilityService>(UtilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShowStatus', () => {
    it('should create a show status with generated uid', async () => {
      const showStatusData = {
        name: 'Draft',
        metadata: { description: 'Show is in draft status' },
      };

      const expectedResult = {
        id: 1n,
        uid: 'shs_00000001',
        name: 'Draft',
        metadata: { description: 'Show is in draft status' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStatusRepository, 'create')
        .mockResolvedValue(expectedResult);

      const result = await service.createShowStatus(showStatusData);

      expect(utilityService.generateBrandedId).toHaveBeenCalledWith(
        'shst',
        undefined,
      );
      expect(showStatusRepository.create).toHaveBeenCalledWith({
        ...showStatusData,
        uid: 'shst_test123',
      });
      expect(result).toEqual(expectedResult);
    });

    it('should map P2002 to Conflict', async () => {
      const showStatusData = {
        name: 'Draft',
        metadata: {},
      };

      const error = createMockUniqueConstraintError(['name']);
      jest.spyOn(showStatusRepository, 'create').mockRejectedValue(error);

      await expect(service.createShowStatus(showStatusData)).rejects.toThrow(
        error,
      );
    });
  });

  describe('getShowStatusById', () => {
    it('should return show status when found', async () => {
      const uid = 'shs_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Draft',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStatusRepository, 'findOne')
        .mockResolvedValue(expectedResult);

      const result = await service.getShowStatusById(uid);

      expect(showStatusRepository.findOne).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(expectedResult);
    });

    it('should return null when not found', async () => {
      const uid = 'shs_404';

      jest.spyOn(showStatusRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getShowStatusById(uid);

      expect(showStatusRepository.findOne).toHaveBeenCalledWith({ uid });
      expect(result).toBeNull();
    });
  });

  describe('getShowStatuses', () => {
    it('should return show statuses with pagination', async () => {
      const params = {
        skip: 0,
        take: 10,
        orderBy: { name: 'asc' as const },
      };

      const showStatuses = [
        {
          id: 1n,
          uid: 'shs_00000001',
          name: 'Draft',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 2n,
          uid: 'shs_00000002',
          name: 'Confirmed',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      jest
        .spyOn(showStatusRepository, 'findMany')
        .mockResolvedValue(showStatuses);

      const result = await service.getShowStatuses(params);

      expect(showStatusRepository.findMany).toHaveBeenCalledWith(params);
      expect(result).toEqual(showStatuses);
    });

    it('should return show statuses without orderBy', async () => {
      const params = {
        skip: 0,
        take: 10,
      };

      const showStatuses = [
        {
          id: 1n,
          uid: 'shs_00000001',
          name: 'Draft',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      jest
        .spyOn(showStatusRepository, 'findMany')
        .mockResolvedValue(showStatuses);

      const result = await service.getShowStatuses(params);

      expect(showStatusRepository.findMany).toHaveBeenCalledWith(params);
      expect(result).toEqual(showStatuses);
    });
  });

  describe('updateShowStatus', () => {
    it('should update show status successfully', async () => {
      const uid = 'shs_00000001';
      const updateData = {
        name: 'Updated Status',
        metadata: { description: 'Updated description' },
      };

      const expectedResult = {
        id: 1n,
        uid,
        name: 'Updated Status',
        metadata: { description: 'Updated description' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest
        .spyOn(showStatusRepository, 'update')
        .mockResolvedValue(expectedResult);

      const result = await service.updateShowStatus(uid, updateData);

      expect(showStatusRepository.update).toHaveBeenCalledWith(
        { uid },
        updateData,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should map P2002 to Conflict', async () => {
      const uid = 'shs_00000001';
      const updateData = {
        name: 'Duplicate Status',
      };

      const error = createMockUniqueConstraintError(['name']);
      jest.spyOn(showStatusRepository, 'update').mockRejectedValue(error);

      await expect(service.updateShowStatus(uid, updateData)).rejects.toThrow(
        error,
      );
    });
  });

  describe('deleteShowStatus', () => {
    it('should soft delete show status successfully', async () => {
      const uid = 'shs_00000001';
      const expectedResult = {
        id: 1n,
        uid,
        name: 'Draft',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      jest
        .spyOn(showStatusRepository, 'softDelete')
        .mockResolvedValue(expectedResult);

      const result = await service.deleteShowStatus(uid);

      expect(showStatusRepository.softDelete).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('countShowStatuses', () => {
    it('should return count of show statuses', async () => {
      const expectedCount = 5;

      jest
        .spyOn(showStatusRepository, 'count')
        .mockResolvedValue(expectedCount);

      const result = await service.countShowStatuses();

      expect(showStatusRepository.count).toHaveBeenCalledWith({});
      expect(result).toEqual(expectedCount);
    });
  });
});
