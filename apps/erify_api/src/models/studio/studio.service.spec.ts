import { StudioRepository } from './studio.repository';
import { StudioService } from './studio.service';

import {
  createMockRepository,
  createMockUtilityService,
  createModelServiceTestModule,
} from '@/testing/model-service-test.helper';
import { UtilityService } from '@/utility/utility.service';

jest.mock('nanoid', () => ({ nanoid: () => 'test_id' }));

describe('studioService', () => {
  let service: StudioService;
  let studioRepository: StudioRepository;
  let utilityService: UtilityService;

  beforeEach(async () => {
    const studioRepositoryMock = createMockRepository<StudioRepository>();
    const utilityMock = createMockUtilityService('std_test123');

    const module = await createModelServiceTestModule({
      serviceClass: StudioService,
      repositoryClass: StudioRepository,
      repositoryMock: studioRepositoryMock,
      utilityMock,
    });

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

      jest.spyOn(studioRepository, 'findByUid').mockResolvedValue(expectedResult as any);

      const result = await service.getStudioById(uid);

      expect(studioRepository.findByUid).toHaveBeenCalledWith(uid);
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFound if studio not found by uid', async () => {
      const uid = 'std_00000001';

      jest.spyOn(studioRepository, 'findByUid').mockResolvedValue(null);

      await expect(service.getStudioById(uid)).rejects.toThrow();

      expect(studioRepository.findByUid).toHaveBeenCalledWith(uid);
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

      jest.spyOn(studioRepository, 'update').mockResolvedValue(expectedResult as any);

      const result = await service.updateStudio(uid, updateData);

      expect(studioRepository.update).toHaveBeenCalledWith(
        { uid },
        updateData,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should throw if repo update fails', async () => {
      const uid = 'std_00000001';
      const updateData = {
        name: 'Updated Studio',
        address: '456 Updated Street',
      };

      jest.spyOn(studioRepository, 'update').mockRejectedValue(new Error('Update failed'));

      await expect(service.updateStudio(uid, updateData)).rejects.toThrow();
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
        .mockResolvedValue(expectedResult as any);

      const result = await service.deleteStudio(uid);

      expect(studioRepository.softDelete).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('listStudios', () => {
    it('should return paginated studios', async () => {
      const query = {
        skip: 0,
        take: 10,
        name: undefined,
        uid: undefined,
        include_deleted: false,
        sort: 'desc' as const,
      };

      const expectedResult = {
        data: [
          {
            id: 1n,
            uid: 'std_00000001',
            name: 'Studio 1',
            address: '123 Test Street',
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          } as any,
        ],
        total: 1,
      };

      studioRepository.findPaginated = jest
        .fn()
        .mockResolvedValue(expectedResult);

      const result = await service.listStudios(query);

      expect(studioRepository.findPaginated).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });
});
