import { BadRequestException } from '@nestjs/common';
import { Prisma, StudioShiftStatus } from '@prisma/client';

import { costsShiftsQuerySchema, costsShowsQuerySchema } from '@eridu/api-types/costs';

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

    it('keeps the trend reconciled with the subtotals', async () => {
      const showOnDay2 = mockShow; // 2026-06-02, resolved cost 1200
      const shiftOnDay3 = mockShift; // 2026-06-03, resolved cost 850

      (prisma.show.findMany as jest.Mock).mockResolvedValue([showOnDay2]);
      (prisma.studioShift.findMany as jest.Mock).mockResolvedValue([shiftOnDay3]);

      const result = await service.getCostsSummary('std_1', query);

      const sum = (key: 'show_cost' | 'shift_cost' | 'total_cost') =>
        result.trend.reduce((acc, point) => acc + Number(point[key]), 0).toFixed(2);

      // Each resolved cost must appear in exactly one bucket, so the trend
      // columns sum back to the reported subtotals (regression guard for the
      // "silent drop" failure mode).
      expect(sum('show_cost')).toBe(result.show_cost_subtotal);
      expect(sum('shift_cost')).toBe(result.shift_cost_subtotal);
      expect(sum('total_cost')).toBe(result.total_cost);

      // Trend is emitted in ascending date order.
      const dates = result.trend.map((point) => point.date);
      expect(dates).toEqual([...dates].sort((a, b) => a.localeCompare(b)));
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
        sort: [{ field: 'start_time' as const, desc: true }],
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
        sort: [{ field: 'total_cost' as const, desc: true }],
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('show_2'); // 1200 first
      expect(result.items[1].id).toBe('show_1'); // 700 second
    });
  });

  describe('query schema defaults', () => {
    const dateRange = {
      start_date: '2026-06-01T00:00:00.000Z',
      end_date: '2026-06-05T23:59:59.999Z',
    };

    it('defaults shifts pagination to the first page', () => {
      const parsed = costsShiftsQuerySchema.parse(dateRange);
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(10);
    });

    it('defaults shows pagination to the first page', () => {
      const parsed = costsShowsQuerySchema.parse(dateRange);
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(10);
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
        sort: [{ field: 'date' as const, desc: false }],
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

    it('filters shifts by operator name (case-insensitive contains)', async () => {
      (prisma.studioShift.count as jest.Mock).mockResolvedValue(1);
      (prisma.studioShift.findMany as jest.Mock).mockResolvedValue([mockShift]);

      await service.getCostsShifts('std_1', {
        ...query,
        page: 1,
        limit: 10,
        member_name: 'operator',
      });

      expect(prisma.studioShift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { user: { name: { contains: 'operator', mode: 'insensitive' } } },
            ]),
          }),
        }),
      );
    });

    it('filters shifts by persisted membership role on the operator', async () => {
      (prisma.studioShift.count as jest.Mock).mockResolvedValue(1);
      (prisma.studioShift.findMany as jest.Mock).mockResolvedValue([mockShift]);

      await service.getCostsShifts('std_1', {
        ...query,
        page: 1,
        limit: 10,
        role: 'member',
      });

      expect(prisma.studioShift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              {
                user: {
                  studioMemberships: {
                    some: {
                      studio: { uid: 'std_1' },
                      role: 'member',
                      deletedAt: null,
                    },
                  },
                },
              },
            ]),
          }),
        }),
      );
    });

    it('filters shifts by the duty-manager flag (not a membership role)', async () => {
      (prisma.studioShift.count as jest.Mock).mockResolvedValue(1);
      (prisma.studioShift.findMany as jest.Mock).mockResolvedValue([mockShift]);

      await service.getCostsShifts('std_1', {
        ...query,
        page: 1,
        limit: 10,
        is_duty_manager: true,
      });

      expect(prisma.studioShift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { isDutyManager: true },
            ]),
          }),
        }),
      );
    });
  });
});
