import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioMembershipRepository } from './studio-membership.repository';
import { StudioMembershipService } from './studio-membership.service';

import { UserService } from '@/models/user/user.service';
import { UtilityService } from '@/utility/utility.service';

describe('studioMembershipService', () => {
  let service: StudioMembershipService;
  let findAdminMembershipByExtIdSpy: jest.Mock;
  let userService: { findByEmail: jest.Mock };
  let membershipRepository: {
    findAdminMembershipByExtId: jest.Mock;
    findByUid: jest.Mock;
    listStudioMemberships: jest.Mock;
    findByUserAndStudioIncludingDeleted: jest.Mock;
    createStudioMembership: jest.Mock;
    updateByUnique: jest.Mock;
    updateStudioMember: jest.Mock;
    softDeleteByUnique: jest.Mock;
    findOne: jest.Mock;
  };

  const mockUtilityService = {
    generateBrandedId: jest.fn(),
  };

  beforeEach(async () => {
    findAdminMembershipByExtIdSpy = jest.fn();
    membershipRepository = {
      findAdminMembershipByExtId: findAdminMembershipByExtIdSpy,
      findByUid: jest.fn(),
      listStudioMemberships: jest.fn(),
      findByUserAndStudioIncludingDeleted: jest.fn(),
      createStudioMembership: jest.fn(),
      updateByUnique: jest.fn(),
      updateStudioMember: jest.fn(),
      softDeleteByUnique: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioMembershipService,
        {
          provide: StudioMembershipRepository,
          useValue: membershipRepository,
        },
        {
          provide: UserService,
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
    userService = module.get(UserService);
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
      membershipRepository.findByUid.mockResolvedValue(mockMembership);

      const result = await service.getStudioMembershipById('smb_123');
      expect(membershipRepository.findByUid).toHaveBeenCalledWith('smb_123', undefined);
      expect(result).toEqual(mockMembership);
    });

    it('should return null when not found', async () => {
      membershipRepository.findByUid.mockResolvedValue(null);

      const result = await service.getStudioMembershipById('smb_123');
      expect(membershipRepository.findByUid).toHaveBeenCalledWith('smb_123', undefined);
      expect(result).toBeNull();
    });
  });

  describe('listStudioMemberships', () => {
    it('should delegate to repository listStudioMemberships', async () => {
      const params = { skip: 0, take: 10 };
      const expectedResult = { data: [], total: 0 };
      membershipRepository.listStudioMemberships.mockResolvedValue(expectedResult);

      const result = await service.listStudioMemberships(params);
      expect(membershipRepository.listStudioMemberships).toHaveBeenCalledWith(params, undefined);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateStudioMembership', () => {
    it('should delegate to repository updateByUnique', async () => {
      const uid = 'smb_123';
      const payload = { role: 'admin' as const };
      const includes = { user: true };
      const mockResult = { uid, role: 'admin' };

      membershipRepository.updateByUnique.mockResolvedValue(mockResult);

      const result = await service.updateStudioMembership(uid, payload, includes);

      expect(membershipRepository.updateByUnique).toHaveBeenCalledWith(
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

      membershipRepository.softDeleteByUnique.mockResolvedValue(mockResult);

      const result = await service.deleteStudioMembership(uid);

      expect(membershipRepository.softDeleteByUnique).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(mockResult);
    });
  });

  describe('addStudioMember', () => {
    const mockUser = { uid: 'user_abc123', email: 'jane@example.com' };
    const payload = {
      email: 'jane@example.com',
      role: 'manager',
      baseHourlyRate: 25,
      studioUid: 'std_123',
    };

    it('should create a new membership when user exists and has no prior membership', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);
      membershipRepository.findByUserAndStudioIncludingDeleted.mockResolvedValue(null);
      const createdMembership = { uid: 'smb_new123', role: 'manager', user: mockUser };
      membershipRepository.createStudioMembership.mockResolvedValue(createdMembership);

      const result = await service.addStudioMember(payload);

      expect(userService.findByEmail).toHaveBeenCalledWith('jane@example.com');
      expect(membershipRepository.findByUserAndStudioIncludingDeleted)
        .toHaveBeenCalledWith('user_abc123', 'std_123');
      expect(membershipRepository.createStudioMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'manager',
          baseHourlyRate: '25.00',
          metadata: {},
        }),
        { user: true },
      );
      expect(result).toEqual(createdMembership);
    });

    it('should throw USER_NOT_FOUND when email does not match a user', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.addStudioMember(payload)).rejects.toMatchObject({
        message: expect.stringContaining('USER_NOT_FOUND'),
      });
      expect(membershipRepository.createStudioMembership).not.toHaveBeenCalled();
    });

    it('should throw MEMBER_ALREADY_EXISTS when active membership exists', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);
      membershipRepository.findByUserAndStudioIncludingDeleted.mockResolvedValue({
        id: BigInt(1),
        uid: 'smb_existing',
        deletedAt: null, // Active membership
      });

      await expect(service.addStudioMember(payload)).rejects.toMatchObject({
        message: expect.stringContaining('MEMBER_ALREADY_EXISTS'),
      });
      expect(membershipRepository.createStudioMembership).not.toHaveBeenCalled();
    });

    it('should restore soft-deleted membership when re-inviting existing user', async () => {
      const deletedMembership = {
        id: BigInt(1),
        uid: 'smb_123',
        deletedAt: new Date('2026-01-01T00:00:00Z'),
      };
      const restoredMembership = { ...deletedMembership, deletedAt: null };

      userService.findByEmail.mockResolvedValue(mockUser as any);
      membershipRepository.findByUserAndStudioIncludingDeleted.mockResolvedValue(deletedMembership);
      membershipRepository.updateByUnique.mockResolvedValue(restoredMembership);

      const result = await service.addStudioMember(payload);

      expect(userService.findByEmail).toHaveBeenCalledWith('jane@example.com');
      expect(membershipRepository.findByUserAndStudioIncludingDeleted)
        .toHaveBeenCalledWith('user_abc123', 'std_123');
      expect(membershipRepository.updateByUnique).toHaveBeenCalledWith(
        { id: BigInt(1) },
        {
          deletedAt: null,
          role: 'manager',
          baseHourlyRate: '25.00',
        },
        { user: true },
      );
      expect(membershipRepository.createStudioMembership).not.toHaveBeenCalled();
      expect(result).toEqual(restoredMembership);
    });
  });

  describe('updateStudioMember', () => {
    const membershipUid = 'smb_member123';
    const payload = { role: 'manager', baseHourlyRate: 30 };

    it('should update role and hourly rate successfully', async () => {
      const mockUpdated = { uid: membershipUid, role: 'manager', user: {} };
      membershipRepository.updateStudioMember.mockResolvedValue(mockUpdated);

      const result = await service.updateStudioMember(membershipUid, payload);

      expect(membershipRepository.updateStudioMember).toHaveBeenCalledWith(
        membershipUid,
        payload,
      );
      expect(result).toEqual(mockUpdated);
    });

    it('should throw SELF_DEMOTION_NOT_ALLOWED when admin demotes themselves', async () => {
      const actorUid = membershipUid; // Actor is same as target

      await expect(
        service.updateStudioMember(membershipUid, { role: 'manager' }, actorUid),
      ).rejects.toMatchObject({
        message: expect.stringContaining('SELF_DEMOTION_NOT_ALLOWED'),
      });
      expect(membershipRepository.updateStudioMember).not.toHaveBeenCalled();
    });

    it('should allow admin to update their own hourly rate without role change', async () => {
      const actorUid = membershipUid;
      const rateOnlyPayload = { baseHourlyRate: 50 };
      const mockUpdated = { uid: membershipUid, baseHourlyRate: '50.00', user: {} };
      membershipRepository.updateStudioMember.mockResolvedValue(mockUpdated);

      const result = await service.updateStudioMember(membershipUid, rateOnlyPayload, actorUid);

      expect(membershipRepository.updateStudioMember).toHaveBeenCalledWith(
        membershipUid,
        rateOnlyPayload,
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('removeStudioMember', () => {
    it('should delegate soft-delete to repository', async () => {
      const uid = 'smb_target123';
      const mockDeleted = { uid, deletedAt: new Date() };
      membershipRepository.softDeleteByUnique.mockResolvedValue(mockDeleted);

      const result = await service.removeStudioMember(uid);

      expect(membershipRepository.softDeleteByUnique).toHaveBeenCalledWith({ uid });
      expect(result).toEqual(mockDeleted);
    });
  });

  describe('findStudioMemberByUidAndStudio', () => {
    it('should delegate to repository findOne with studio scope', async () => {
      const membershipUid = 'smb_member123';
      const studioUid = 'std_studio456';
      const mockResult = { uid: membershipUid };
      membershipRepository.findOne.mockResolvedValue(mockResult);

      const result = await service.findStudioMemberByUidAndStudio(membershipUid, studioUid);

      expect(membershipRepository.findOne).toHaveBeenCalledWith({
        uid: membershipUid,
        studio: { uid: studioUid },
        deletedAt: null,
      });
      expect(result).toEqual(mockResult);
    });

    it('should return null when membership is not found in the studio', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      const result = await service.findStudioMemberByUidAndStudio('smb_notfound', 'std_123');

      expect(result).toBeNull();
    });
  });
});
