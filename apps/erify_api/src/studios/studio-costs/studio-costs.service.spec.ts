import { BadRequestException } from '@nestjs/common';
import { Prisma, StudioShiftStatus } from '@prisma/client';

import { StudioCostsService } from './studio-costs.service';

import type { PrismaService } from '@/prisma/prisma.service';

describe('studioCostsService', () => {
  let service: StudioCostsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      show: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      studioShift: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      studio: {
        findUnique: jest.fn(),
      },
    } as any;
    service = new StudioCostsService(prisma);

    if (prisma.studio && prisma.studio.findUnique) {
      (prisma.studio.findUnique as jest.Mock).mockResolvedValue({
        metadata: {
          localization: {
            locale: 'th-TH',
            currency: 'THB',
          },
        },
      });
    }
  });

  const query = {
    start_date: '2026-06-01T00:00:00.000Z',
    end_date: '2026-06-05T23:59:59.999Z',
  };

  const mockShow = {
    id: 10n,
    uid: 'show_10',
    name: 'Show Alpha',
    startTime: new Date('2026-06-02T10:00:00Z'),
    endTime: new Date('2026-06-02T12:00:00Z'),
    actualStartTime: new Date('2026-06-02T10:05:00Z'),
    actualEndTime: new Date('2026-06-02T12:05:00Z'),
    client: { name: 'Client A' },
    showType: { name: 'Live Stream' },
    showStandard: { name: 'Standard 1' },
    metadata: {
      actuals_source: {
        actual_start_time: 'OPERATOR',
        actual_end_time: 'OPERATOR',
      },
    },
    showCreators: [
      {
        uid: 'sc_1',
        compensationType: 'FIXED',
        agreedRate: new Prisma.Decimal('1000.00'),
        commissionRate: null,
        creator: {
          uid: 'creator_1',
          name: 'Creator One',
          aliasName: 'C1',
        },
        compensationLineItemTargets: [
          {
            lineItem: {
              amount: new Prisma.Decimal('150.00'),
              deletedAt: null,
            },
          },
        ],
      },
    ],
    compensationLineItemTargets: [
      {
        lineItem: {
          amount: new Prisma.Decimal('50.00'),
          deletedAt: null,
        },
      },
    ],
  };

  const mockShift = {
    id: 20n,
    uid: 'shift_20',
    date: new Date('2026-06-03T00:00:00Z'),
    hourlyRate: new Prisma.Decimal('200.00'),
    status: StudioShiftStatus.COMPLETED,
    user: {
      name: 'Operator One',
      studioMemberships: [
        {
          role: 'OPERATOR',
        },
      ],
    },
    blocks: [
      {
        uid: 'block_201',
        startTime: new Date('2026-06-03T10:00:00Z'),
        endTime: new Date('2026-06-03T14:00:00Z'),
        actualStartTime: new Date('2026-06-03T10:00:00Z'),
        actualEndTime: new Date('2026-06-03T14:00:00Z'),
        metadata: {
          actuals_source: {
            actual_start_time: 'OPERATOR',
            actual_end_time: 'OPERATOR',
          },
        },
        compensationLineItemTargets: [
          {
            lineItem: {
              amount: new Prisma.Decimal('20.00'),
              deletedAt: null,
            },
          },
        ],
      },
    ],
    compensationLineItemTargets: [
      {
        lineItem: {
          amount: new Prisma.Decimal('30.00'),
          deletedAt: null,
        },
      },
    ],
  };

  describe('getCostsSummary', () => {
    it('throws BadRequestException if date range exceeds 31 days', async () => {
      const badQuery = {
        start_date: '2026-06-01T00:00:00.000Z',
        end_date: '2026-07-15T00:00:00.000Z',
      };

      await expect(
        service.getCostsSummary('std_1', badQuery),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns summary show and shift aggregates', async () => {
      (prisma.show.findMany as jest.Mock).mockResolvedValue([mockShow]);
      (prisma.studioShift.findMany as jest.Mock).mockResolvedValue([mockShift]);

      const result = await service.getCostsSummary('std_1', query);

      // Show costs: FIXED rate (1000) + creator adjustment (150) + show adjustment (50) = 1200
      expect(result.show_cost_subtotal).toBe('1200.00');

      // Shift costs: hourly rate (200) * 4 hours (800) + block adjustment (20) + shift adjustment (30) = 850
      expect(result.shift_cost_subtotal).toBe('850.00');

      expect(result.total_cost).toBe('2050.00');
      expect(result.total_shows_count).toBe(1);
      expect(result.unresolved_shows_count).toBe(0);
      expect(result.total_shifts_count).toBe(1);
      expect(result.unresolved_shifts_count).toBe(0);
      expect(result.trend).toHaveLength(5);
    });

    it('bubbles up unresolved creators to mark show cost as null', async () => {
      const unresolvedShow = {
        ...mockShow,
        showCreators: [
          {
            uid: 'sc_1',
            compensationType: 'HYBRID', // HYBRID is unresolved because of pending commission
            agreedRate: new Prisma.Decimal('1000.00'),
            commissionRate: new Prisma.Decimal('10.00'),
            creator: {
              uid: 'creator_1',
              name: 'Creator One',
              aliasName: 'C1',
            },
            compensationLineItemTargets: [],
          },
        ],
      };

      (prisma.show.findMany as jest.Mock).mockResolvedValue([unresolvedShow]);
      (prisma.studioShift.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCostsSummary('std_1', query);

      expect(result.show_cost_subtotal).toBe('0.00');
      expect(result.unresolved_shows_count).toBe(1);
    });

    it('falls back with warnings if shift block actuals are missing', async () => {
      const fallbackShift = {
        ...mockShift,
        blocks: [
          {
            uid: 'block_201',
            startTime: new Date('2026-06-03T10:00:00Z'),
            endTime: new Date('2026-06-03T14:00:00Z'),
            actualStartTime: null,
            actualEndTime: null,
            metadata: {},
            compensationLineItemTargets: [],
          },
        ],
      };

      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.studioShift.findMany as jest.Mock).mockResolvedValue([fallbackShift]);

      const result = await service.getCostsSummary('std_1', query);

      // base: 200 * 4h = 800 + 30 shift line item = 830
      expect(result.shift_cost_subtotal).toBe('830.00');
      expect(result.unresolved_shifts_count).toBe(0);
    });
  });

  describe('getCostsShows', () => {
    it('supports database sorting by start_time', async () => {
      (prisma.show.count as jest.Mock).mockResolvedValue(1);
      (prisma.show.findMany as jest.Mock).mockResolvedValue([mockShow]);

      const result = await service.getCostsShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
        sort: 'start_time:desc',
      });

      expect(prisma.show.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ startTime: 'desc' }],
          skip: 0,
          take: 10,
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('show_10');
    });

    it('supports in-memory sorting by total_cost', async () => {
      const show1 = {
        ...mockShow,
        uid: 'show_1',
        showCreators: [
          {
            ...mockShow.showCreators[0],
            agreedRate: new Prisma.Decimal('500.00'),
          },
        ],
      }; // Cost: 500 + 150 + 50 = 700

      const show2 = {
        ...mockShow,
        uid: 'show_2',
        showCreators: [
          {
            ...mockShow.showCreators[0],
            agreedRate: new Prisma.Decimal('1000.00'),
          },
        ],
      }; // Cost: 1000 + 150 + 50 = 1200

      (prisma.show.findMany as jest.Mock).mockResolvedValue([show1, show2]);

      const result = await service.getCostsShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
        sort: 'total_cost:desc',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('show_2'); // 1200 first
      expect(result.items[1].id).toBe('show_1'); // 700 second
    });
  });

  describe('getCostsShifts', () => {
    it('supports database sorting by date', async () => {
      (prisma.studioShift.count as jest.Mock).mockResolvedValue(1);
      (prisma.studioShift.findMany as jest.Mock).mockResolvedValue([mockShift]);

      const result = await service.getCostsShifts('std_1', {
        ...query,
        page: 1,
        limit: 10,
        sort: 'date:asc',
      });

      expect(prisma.studioShift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ date: 'asc' }],
          skip: 0,
          take: 10,
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('shift_20');
    });
  });
});
