import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { StudioShiftRepository } from './studio-shift.repository';
import { StudioShiftService } from './studio-shift.service';

import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';

describe('studioShiftService', () => {
  let service: StudioShiftService;
  let repository: jest.Mocked<StudioShiftRepository>;
  let membershipService: jest.Mocked<StudioMembershipService>;

  beforeEach(async () => {
    let brandedIdCounter = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioShiftService,
        {
          provide: StudioShiftRepository,
          useValue: {
            createShift: jest.fn(),
            findByUidInStudio: jest.fn(),
            findPaginated: jest.fn(),
            findPaginatedForUser: jest.fn(),
            findByStudioAndBlockWindow: jest.fn(),
            findMemberCompensationRows: jest.fn(),
            findOverlappingShift: jest.fn(),
            updateShift: jest.fn(),
            softDeleteInStudio: jest.fn(),
            findActiveDutyManager: jest.fn(),
          },
        },
        {
          provide: StudioMembershipService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: UidGeneratorService,
          useValue: {
            generateBrandedId: jest.fn((prefix: string) => `${prefix}_${++brandedIdCounter}`),
          },
        },
      ],
    }).compile();

    service = module.get<StudioShiftService>(StudioShiftService);
    repository = module.get(StudioShiftRepository);
    membershipService = module.get(StudioMembershipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    repository.findOverlappingShift.mockResolvedValue(null);
  });

  describe('createShift', () => {
    it('should create a shift with generated UIDs without persisting derived cost', async () => {
      membershipService.findOne.mockResolvedValue({
        baseHourlyRate: { toString: () => '20.00' },
      } as never);

      repository.createShift.mockResolvedValue({ uid: 'ssh_1' } as never);

      const result = await service.createShift('std_1', {
        userId: 'user_1',
        date: new Date('2026-03-05'),
        hourlyRate: undefined,
        blocks: [
          {
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: undefined,
            actualEndTime: undefined,
            metadata: {},
          },
          {
            startTime: new Date('2026-03-05T13:00:00.000Z'),
            endTime: new Date('2026-03-05T14:00:00.000Z'),
            actualStartTime: undefined,
            actualEndTime: undefined,
            metadata: {},
          },
        ],
        status: undefined,
        isDutyManager: undefined,
        isApproved: undefined,
        metadata: {},
      });

      expect(membershipService.findOne).toHaveBeenCalledWith({
        user: { uid: 'user_1' },
        studio: { uid: 'std_1' },
        deletedAt: null,
      });
      expect(repository.createShift).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'ssh_1',
          hourlyRate: '20.00',
          studio: { connect: { uid: 'std_1' } },
          user: { connect: { uid: 'user_1' } },
        }),
      );
      expect(repository.createShift.mock.calls[0]?.[0]).not.toHaveProperty('projectedCost');
      expect(repository.createShift.mock.calls[0]?.[0]).not.toHaveProperty('calculatedCost');
      expect(repository.findOverlappingShift).toHaveBeenCalled();
      expect(result).toEqual({ uid: 'ssh_1' });
    });

    it('should reject create when block ranges overlap', async () => {
      await expect(
        service.createShift('std_1', {
          userId: 'user_1',
          date: new Date('2026-03-05'),
          hourlyRate: '20.00',
          blocks: [
            {
              startTime: new Date('2026-03-05T09:00:00.000Z'),
              endTime: new Date('2026-03-05T12:00:00.000Z'),
              metadata: {},
              actualStartTime: undefined,
              actualEndTime: undefined,
            },
            {
              startTime: new Date('2026-03-05T11:00:00.000Z'),
              endTime: new Date('2026-03-05T13:00:00.000Z'),
              metadata: {},
              actualStartTime: undefined,
              actualEndTime: undefined,
            },
          ],
          status: undefined,
          isDutyManager: undefined,
          isApproved: undefined,
          metadata: {},
        }),
      ).rejects.toThrow('Shift blocks cannot overlap');
    });

    it('should reject create when user is not in studio membership', async () => {
      membershipService.findOne.mockResolvedValue(null);

      await expect(
        service.createShift('std_1', {
          userId: 'user_1',
          date: new Date('2026-03-05'),
          hourlyRate: '20.00',
          blocks: [
            {
              startTime: new Date('2026-03-05T09:00:00.000Z'),
              endTime: new Date('2026-03-05T12:00:00.000Z'),
              metadata: {},
              actualStartTime: undefined,
              actualEndTime: undefined,
            },
          ],
          status: undefined,
          isDutyManager: undefined,
          isApproved: undefined,
          metadata: {},
        }),
      ).rejects.toThrow('User must be a member of the studio');
    });

    it('should support cross-midnight blocks when end time is on next day', async () => {
      membershipService.findOne.mockResolvedValue({
        baseHourlyRate: { toString: () => '20.00' },
      } as never);
      repository.createShift.mockResolvedValue({ uid: 'ssh_1' } as never);

      await service.createShift('std_1', {
        userId: 'user_1',
        date: new Date('2026-03-05'),
        hourlyRate: undefined,
        blocks: [
          {
            startTime: new Date('2026-03-05T22:00:00.000Z'),
            endTime: new Date('2026-03-06T02:00:00.000Z'),
            metadata: {},
            actualStartTime: undefined,
            actualEndTime: undefined,
          },
        ],
        status: undefined,
        isDutyManager: undefined,
        isApproved: undefined,
        metadata: {},
      });

      expect(repository.createShift).toHaveBeenCalled();
      expect(repository.createShift.mock.calls[0]?.[0]).not.toHaveProperty('projectedCost');
    });

    it('should reject create when user already has an overlapping shift', async () => {
      membershipService.findOne.mockResolvedValue({
        baseHourlyRate: { toString: () => '20.00' },
      } as never);

      repository.findOverlappingShift.mockResolvedValue({ uid: 'ssh_existing' } as never);

      await expect(
        service.createShift('std_1', {
          userId: 'user_1',
          date: new Date('2026-03-05'),
          hourlyRate: '20.00',
          blocks: [
            {
              startTime: new Date('2026-03-05T09:00:00.000Z'),
              endTime: new Date('2026-03-05T12:00:00.000Z'),
              metadata: {},
              actualStartTime: undefined,
              actualEndTime: undefined,
            },
          ],
          status: undefined,
          isDutyManager: undefined,
          isApproved: undefined,
          metadata: {},
        }),
      ).rejects.toThrow('Shift blocks overlap with an existing non-cancelled shift for this user.');
    });

    it('should reject create when no blocks are provided', async () => {
      await expect(
        service.createShift('std_1', {
          userId: 'user_1',
          date: new Date('2026-03-05'),
          hourlyRate: '20.00',
          blocks: [],
          status: undefined,
          isDutyManager: undefined,
          isApproved: undefined,
          metadata: {},
        }),
      ).rejects.toThrow('Shift must contain at least one block');
    });
  });

  describe('updateShift', () => {
    it('should update only duty manager flag while preserving cost basis', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        blocks: [
          {
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: undefined,
            actualEndTime: undefined,
            metadata: {},
          },
        ],
      } as never);

      repository.updateShift.mockResolvedValue({ uid: 'ssh_1' } as never);

      await service.updateShift('std_1', 'ssh_1', {
        isDutyManager: true,
      });

      expect(repository.updateShift).toHaveBeenCalledWith(
        'std_1',
        'ssh_1',
        expect.objectContaining({
          isDutyManager: true,
          hourlyRate: '20',
        }),
        BigInt(1),
        undefined,
      );
      expect(repository.updateShift.mock.calls[0]?.[2]).not.toHaveProperty('projectedCost');
      expect(repository.findOverlappingShift).toHaveBeenCalled();
    });

    it('should reject update when blocks overlap with an existing non-cancelled shift', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        blocks: [
          {
            uid: 'ssb_keep',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: undefined,
            actualEndTime: undefined,
            metadata: {},
          },
        ],
      } as never);

      repository.findOverlappingShift.mockResolvedValue({ uid: 'ssh_other' } as never);

      await expect(
        service.updateShift('std_1', 'ssh_1', {
          blocks: [
            {
              startTime: new Date('2026-03-05T10:00:00.000Z'),
              endTime: new Date('2026-03-05T14:00:00.000Z'),
              metadata: {},
              actualStartTime: undefined,
              actualEndTime: undefined,
            },
          ],
        }),
      ).rejects.toThrow('Shift blocks overlap with an existing non-cancelled shift for this user.');
    });

    it('should skip overlap check when resulting status is CANCELLED', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        blocks: [
          {
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: undefined,
            actualEndTime: undefined,
            metadata: {},
          },
        ],
      } as never);

      repository.updateShift.mockResolvedValue({ uid: 'ssh_1' } as never);

      await service.updateShift('std_1', 'ssh_1', {
        status: 'CANCELLED',
      });

      expect(repository.findOverlappingShift).not.toHaveBeenCalled();
    });

    it('should preserve stable block UIDs on update and soft-delete removed blocks', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        blocks: [
          {
            uid: 'ssb_keep',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: undefined,
            actualEndTime: undefined,
            metadata: {},
          },
          {
            uid: 'ssb_remove',
            startTime: new Date('2026-03-05T13:00:00.000Z'),
            endTime: new Date('2026-03-05T14:00:00.000Z'),
            metadata: {},
            actualStartTime: undefined,
            actualEndTime: undefined,
          },
        ],
      } as never);

      repository.updateShift.mockResolvedValue({ uid: 'ssh_1' } as never);

      await service.updateShift('std_1', 'ssh_1', {
        blocks: [
          {
            startTime: new Date('2026-03-05T09:30:00.000Z'),
            endTime: new Date('2026-03-05T12:30:00.000Z'),
            metadata: {},
            actualStartTime: undefined,
            actualEndTime: undefined,
          },
        ],
      });

      expect(repository.updateShift).toHaveBeenCalledWith(
        'std_1',
        'ssh_1',
        expect.not.objectContaining({ blocks: expect.anything() }),
        BigInt(1),
        {
          blocksToUpsert: [
            expect.objectContaining({
              uid: 'ssb_keep',
              startTime: new Date('2026-03-05T09:30:00.000Z'),
              endTime: new Date('2026-03-05T12:30:00.000Z'),
            }),
          ],
          retainedUids: ['ssb_keep'],
        },
      );
    });

    it('should preserve stored hourly rate when same user_id is sent without hourly_rate', async () => {
      // Sending the current user_id alongside other fields (e.g. is_duty_manager) is a common
      // PATCH pattern. It must NOT trigger membership lookup or re-derive the hourly rate —
      // only an actual user change (different UID) warrants re-derivation.
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        blocks: [
          {
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: undefined,
            actualEndTime: undefined,
            metadata: {},
          },
        ],
      } as never);
      repository.updateShift.mockResolvedValue({ uid: 'ssh_1' } as never);

      await service.updateShift('std_1', 'ssh_1', {
        userId: 'user_1',
        isDutyManager: true,
      });

      expect(membershipService.findOne).not.toHaveBeenCalled();
      expect(repository.updateShift).toHaveBeenCalledWith(
        'std_1',
        'ssh_1',
        expect.objectContaining({
          isDutyManager: true,
          hourlyRate: '20',
        }),
        BigInt(1),
        undefined,
      );
    });

    it('should inherit membership hourly rate when reassigned to another user', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        blocks: [
          {
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: undefined,
            actualEndTime: undefined,
            metadata: {},
          },
        ],
      } as never);
      membershipService.findOne.mockResolvedValue({
        baseHourlyRate: { toString: () => '35.50' },
      } as never);
      repository.updateShift.mockResolvedValue({ uid: 'ssh_1' } as never);

      await service.updateShift('std_1', 'ssh_1', {
        userId: 'user_2',
      });

      expect(membershipService.findOne).toHaveBeenCalledWith({
        user: { uid: 'user_2' },
        studio: { uid: 'std_1' },
        deletedAt: null,
      });
      expect(repository.findOverlappingShift).toHaveBeenCalledWith(
        expect.objectContaining({
          userUid: 'user_2',
        }),
      );
      expect(repository.updateShift).toHaveBeenCalledWith(
        'std_1',
        'ssh_1',
        expect.objectContaining({
          user: { connect: { uid: 'user_2' } },
          hourlyRate: '35.50',
        }),
        BigInt(1),
        undefined,
      );
    });

    it('should append snapshot audit when hourly rate changes', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        metadata: { audit: { snapshot_overrides: [] } },
        blocks: [
          {
            uid: 'ssb_keep',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: null,
            actualEndTime: null,
            metadata: {},
          },
        ],
      } as never);
      repository.updateShift.mockResolvedValue({ uid: 'ssh_1' } as never);

      await service.updateShift('std_1', 'ssh_1', {
        hourlyRate: '25.00',
        overrideReason: 'Manager correction',
      }, 'user_actor');

      expect(repository.updateShift).toHaveBeenCalledWith(
        'std_1',
        'ssh_1',
        expect.objectContaining({
          hourlyRate: '25.00',
          metadata: expect.objectContaining({
            audit: expect.objectContaining({
              snapshot_overrides: [
                expect.objectContaining({
                  field: 'hourly_rate',
                  old_value: '20',
                  new_value: '25.00',
                  actor_ext_id: 'user_actor',
                  reason: 'Manager correction',
                }),
              ],
            }),
          }),
        }),
        BigInt(1),
        undefined,
      );
    });

    it('should reject hourly rate change when override_reason is missing', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        metadata: { audit: { snapshot_overrides: [] } },
        blocks: [
          {
            uid: 'ssb_keep',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: null,
            actualEndTime: null,
            metadata: {},
          },
        ],
      } as never);

      await expect(
        service.updateShift('std_1', 'ssh_1', { hourlyRate: '25.00' }, 'user_actor'),
      ).rejects.toThrow('override_reason is required when hourly_rate changes');

      expect(repository.updateShift).not.toHaveBeenCalled();
    });

    it('should reject hourly rate change when override_reason is blank whitespace', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        metadata: { audit: { snapshot_overrides: [] } },
        blocks: [
          {
            uid: 'ssb_keep',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: null,
            actualEndTime: null,
            metadata: {},
          },
        ],
      } as never);

      await expect(
        service.updateShift(
          'std_1',
          'ssh_1',
          { hourlyRate: '25.00', overrideReason: '   ' },
          'user_actor',
        ),
      ).rejects.toThrow('override_reason is required when hourly_rate changes');

      expect(repository.updateShift).not.toHaveBeenCalled();
    });

    it('should update one shift block actual side against the stored other side', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        metadata: {},
        blocks: [
          {
            uid: 'ssb_keep',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: null,
            actualEndTime: new Date('2026-03-05T12:10:00.000Z'),
            metadata: {},
          },
        ],
      } as never);
      repository.updateShift.mockResolvedValue({ uid: 'ssh_1' } as never);

      await service.updateShiftBlock('std_1', 'ssh_1', 'ssb_keep', {
        actualStartTime: new Date('2026-03-05T09:05:00.000Z'),
      }, 'user_actor');

      expect(repository.updateShift).toHaveBeenCalledWith(
        'std_1',
        'ssh_1',
        expect.any(Object),
        BigInt(1),
        expect.objectContaining({
          blocksToUpsert: [
            expect.objectContaining({
              uid: 'ssb_keep',
              actualStartTime: new Date('2026-03-05T09:05:00.000Z'),
              actualEndTime: new Date('2026-03-05T12:10:00.000Z'),
            }),
          ],
        }),
      );
    });

    it('should reject shift block actual updates that invert the stored range', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: new Prisma.Decimal('20.00'),
        metadata: {},
        blocks: [
          {
            uid: 'ssb_keep',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            actualStartTime: new Date('2026-03-05T10:00:00.000Z'),
            actualEndTime: null,
            metadata: {},
          },
        ],
      } as never);

      await expect(
        service.updateShiftBlock('std_1', 'ssh_1', 'ssb_keep', {
          actualEndTime: new Date('2026-03-05T09:30:00.000Z'),
        }, 'user_actor'),
      ).rejects.toThrow('Shift block actual_end_time must be after actual_start_time');
    });
  });

  describe('listMemberCompensationShifts', () => {
    it('delegates to the repository with studio, user, and date range scope', async () => {
      const dateFrom = new Date('2026-05-01T00:00:00.000Z');
      const dateTo = new Date('2026-05-31T00:00:00.000Z');
      repository.findMemberCompensationRows.mockResolvedValue([
        { uid: 'ssh_1' },
      ] as never);

      const result = await service.listMemberCompensationShifts({
        studioId: 'std_1',
        userId: 'user_1',
        dateFrom,
        dateTo,
      });

      expect(repository.findMemberCompensationRows).toHaveBeenCalledWith({
        studioId: 'std_1',
        userId: 'user_1',
        dateFrom,
        dateTo,
      });
      expect(result).toEqual([{ uid: 'ssh_1' }]);
    });
  });
});
