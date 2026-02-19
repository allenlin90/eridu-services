import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AdminStudioMembershipController } from './admin-studio-membership.controller';

import type {
  CreateStudioMembershipDto,
  ListStudioMembershipsQueryDto,
  UpdateStudioMembershipDto,
} from '@/models/membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';

describe('adminStudioMembershipController', () => {
  let controller: AdminStudioMembershipController;

  const mockStudioMembershipService = {
    createStudioMembership: jest.fn(),
    listStudioMemberships: jest.fn(),
    countStudioMemberships: jest.fn(),
    getStudioMembershipById: jest.fn(),
    updateStudioMembership: jest.fn(),
    deleteStudioMembership: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStudioMembershipController],
      providers: [
        {
          provide: StudioMembershipService,
          useValue: mockStudioMembershipService,
        },
      ],
    }).compile();

    controller = module.get<AdminStudioMembershipController>(
      AdminStudioMembershipController,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudioMembership', () => {
    it('should create a studio membership', async () => {
      const createDto: CreateStudioMembershipDto = {
        userId: 'user_123',
        studioId: 'studio_123',
        metadata: {},
      } as CreateStudioMembershipDto;
      const createdMembership = { uid: 'smb_123', ...createDto };

      mockStudioMembershipService.createStudioMembership.mockResolvedValue(
        createdMembership as any,
      );

      const result = await controller.createStudioMembership(createDto);
      expect(
        mockStudioMembershipService.createStudioMembership,
      ).toHaveBeenCalledWith(
        {
          userId: createDto.userId,
          studioId: createDto.studioId,
          role: createDto.role,
          metadata: createDto.metadata,
        },
        { user: true, studio: true },
      );
      expect(result).toEqual(createdMembership);
    });
  });

  describe('getStudioMemberships', () => {
    it('should return paginated list of studio memberships', async () => {
      const query: ListStudioMembershipsQueryDto = {
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
        uid: undefined,
        studioId: undefined,
        name: undefined,
        include_deleted: false,
        sort: 'desc',
      };
      const memberships = [
        { uid: 'membership_1', userId: 'user_1', studioId: 'studio_1' },
        { uid: 'membership_2', userId: 'user_2', studioId: 'studio_2' },
      ];
      const total = 2;
      const paginationMeta = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockStudioMembershipService.listStudioMemberships.mockResolvedValue({
        data: memberships,
        total,
      });

      const result = await controller.getStudioMemberships(query);
      expect(
        mockStudioMembershipService.listStudioMemberships,
      ).toHaveBeenCalledWith(
        query,
        { user: true, studio: true },
      );
      expect(result).toEqual({
        data: memberships,
        meta: paginationMeta,
      });
    });
  });

  describe('getStudioMembership', () => {
    it('should return a studio membership by id', async () => {
      const membershipId = 'smb_123';
      const membership = {
        uid: membershipId,
        userId: 'user_123',
        studioId: 'studio_123',
        user: { uid: 'user_123' },
        studio: { uid: 'studio_123' },
      };

      mockStudioMembershipService.getStudioMembershipById.mockResolvedValue(
        membership as any,
      );

      const result = await controller.getStudioMembership(membershipId);

      expect(
        mockStudioMembershipService.getStudioMembershipById,
      ).toHaveBeenCalledWith(membershipId, { user: true, studio: true });
      expect(result).toEqual(membership);
    });
  });

  describe('updateStudioMembership', () => {
    it('should update a studio membership', async () => {
      const membershipId = 'smb_123';
      const updateDto: UpdateStudioMembershipDto = {
        metadata: {},
      } as UpdateStudioMembershipDto;
      const updatedMembership = { uid: membershipId, ...updateDto };

      mockStudioMembershipService.updateStudioMembership.mockResolvedValue(
        updatedMembership as any,
      );

      mockStudioMembershipService.getStudioMembershipById.mockResolvedValue(
        updatedMembership as any,
      );

      const result = await controller.updateStudioMembership(
        membershipId,
        updateDto,
      );
      expect(
        mockStudioMembershipService.getStudioMembershipById,
      ).toHaveBeenCalledWith(membershipId);
      expect(
        mockStudioMembershipService.updateStudioMembership,
      ).toHaveBeenCalledWith(
        membershipId,
        {
          userId: undefined,
          studioId: undefined,
          role: undefined,
          metadata: updateDto.metadata,
        },
        {
          user: true,
          studio: true,
        },
      );
      expect(result).toEqual(updatedMembership);
    });
  });

  describe('deleteStudioMembership', () => {
    it('should delete a studio membership', async () => {
      const membershipId = 'smb_123';

      mockStudioMembershipService.deleteStudioMembership.mockResolvedValue(
        undefined,
      );

      mockStudioMembershipService.getStudioMembershipById.mockResolvedValue({
        uid: membershipId,
      });

      await controller.deleteStudioMembership(membershipId);
      expect(
        mockStudioMembershipService.getStudioMembershipById,
      ).toHaveBeenCalledWith(membershipId);
      expect(
        mockStudioMembershipService.deleteStudioMembership,
      ).toHaveBeenCalledWith(membershipId);
    });
  });
});
