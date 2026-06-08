import { StudioCostsController } from './studio-costs.controller';
import type { StudioCostsService } from './studio-costs.service';

describe('studioCostsController', () => {
  const buildController = () => {
    const service = {
      getCostsSummary: jest.fn(),
      getCostsShows: jest.fn(),
      getCostsShifts: jest.fn(),
    } as unknown as jest.Mocked<StudioCostsService>;
    const controller = new StudioCostsController(service);

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
    sort: [{ field: 'total_cost' as const, desc: true }],
  };

  const shiftsQuery = {
    ...query,
    page: 1,
    limit: 10,
    skip: 0,
    take: 10,
    sort: [{ field: 'total_cost' as const, desc: true }],
  };

  it('gets costs summary from the service', async () => {
    const { controller, service } = buildController();
    const mockSummary = {
      total_cost: '2050.00',
      show_cost_subtotal: '1200.00',
      shift_cost_subtotal: '850.00',
      unresolved_shows_count: 0,
      total_shows_count: 1,
      unresolved_shifts_count: 0,
      total_shifts_count: 1,
      trend: [],
      currency: 'THB',
      locale: 'th-TH',
    };
    service.getCostsSummary.mockResolvedValue(mockSummary);

    const result = await controller.getSummary('std_123', query);

    expect(service.getCostsSummary).toHaveBeenCalledWith('std_123', query);
    expect(result).toEqual(mockSummary);
  });

  it('gets paginated list of shows with costs from the service', async () => {
    const { controller, service } = buildController();
    service.getCostsShows.mockResolvedValue({
      items: [{ id: 'show_1' }] as any,
      total: 1,
    });

    const result = await controller.listShows('std_123', showsQuery);

    expect(service.getCostsShows).toHaveBeenCalledWith('std_123', showsQuery);
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

  it('gets paginated list of shifts with costs from the service', async () => {
    const { controller, service } = buildController();
    service.getCostsShifts.mockResolvedValue({
      items: [{ id: 'shift_1' }] as any,
      total: 1,
    });

    const result = await controller.listShifts('std_123', shiftsQuery);

    expect(service.getCostsShifts).toHaveBeenCalledWith('std_123', shiftsQuery);
    expect(result).toEqual({
      data: [{ id: 'shift_1' }],
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
