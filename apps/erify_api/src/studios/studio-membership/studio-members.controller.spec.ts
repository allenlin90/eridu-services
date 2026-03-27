import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioMembersController } from './studio-members.controller';

import { StudioMembershipService } from '@/models/membership/studio-membership.service';

describe('studioMembersController', () => {
  let controller: StudioMembersController;
  let studioMembershipService: jest.Mocked<StudioMembershipService>;

  const mockMembership = {
    id: BigInt(1),
    uid: 'smb_test123',
    userId: BigInt(1),
    studioId: BigInt(1),
    role: 'admin',
    baseHourlyRate: '25.00',
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    user: {
      uid: 'user_abc123',
      name: 'Jane Doe',
      email: 'jane@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioMembersController],
      providers: [
        {
          provide: StudioMembershipService,
          useValue: {
            listStudioMembers: jest.fn(),
            addStudioMember: jest.fn(),
            updateStudioMember: jest.fn(),
            removeStudioMember: jest.fn(),
            findStudioMemberByUidAndStudio: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudioMembersController>(StudioMembersController);
    studioMembershipService = module.get(StudioMembershipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockQuery = { page: 1, limit: 10, take: 10, skip: 0, sort: 'desc' as const, search: undefined };

  describe('listMembers', () => {
    it('should list members for a studio', async () => {
      const studioId = 'std_test123';
      studioMembershipService.listStudioMembers.mockResolvedValue({ data: [mockMembership], total: 1 } as any);

      const result = await controller.listMembers(studioId, mockQuery as any);

      expect(studioMembershipService.listStudioMembers).toHaveBeenCalledWith(studioId, {
        skip: 0,
        take: 10,
        search: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty paginated response when no members', async () => {
      studioMembershipService.listStudioMembers.mockResolvedValue({ data: [], total: 0 } as any);

      const result = await controller.listMembers('std_test123', mockQuery as any);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('addMember', () => {
    it('should add a member to the studio', async () => {
      const studioId = 'std_test123';
      const dto = { email: 'jane@example.com', role: 'manager', base_hourly_rate: 25 };
      studioMembershipService.addStudioMember.mockResolvedValue(mockMembership as any);

      await controller.addMember(studioId, dto as any);

      expect(studioMembershipService.addStudioMember).toHaveBeenCalledWith({
        email: 'jane@example.com',
        role: 'manager',
        baseHourlyRate: 25,
        studioUid: studioId,
      });
    });
  });

  describe('updateMember', () => {
    it('should update an existing membership', async () => {
      const studioId = 'std_test123';
      const membershipId = 'smb_test123';
      const dto = { role: 'manager', base_hourly_rate: 30 };
      const mockRequest = { studioMembership: { uid: 'smb_actor456' } };

      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(mockMembership as any);
      studioMembershipService.updateStudioMember.mockResolvedValue(mockMembership as any);

      await controller.updateMember(studioId, membershipId, dto as any, mockRequest as any);

      expect(studioMembershipService.findStudioMemberByUidAndStudio).toHaveBeenCalledWith(
        membershipId,
        studioId,
      );
      expect(studioMembershipService.updateStudioMember).toHaveBeenCalledWith(
        membershipId,
        { role: 'manager', baseHourlyRate: 30 },
        'smb_actor456',
      );
    });

    it('should throw 404 when membership not found in studio', async () => {
      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(null);

      await expect(
        controller.updateMember('std_test123', 'smb_notfound', {} as any, {} as any),
      ).rejects.toThrow();
    });
  });

  describe('removeMember', () => {
    it('should soft-delete a membership', async () => {
      const studioId = 'std_test123';
      const membershipId = 'smb_test123';

      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(mockMembership as any);
      studioMembershipService.removeStudioMember.mockResolvedValue(mockMembership as any);

      const mockRequest = { studioMembership: { uid: 'smb_other456' } } as any;
      await controller.removeMember(studioId, membershipId, mockRequest);

      expect(studioMembershipService.findStudioMemberByUidAndStudio).toHaveBeenCalledWith(
        membershipId,
        studioId,
      );
      expect(studioMembershipService.removeStudioMember).toHaveBeenCalledWith(membershipId);
    });

    it('should throw 404 when membership not found', async () => {
      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(null);

      await expect(
        controller.removeMember('std_test123', 'smb_notfound', { studioMembership: { uid: 'smb_other456' } } as any),
      ).rejects.toThrow();
    });

    it('should throw SELF_REMOVE_NOT_ALLOWED when actor tries to remove themselves', async () => {
      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(mockMembership as any);

      await expect(
        controller.removeMember('std_test123', 'smb_test123', {
          studioMembership: { uid: 'smb_test123' },
        } as any),
      ).rejects.toMatchObject({ message: expect.stringContaining('SELF_REMOVE_NOT_ALLOWED') });
    });
  });
});
