import { StudioPerformanceController } from './studio-performance.controller';
import type { StudioPerformanceService } from './studio-performance.service';

describe('studioPerformanceController', () => {
  const buildController = () => {
    const service = {
      getPerformanceSummary: jest.fn(),
      getPerformanceShows: jest.fn(),
    } as unknown as jest.Mocked<StudioPerformanceService>;
    const controller = new StudioPerformanceController(service);

    return { controller, service };
  };

  const query = {
    start_date: '2026-06-01T00:00:00.000Z',
    end_date: '2026-06-05T23:59:59.999Z',
  };

  const showsQuery = {
    ...query,
    page: 1,
    limit: 10,
    skip: 0,
    take: 10,
    sort: 'desc' as const,
  };

  it('gets show performance summary from the service', async () => {
    const { controller, service } = buildController();
    const mockSummary = {
      total_gmv: '3000.50',
      total_views: 2000,
      avg_ctr: '6.88',
      avg_cto: '3.33',
      recorded_shows_count: 2,
      total_shows_count: 3,
      trend: [],
    };
    service.getPerformanceSummary.mockResolvedValue(mockSummary);

    const result = await controller.getSummary('std_123', query);

    expect(service.getPerformanceSummary).toHaveBeenCalledWith('std_123', query);
    expect(result).toEqual(mockSummary);
  });

  it('gets paginated list of shows with performance metrics from the service', async () => {
    const { controller, service } = buildController();
    service.getPerformanceShows.mockResolvedValue({
      items: [{ id: 'show_1' }] as any,
      total: 1,
    });

    const result = await controller.listShows('std_123', showsQuery);

    expect(service.getPerformanceShows).toHaveBeenCalledWith('std_123', showsQuery);
    expect(result).toEqual({
      data: [{ id: 'show_1' }],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });
});
