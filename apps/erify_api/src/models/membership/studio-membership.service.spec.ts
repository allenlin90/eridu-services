import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioMembershipRepository } from './studio-membership.repository';
import { StudioMembershipService } from './studio-membership.service';

import { UserRepository } from '@/models/user/user.repository';
import { UtilityService } from '@/utility/utility.service';

describe('studioMembershipService', () => {
  let service: StudioMembershipService;
  let findAdminMembershipByExtIdSpy: jest.Mock;
  let userRepository: { findByEmail: jest.Mock };

  const mockUtilityService = {
    generateBrandedId: jest.fn(),
  };

  beforeEach(async () => {
    findAdminMembershipByExtIdSpy = jest.fn();
    const mockRepository = {
      findAdminMembershipByExtId: findAdminMembershipByExtIdSpy,
      findByUid: jest.fn(),
      listStudioMemberships: jest.fn(),
      findByUserAndStudioIncludingDeleted: jest.fn(),
      createStudioMembership: jest.fn(),
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
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
        {
          provide: UtilityService,
          useValue: mockUtilityService,
        },
      ],
    }).compile();

    service = module.get<StudioMembershipService>(StudioMembershipService);
    userRepository = module.get(UserRepository);
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

  describe('addStudioMember', () => {
    it('should restore soft-deleted membership when re-inviting existing user', async () => {
      const user = { uid: 'user_123', email: 'jane@example.com' };
      const deletedMembership = {
        id: BigInt(1),
        uid: 'smb_123',
        deletedAt: new Date('2026-01-01T00:00:00Z'),
      };
      const restoredMembership = { ...deletedMembership, deletedAt: null };

      userRepository.findByEmail.mockResolvedValue(user as any);
      ((service as any).studioMembershipRepository.findByUserAndStudioIncludingDeleted as jest.Mock)
        .mockResolvedValue(deletedMembership);
      ((service as any).studioMembershipRepository.updateByUnique as jest.Mock)
        .mockResolvedValue(restoredMembership);

      const result = await service.addStudioMember({
        email: 'jane@example.com',
        role: 'manager',
        baseHourlyRate: 25,
        studioUid: 'std_123',
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith('jane@example.com');
      expect((service as any).studioMembershipRepository.findByUserAndStudioIncludingDeleted)
        .toHaveBeenCalledWith('user_123', 'std_123');
      expect((service as any).studioMembershipRepository.updateByUnique).toHaveBeenCalledWith(
        { id: BigInt(1) },
        {
          deletedAt: null,
          role: 'manager',
          baseHourlyRate: '25.00',
        },
        { user: true },
      );
      expect((service as any).studioMembershipRepository.createStudioMembership).not.toHaveBeenCalled();
      expect(result).toEqual(restoredMembership);
    });
  });
});
