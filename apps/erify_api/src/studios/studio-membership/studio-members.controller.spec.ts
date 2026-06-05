import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { studioMemberCompensationResponseSchema } from '@eridu/api-types/memberships';

import { StudioMembersController } from './studio-members.controller';

import { studioMemberDto } from '@/models/membership/schemas/studio-membership.schema';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

describe('studioMembersController', () => {
  let controller: StudioMembersController;
  let studioMembershipService: jest.Mocked<StudioMembershipService>;
  let studioShiftService: jest.Mocked<StudioShiftService>;

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
        {
          provide: StudioShiftService,
          useValue: {
            listMemberCompensationShifts: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudioMembersController>(StudioMembersController);
    studioMembershipService = module.get(StudioMembershipService);
    studioShiftService = module.get(StudioShiftService);
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
        sort: 'desc',
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
      const dto = { email: 'jane@example.com', role: 'manager', base_hourly_rate: '25.00' };
      studioMembershipService.addStudioMember.mockResolvedValue(mockMembership as any);

      await controller.addMember(studioId, dto as any);

      expect(studioMembershipService.addStudioMember).toHaveBeenCalledWith({
        email: 'jane@example.com',
        role: 'manager',
        baseHourlyRate: '25.00',
        studioUid: studioId,
      });
    });
  });

  describe('getMember', () => {
    it('uses the transformer DTO so serialization transforms the raw member once', () => {
      const serializerSchema = Reflect.getMetadata(
        'ZOD_SERIALIZER_DTO_OPTIONS',
        StudioMembersController.prototype.getMember,
      );

      expect(serializerSchema).toBe(studioMemberDto);
    });

    it('returns the raw studio member for the decorator to serialize', async () => {
      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(mockMembership as any);

      const result = await controller.getMember('std_test123', 'smb_test123');

      expect(studioMembershipService.findStudioMemberByUidAndStudio).toHaveBeenCalledWith(
        'smb_test123',
        'std_test123',
      );
      expect(result).toBe(mockMembership);
    });

    it('throws 404 when the membership is outside the studio', async () => {
      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(null);

      await expect(controller.getMember('std_test123', 'smb_missing')).rejects.toThrow();
    });
  });

  describe('updateMember', () => {
    it('should update an existing membership', async () => {
      const studioId = 'std_test123';
      const membershipId = 'smb_test123';
      const dto = { role: 'manager', base_hourly_rate: '30.00' };
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
        { role: 'manager', baseHourlyRate: '30.00' },
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

  describe('listMemberCompensations', () => {
    it('uses the serialized API response schema for response serialization', () => {
      const serializerSchema = Reflect.getMetadata(
        'ZOD_SERIALIZER_DTO_OPTIONS',
        StudioMembersController.prototype.listMemberCompensations,
      );

      expect(serializerSchema).toBe(studioMemberCompensationResponseSchema);
    });

    it('returns a date-ranged member shift compensation review', async () => {
      const dateFrom = new Date('2026-05-01T00:00:00.000Z');
      const dateTo = new Date('2026-05-31T00:00:00.000Z');
      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(mockMembership as any);
      studioShiftService.listMemberCompensationShifts.mockResolvedValue([
        {
          uid: 'ssh_test123',
          date: new Date('2026-05-12T00:00:00.000Z'),
          hourlyRate: '25.00',
          isApproved: false,
          isDutyManager: true,
          status: 'SCHEDULED',
          metadata: {},
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          deletedAt: null,
          studio: { uid: 'std_test123' },
          user: { uid: 'user_abc123', name: 'Jane Doe' },
          compensationLineItemTargets: [],
          blocks: [
            {
              uid: 'ssb_test123',
              startTime: new Date('2026-05-12T09:00:00.000Z'),
              endTime: new Date('2026-05-12T11:00:00.000Z'),
              actualStartTime: new Date('2026-05-12T09:15:00.000Z'),
              actualEndTime: new Date('2026-05-12T11:15:00.000Z'),
              metadata: {},
              createdAt: new Date('2026-05-01T00:00:00.000Z'),
              updatedAt: new Date('2026-05-01T00:00:00.000Z'),
              deletedAt: null,
              compensationLineItemTargets: [],
            },
          ],
        },
      ] as any);

      const result = await controller.listMemberCompensations(
        'std_test123',
        'smb_test123',
        { dateFrom, dateTo } as any,
      );

      expect(studioMembershipService.findStudioMemberByUidAndStudio).toHaveBeenCalledWith(
        'smb_test123',
        'std_test123',
      );
      expect(studioShiftService.listMemberCompensationShifts).toHaveBeenCalledWith({
        studioId: 'std_test123',
        userId: 'user_abc123',
        dateFrom,
        dateTo,
      });
      expect(result).toMatchObject({
        membership_id: 'smb_test123',
        user_id: 'user_abc123',
        user_name: 'Jane Doe',
        date_from: '2026-05-01',
        date_to: '2026-05-31',
        summary: {
          shift_count: 1,
          total_planned_cost: '50.00',
          total_actual_cost: '50.00',
          actual_cost_resolved_shift_count: 1,
          actual_cost_pending_shift_count: 0,
        },
        shifts: [
          {
            shift_id: 'ssh_test123',
            planned_cost: '50.00',
            actual_cost: '50.00',
            actuals_status: 'resolved',
          },
        ],
      });
    });

    it('throws 404 when the membership is outside the studio', async () => {
      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(null);

      await expect(
        controller.listMemberCompensations(
          'std_test123',
          'smb_missing',
          { dateFrom: new Date(), dateTo: new Date() } as any,
        ),
      ).rejects.toThrow();
    });

    it('excludes cancelled shifts from cost totals but surfaces them in the list', async () => {
      const dateFrom = new Date('2026-05-01T00:00:00.000Z');
      const dateTo = new Date('2026-05-31T00:00:00.000Z');
      studioMembershipService.findStudioMemberByUidAndStudio.mockResolvedValue(mockMembership as any);
      studioShiftService.listMemberCompensationShifts.mockResolvedValue([
        {
          uid: 'ssh_scheduled',
          date: new Date('2026-05-12T00:00:00.000Z'),
          hourlyRate: '25.00',
          isApproved: false,
          isDutyManager: false,
          status: 'SCHEDULED',
          metadata: {},
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          deletedAt: null,
          studio: { uid: 'std_test123' },
          user: { uid: 'user_abc123', name: 'Jane Doe' },
          compensationLineItemTargets: [],
          blocks: [
            {
              uid: 'ssb_scheduled',
              startTime: new Date('2026-05-12T09:00:00.000Z'),
              endTime: new Date('2026-05-12T11:00:00.000Z'),
              actualStartTime: new Date('2026-05-12T09:00:00.000Z'),
              actualEndTime: new Date('2026-05-12T11:00:00.000Z'),
              metadata: {},
              createdAt: new Date('2026-05-01T00:00:00.000Z'),
              updatedAt: new Date('2026-05-01T00:00:00.000Z'),
              deletedAt: null,
              compensationLineItemTargets: [],
            },
          ],
        },
        {
          uid: 'ssh_cancelled',
          date: new Date('2026-05-14T00:00:00.000Z'),
          hourlyRate: '25.00',
          isApproved: false,
          isDutyManager: false,
          status: 'CANCELLED',
          metadata: {},
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          deletedAt: null,
          studio: { uid: 'std_test123' },
          user: { uid: 'user_abc123', name: 'Jane Doe' },
          compensationLineItemTargets: [],
          blocks: [
            {
              uid: 'ssb_cancelled',
              startTime: new Date('2026-05-14T09:00:00.000Z'),
              endTime: new Date('2026-05-14T15:00:00.000Z'),
              actualStartTime: null,
              actualEndTime: null,
              metadata: {},
              createdAt: new Date('2026-05-01T00:00:00.000Z'),
              updatedAt: new Date('2026-05-01T00:00:00.000Z'),
              deletedAt: null,
              compensationLineItemTargets: [],
            },
          ],
        },
      ] as any);

      const result = await controller.listMemberCompensations(
        'std_test123',
        'smb_test123',
        { dateFrom, dateTo } as any,
      );

      expect(result.summary).toEqual({
        shift_count: 1,
        total_planned_cost: '50.00',
        total_actual_cost: '50.00',
        actual_cost_resolved_shift_count: 1,
        actual_cost_pending_shift_count: 0,
      });
      expect(result.shifts).toHaveLength(2);
      expect(result.shifts[1]).toMatchObject({
        shift_id: 'ssh_cancelled',
        status: 'CANCELLED',
        planned_cost: '0.00',
        actual_cost: null,
        actuals_status: 'cancelled',
      });
    });
  });
});
