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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioShiftService,
        {
          provide: StudioShiftRepository,
          useValue: {
            createShift: jest.fn(),
            findByUidInStudio: jest.fn(),
            findPaginated: jest.fn(),
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
            generateBrandedId: jest
              .fn()
              .mockReturnValueOnce('ssh_1')
              .mockReturnValueOnce('ssb_1')
              .mockReturnValueOnce('ssb_2'),
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
    });
  });
});
