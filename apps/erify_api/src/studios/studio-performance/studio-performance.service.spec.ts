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
    } as any;
    service = new StudioPerformanceService(prisma);
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
        platform_gmv: 'ttpl_post_prod',
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
        platform_gmv: 'ttpl_post_prod',
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
          viewerCount: 0,
          ctr: null,
          cto: null,
          metadata: {},
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
      prisma.show.findMany.mockResolvedValue(mockShows as any);

      const result = await service.getPerformanceSummary('std_1', query);

      // Verify aggregates
      expect(result.total_gmv).toBe('3000.5');
      expect(result.total_views).toBe(2000);
      // CTR: (5.25 + 8.5) / 2 = 6.875 -> 6.875
      expect(result.avg_ctr).toBe('6.875');
      // CTO: (2.45 + 4.2) / 2 = 3.325
      expect(result.avg_cto).toBe('3.325');
      expect(result.recorded_shows_count).toBe(2);
      expect(result.total_shows_count).toBe(3);

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
  });

  describe('getPerformanceShows', () => {
    it('returns paginated list of shows with platform metrics', async () => {
      prisma.show.count.mockResolvedValue(3);
      prisma.show.findMany.mockResolvedValue(mockShows as any);

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

      // Show Gamma (No Records) should have null metrics (dimmed cells)
      expect(result.items[2].platforms[0]).toEqual({
        show_platform_uid: 'show_plt_103',
        platform_id: 'plat_shopee',
        platform_name: 'Shopee',
        gmv: null,
        views: null,
        ctr: null,
        cto: null,
      });
    });
  });
});
