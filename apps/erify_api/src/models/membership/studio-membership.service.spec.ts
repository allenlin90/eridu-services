import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioMembershipRepository } from './studio-membership.repository';
import { StudioMembershipService } from './studio-membership.service';

import { UtilityService } from '@/utility/utility.service';

describe('studioMembershipService', () => {
  let service: StudioMembershipService;
  let findAdminMembershipByExtIdSpy: jest.Mock;

  const mockUtilityService = {
    generateBrandedId: jest.fn(),
  };

  beforeEach(async () => {
    findAdminMembershipByExtIdSpy = jest.fn();
    const mockRepository = {
      findAdminMembershipByExtId: findAdminMembershipByExtIdSpy,
      findByUid: jest.fn(),
      findOne: jest.fn(),
      listStudioMemberships: jest.fn(),
      updateMetadataIfUnchanged: jest.fn(),
      updateByUnique: jest.fn(),
      softDeleteByUnique: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioMembershipService,
        {
          provide: StudioMembershipRepository,
          useValue: mockRepository,
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
      ],
    }).compile();

    service = module.get<StudioMembershipService>(StudioMembershipService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAdminMembershipByExtId', () => {
    const extId = 'ext_user_123';

    it('should find admin membership by ext_id without include', async () => {
      const mockMembership = {
        id: BigInt(1),
        uid: 'smb_123',
        userId: BigInt(10),
        studioId: BigInt(20),
        role: 'admin',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      findAdminMembershipByExtIdSpy.mockResolvedValue(
        mockMembership as unknown,
      );

      const result = await service.findAdminMembershipByExtId(extId);

      expect(findAdminMembershipByExtIdSpy).toHaveBeenCalledWith(
        extId,
        undefined,
      );
      expect(result).toEqual(mockMembership);
    });

    it('should find admin membership by ext_id with include', async () => {
      const include = { user: true, studio: true };
      const mockMembership = {
        id: BigInt(1),
        uid: 'smb_123',
        userId: BigInt(10),
        studioId: BigInt(20),
        role: 'admin',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        user: {
          id: BigInt(10),
          uid: 'user_123',
          extId,
          email: 'admin@example.com',
          name: 'Admin User',
        },
        studio: {
          id: BigInt(20),
          uid: 'studio_123',
          name: 'Test Studio',
        },
      };

      findAdminMembershipByExtIdSpy.mockResolvedValue(
        mockMembership as unknown,
      );

      const result = await service.findAdminMembershipByExtId(extId, include);

      expect(findAdminMembershipByExtIdSpy).toHaveBeenCalledWith(
        extId,
        include,
      );
      expect(result).toEqual(mockMembership);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('studio');
    });

    it('should return null when user is not admin', async () => {
      findAdminMembershipByExtIdSpy.mockResolvedValue(null);

      const result = await service.findAdminMembershipByExtId(extId);

      expect(findAdminMembershipByExtIdSpy).toHaveBeenCalledWith(
        extId,
        undefined,
      );
      expect(result).toBeNull();
    });
  });

  describe('getStudioMembershipById', () => {
    it('should return membership when found', async () => {
      const mockMembership = { uid: 'smb_123' };
      ((service as any).studioMembershipRepository.findByUid as jest.Mock).mockResolvedValue(mockMembership);

      const result = await service.getStudioMembershipById('smb_123');
      expect((service as any).studioMembershipRepository.findByUid).toHaveBeenCalledWith('smb_123', undefined);
      expect(result).toEqual(mockMembership);
    });

    it('should return null when not found', async () => {
      ((service as any).studioMembershipRepository.findByUid as jest.Mock).mockResolvedValue(null);

      const result = await service.getStudioMembershipById('smb_123');
      expect((service as any).studioMembershipRepository.findByUid).toHaveBeenCalledWith('smb_123', undefined);
      expect(result).toBeNull();
    });
  });

  describe('listStudioMemberships', () => {
    it('should delegate to repository listStudioMemberships', async () => {
      const params = { skip: 0, take: 10 };
      const expectedResult = { data: [], total: 0 };
      ((service as any).studioMembershipRepository.listStudioMemberships as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.listStudioMemberships(params);
      expect((service as any).studioMembershipRepository.listStudioMemberships).toHaveBeenCalledWith(params, undefined);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateStudioMembership', () => {
    it('should delegate to repository updateByUnique', async () => {
      const uid = 'smb_123';
      const payload = { role: 'admin' as const };
      const includes = { user: true };
      const mockResult = { uid, role: 'admin' };

      ((service as any).studioMembershipRepository.updateByUnique as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.updateStudioMembership(uid, payload, includes);

      expect((service as any).studioMembershipRepository.updateByUnique).toHaveBeenCalledWith(
        { uid },
        { role: 'admin' },
        includes,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteStudioMembership', () => {
    it('should delegate to repository softDeleteByUnique', async () => {
      const uid = 'smb_123';
      const mockResult = { uid, deletedAt: new Date() };

      ((service as any).studioMembershipRepository.softDeleteByUnique as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.deleteStudioMembership(uid);

      expect((service as any).studioMembershipRepository.softDeleteByUnique).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(mockResult);
    });
  });

  describe('toggleTaskHelperStatus', () => {
    it('should toggle helper flag with optimistic update', async () => {
      const membership = {
        uid: 'smb_123',
        metadata: { existing: 'value' },
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
        user: { uid: 'usr_1' },
        studio: { uid: 'std_1' },
      };
      ((service as any).studioMembershipRepository.findOne as jest.Mock).mockResolvedValue(membership);
      ((service as any).studioMembershipRepository.updateMetadataIfUnchanged as jest.Mock).mockResolvedValue(1);
      ((service as any).studioMembershipRepository.findByUid as jest.Mock).mockResolvedValue({
        ...membership,
        metadata: { existing: 'value', task_helper_enabled: true },
      });

      const result = await service.toggleTaskHelperStatus('std_1', 'smb_123', true);

      expect((service as any).studioMembershipRepository.updateMetadataIfUnchanged).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'smb_123',
          studioUid: 'std_1',
          expectedUpdatedAt: membership.updatedAt,
          metadata: { existing: 'value', task_helper_enabled: true },
        }),
      );
      expect(result).toEqual(expect.objectContaining({
        metadata: { existing: 'value', task_helper_enabled: true },
      }));
    });

    it('should return null when membership is not found in scoped studio', async () => {
      ((service as any).studioMembershipRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.toggleTaskHelperStatus('std_1', 'smb_missing', true);
      expect(result).toBeNull();
      expect((service as any).studioMembershipRepository.updateMetadataIfUnchanged).not.toHaveBeenCalled();
    });
  });
});
