import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { StudioShiftRepository } from './studio-shift.repository';
import { StudioShiftService } from './studio-shift.service';

import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { UtilityService } from '@/utility/utility.service';

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
          provide: UtilityService,
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
    it('should calculate projected cost and create shift with generated UIDs', async () => {
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
            metadata: {},
          },
          {
            startTime: new Date('2026-03-05T13:00:00.000Z'),
            endTime: new Date('2026-03-05T14:00:00.000Z'),
            metadata: {},
          },
        ],
        status: undefined,
        isDutyManager: undefined,
        isApproved: undefined,
        calculatedCost: undefined,
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
          projectedCost: '80.00',
          studio: { connect: { uid: 'std_1' } },
          user: { connect: { uid: 'user_1' } },
        }),
      );
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
            },
            {
              startTime: new Date('2026-03-05T11:00:00.000Z'),
              endTime: new Date('2026-03-05T13:00:00.000Z'),
              metadata: {},
            },
          ],
          status: undefined,
          isDutyManager: undefined,
          isApproved: undefined,
          calculatedCost: undefined,
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
            },
          ],
          status: undefined,
          isDutyManager: undefined,
          isApproved: undefined,
          calculatedCost: undefined,
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
          },
        ],
        status: undefined,
        isDutyManager: undefined,
        isApproved: undefined,
        calculatedCost: undefined,
        metadata: {},
      });

      expect(repository.createShift).toHaveBeenCalledWith(
        expect.objectContaining({
          projectedCost: '80.00',
        }),
      );
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
          calculatedCost: undefined,
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
        hourlyRate: { toString: () => '20.00' },
        blocks: [
          {
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
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
          hourlyRate: '20.00',
          projectedCost: '60.00',
        }),
        BigInt(1),
      );
      expect(repository.findOverlappingShift).toHaveBeenCalled();
    });

    it('should skip overlap check when resulting status is CANCELLED', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: { toString: () => '20.00' },
        blocks: [
          {
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
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
        hourlyRate: { toString: () => '20.00' },
        blocks: [
          {
            uid: 'ssb_keep',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
            metadata: {},
          },
          {
            uid: 'ssb_remove',
            startTime: new Date('2026-03-05T13:00:00.000Z'),
            endTime: new Date('2026-03-05T14:00:00.000Z'),
            metadata: {},
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
          },
        ],
      });

      expect(repository.updateShift).toHaveBeenCalledWith(
        'std_1',
        'ssh_1',
        expect.objectContaining({
          blocks: expect.objectContaining({
            updateMany: expect.objectContaining({
              where: {
                deletedAt: null,
                uid: {
                  notIn: ['ssb_keep'],
                },
              },
              data: {
                deletedAt: expect.any(Date),
              },
            }),
            upsert: [
              expect.objectContaining({
                where: {
                  uid: 'ssb_keep',
                },
                update: expect.objectContaining({
                  startTime: new Date('2026-03-05T09:30:00.000Z'),
                  endTime: new Date('2026-03-05T12:30:00.000Z'),
                }),
              }),
            ],
          }),
        }),
        BigInt(1),
      );
    });

    it('should inherit membership hourly rate when reassigned to another user', async () => {
      repository.findByUidInStudio.mockResolvedValue({
        id: BigInt(1),
        uid: 'ssh_1',
        status: 'SCHEDULED',
        user: { uid: 'user_1' },
        hourlyRate: { toString: () => '20.00' },
        blocks: [
          {
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T12:00:00.000Z'),
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
          projectedCost: '106.50',
        }),
        BigInt(1),
      );
    });
  });
});
