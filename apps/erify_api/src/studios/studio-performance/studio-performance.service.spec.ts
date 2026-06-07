import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { StudioPerformanceService } from './studio-performance.service';

import type { PrismaService } from '@/prisma/prisma.service';

describe('studioPerformanceService', () => {
  let service: StudioPerformanceService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      show: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      studio: {
        findUnique: jest.fn(),
      },
    } as any;
    service = new StudioPerformanceService(prisma);

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

  const showPlatform1 = {
    id: 101n,
    uid: 'show_plt_101',
    gmv: new Prisma.Decimal('1000.50'),
    viewerCount: 500,
    ctr: new Prisma.Decimal('5.25'),
    cto: new Prisma.Decimal('2.45'),
    metadata: {
      performance_templates: {
        show_platform_gmv: 'ttpl_post_prod',
        show_platform_view_count: 'ttpl_post_prod',
      },
    },
    platform: {
      uid: 'plat_shopee',
      name: 'Shopee',
    },
  };

  const showPlatform2 = {
    id: 102n,
    uid: 'show_plt_102',
    gmv: new Prisma.Decimal('2000.00'),
    viewerCount: 1500,
    ctr: new Prisma.Decimal('8.50'),
    cto: new Prisma.Decimal('4.20'),
    metadata: {
      performance_templates: {
        show_platform_gmv: 'ttpl_post_prod',
        show_platform_view_count: 'ttpl_post_prod',
      },
    },
    platform: {
      uid: 'plat_tiktok',
      name: 'TikTok',
    },
  };

  const mockShows = [
    {
      id: 10n,
      uid: 'show_10',
      name: 'Show Alpha',
      startTime: new Date('2026-06-02T10:00:00Z'),
      endTime: new Date('2026-06-02T12:00:00Z'),
      client: { name: 'Client A' },
      showType: { name: 'Live Stream' },
      showPlatforms: [showPlatform1],
    },
    {
      id: 20n,
      uid: 'show_20',
      name: 'Show Beta',
      startTime: new Date('2026-06-03T18:00:00Z'),
      endTime: new Date('2026-06-03T20:00:00Z'),
      client: { name: 'Client B' },
      showType: { name: 'TikTok Live' },
      showPlatforms: [showPlatform2],
    },
    {
      id: 30n,
      uid: 'show_30',
      name: 'Show Gamma (No Records)',
      startTime: new Date('2026-06-04T12:00:00Z'),
      endTime: new Date('2026-06-04T14:00:00Z'),
      client: { name: 'Client A' },
      showType: { name: 'Live Stream' },
      showPlatforms: [
        {
          id: 103n,
          uid: 'show_plt_103',
          gmv: null,
          viewerCount: 100,
          ctr: null,
          cto: null,
          metadata: {
            performance_templates: {
              show_platform_view_count: 'ttpl_post_prod',
            },
          },
          platform: {
            uid: 'plat_shopee',
            name: 'Shopee',
          },
        },
      ],
    },
  ];

  describe('getPerformanceSummary', () => {
    it('throws BadRequestException if date range exceeds 31 days', async () => {
      const badQuery = {
        start_date: '2026-06-01T00:00:00.000Z',
        end_date: '2026-07-15T00:00:00.000Z',
      };

      await expect(
        service.getPerformanceSummary('std_1', badQuery),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns aggregate summary metrics and full trend coordinates', async () => {
      (prisma.show.findMany as jest.Mock).mockResolvedValue(mockShows as any);

      const result = await service.getPerformanceSummary('std_1', query);

      // Verify aggregates
      expect(result.total_gmv).toBe('3000.5');
      expect(result.total_views).toBe(2100);
      // CTR: (5.25 + 8.5) / 2 = 6.875 -> 6.875
      expect(result.avg_ctr).toBe('6.875');
      // CTO: (2.45 + 4.2) / 2 = 3.325
      expect(result.avg_cto).toBe('3.325');
      expect(result.recorded_shows_count).toBe(3);
      expect(result.total_shows_count).toBe(3);
      expect(result.currency).toBe('THB');
      expect(result.locale).toBe('th-TH');

      // Verify trend contains 5 days (June 1st to June 5th)
      expect(result.trend).toHaveLength(5);
      expect(result.trend[0]).toEqual({
        date: '2026-06-01',
        gmv: '0',
        views: 0,
        ctr: '0',
        cto: '0',
      });
      // June 2nd should have Show Alpha metrics
      expect(result.trend[1]).toEqual({
        date: '2026-06-02',
        gmv: '1000.5',
        views: 500,
        ctr: '5.25',
        cto: '2.45',
      });
      // June 3rd should have Show Beta metrics
      expect(result.trend[2]).toEqual({
        date: '2026-06-03',
        gmv: '2000',
        views: 1500,
        ctr: '8.5',
        cto: '4.2',
      });
    });

    it('returns custom studio localization settings from metadata', async () => {
      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.studio.findUnique as jest.Mock).mockResolvedValue({
        metadata: {
          localization: {
            locale: 'en-US',
            currency: 'USD',
          },
        },
      });

      const result = await service.getPerformanceSummary('std_1', query);
      expect(result.currency).toBe('USD');
      expect(result.locale).toBe('en-US');
    });

    it('buckets shows by operational day across the timezone boundary', async () => {
      // start_date 23:00Z == 06:00 local in UTC+7 (Bangkok), so the derived
      // offset is +7h and each operational day runs 06:00 -> 06:00 local.
      const bkkQuery = {
        start_date: '2026-05-31T23:00:00.000Z',
        end_date: '2026-06-02T23:00:00.000Z',
      };

      (prisma.show.findMany as jest.Mock).mockResolvedValue([
        {
          id: 40n,
          uid: 'show_40',
          name: 'Pre-boundary',
          // 05:30 local Jun 2 -> still operational day Jun 1
          startTime: new Date('2026-06-01T22:30:00Z'),
          endTime: new Date('2026-06-01T23:30:00Z'),
          client: { name: 'C' },
          showType: { name: 'T' },
          showPlatforms: [showPlatform1],
        },
        {
          id: 41n,
          uid: 'show_41',
          name: 'Post-boundary',
          // 06:30 local Jun 2 -> operational day Jun 2
          startTime: new Date('2026-06-01T23:30:00Z'),
          endTime: new Date('2026-06-02T00:30:00Z'),
          client: { name: 'C' },
          showType: { name: 'T' },
          showPlatforms: [showPlatform2],
        },
      ] as any);

      const result = await service.getPerformanceSummary('std_1', bkkQuery);
      const byDate = Object.fromEntries(result.trend.map((t) => [t.date, t.gmv]));

      // Shows one hour apart in UTC straddle the 06:00 local boundary and land
      // in different operational days.
      expect(byDate['2026-06-01']).toBe('1000.5');
      expect(byDate['2026-06-02']).toBe('2000');
    });

    it('ignores has_performance when aggregating the summary', async () => {
      // The presence filter is a list-only concern; folding it into the summary
      // would make "recorded vs total" self-referential.
      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPerformanceSummary('std_1', {
        ...query,
        has_performance: 'false',
      } as any);

      const where = (prisma.show.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where).not.toHaveProperty('AND');
      expect(where).not.toHaveProperty('NOT');
    });

    it('excludes viewerCount from totals when view-count provenance is absent', async () => {
      const gmvOnlyShows = [
        {
          id: 40n,
          uid: 'show_40',
          name: 'GMV only (no view provenance)',
          startTime: new Date('2026-06-02T10:00:00Z'),
          endTime: new Date('2026-06-02T12:00:00Z'),
          client: { name: 'Client A' },
          showType: { name: 'Live Stream' },
          showPlatforms: [
            {
              id: 201n,
              uid: 'show_plt_201',
              gmv: new Prisma.Decimal('500.00'),
              viewerCount: 999,
              ctr: null,
              cto: null,
              metadata: {
                performance_templates: {
                  show_platform_gmv: 'ttpl_post_prod',
                },
              },
              platform: { uid: 'plat_shopee', name: 'Shopee' },
            },
          ],
        },
      ];
      (prisma.show.findMany as jest.Mock).mockResolvedValue(gmvOnlyShows as any);

      const result = await service.getPerformanceSummary('std_1', query);

      expect(result.total_gmv).toBe('500');
      expect(result.total_views).toBe(0);
      expect(result.recorded_shows_count).toBe(1);
      expect(result.trend[1]).toEqual({
        date: '2026-06-02',
        gmv: '500',
        views: 0,
        ctr: '0',
        cto: '0',
      });
    });
  });

  describe('getPerformanceShows', () => {
    it('returns paginated list of shows with platform metrics', async () => {
      (prisma.show.count as jest.Mock).mockResolvedValue(3);
      (prisma.show.findMany as jest.Mock).mockResolvedValue(mockShows as any);

      const result = await service.getPerformanceShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
      });

      expect(prisma.show.count).toHaveBeenCalled();
      expect(prisma.show.findMany).toHaveBeenCalled();
      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);

      // Show Alpha
      expect(result.items[0]).toEqual({
        id: 'show_10',
        name: 'Show Alpha',
        start_time: mockShows[0].startTime.toISOString(),
        end_time: mockShows[0].endTime.toISOString(),
        client_name: 'Client A',
        show_type_name: 'Live Stream',
        platforms: [
          {
            show_platform_uid: 'show_plt_101',
            platform_id: 'plat_shopee',
            platform_name: 'Shopee',
            gmv: '1000.5',
            views: 500,
            ctr: '5.25',
            cto: '2.45',
          },
        ],
      });

      // Show Gamma records only show_platform_view_count: views are populated
      // from provenance while the absent gmv/ctr/cto columns stay null (not '0.00').
      expect(result.items[2].platforms[0]).toEqual({
        show_platform_uid: 'show_plt_103',
        platform_id: 'plat_shopee',
        platform_name: 'Shopee',
        gmv: null,
        views: 100,
        ctr: null,
        cto: null,
      });
    });

    it('throws BadRequestException if end_date is before start_date', async () => {
      await expect(
        service.getPerformanceShows('std_1', {
          start_date: '2026-06-05T00:00:00.000Z',
          end_date: '2026-06-01T00:00:00.000Z',
          page: 1,
          limit: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('applies a case-insensitive name filter when name is provided', async () => {
      (prisma.show.count as jest.Mock).mockResolvedValue(0);
      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPerformanceShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
        name: 'Alpha',
      });

      const expectedNameFilter = { name: { contains: 'Alpha', mode: 'insensitive' } };
      expect(prisma.show.count).toHaveBeenCalledWith({
        where: expect.objectContaining(expectedNameFilter),
      });
      expect(prisma.show.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining(expectedNameFilter) }),
      );
    });

    it('omits the name filter when name is not provided', async () => {
      (prisma.show.count as jest.Mock).mockResolvedValue(0);
      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPerformanceShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
      });

      const countWhere = (prisma.show.count as jest.Mock).mock.calls[0][0].where;
      const findManyWhere = (prisma.show.findMany as jest.Mock).mock.calls[0][0].where;
      expect(countWhere).not.toHaveProperty('name');
      expect(findManyWhere).not.toHaveProperty('name');
    });

    it('trims the name filter and omits it when only whitespace', async () => {
      (prisma.show.count as jest.Mock).mockResolvedValue(0);
      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPerformanceShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
        name: '  Alpha  ',
      });
      expect(prisma.show.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ name: { contains: 'Alpha', mode: 'insensitive' } }),
      });

      (prisma.show.count as jest.Mock).mockClear();
      await service.getPerformanceShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
        name: '   ',
      });
      expect((prisma.show.count as jest.Mock).mock.calls[0][0].where).not.toHaveProperty('name');
    });

    const recordedSome = expect.objectContaining({
      showPlatforms: {
        some: expect.objectContaining({
          deletedAt: null,
          OR: expect.arrayContaining([
            expect.objectContaining({ gmv: { not: null } }),
          ]),
        }),
      },
    });

    it('applies has_performance filter when set to true', async () => {
      (prisma.show.count as jest.Mock).mockResolvedValue(0);
      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPerformanceShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
        has_performance: 'true',
      });

      expect(prisma.show.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: expect.arrayContaining([recordedSome]),
        }),
      });
    });

    it('applies has_performance filter when set to false', async () => {
      (prisma.show.count as jest.Mock).mockResolvedValue(0);
      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPerformanceShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
        has_performance: 'false',
      });

      expect(prisma.show.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ NOT: recordedSome }),
          ]),
        }),
      });
    });

    it('composes the platform filter with has_performance without clobbering it', async () => {
      (prisma.show.count as jest.Mock).mockResolvedValue(0);
      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPerformanceShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
        platform_id: 'plat_shopee',
        has_performance: 'true',
      });

      const where = (prisma.show.count as jest.Mock).mock.calls[0][0].where;
      // Both the platform filter and the presence filter must survive — they
      // are separate entries in `AND`, not a single key one overwrites.
      expect(where.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            showPlatforms: {
              some: expect.objectContaining({
                deletedAt: null,
                platform: { uid: { in: ['plat_shopee'] } },
              }),
            },
          }),
          // Presence predicate is also scoped to the selected platform so a
          // show whose *other* platform has records doesn't pass the filter.
          expect.objectContaining({
            showPlatforms: {
              some: expect.objectContaining({
                deletedAt: null,
                platform: { uid: { in: ['plat_shopee'] } },
                OR: expect.arrayContaining([
                  expect.objectContaining({ gmv: { not: null } }),
                ]),
              }),
            },
          }),
        ]),
      );
    });

    it('does not add platform constraint to presence predicate when no platform filter', async () => {
      (prisma.show.count as jest.Mock).mockResolvedValue(0);
      (prisma.show.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPerformanceShows('std_1', {
        ...query,
        page: 1,
        limit: 10,
        has_performance: 'true',
      });

      const where = (prisma.show.count as jest.Mock).mock.calls[0][0].where;
      // Without a platform filter the presence predicate must not contain a
      // platform constraint — any platform with data qualifies the show.
      const presenceEntry = where.AND[0];
      expect(presenceEntry.showPlatforms.some).not.toHaveProperty('platform');
    });
  });
});
