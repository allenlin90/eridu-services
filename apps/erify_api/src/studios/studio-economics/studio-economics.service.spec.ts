import { computeMcCost, StudioEconomicsService } from './studio-economics.service';

describe('studioEconomicsService.computeMcCost', () => {
  it('uses commission rate fields for COMMISSION compensation', () => {
    const cost = computeMcCost(
      [
        {
          compensationType: 'COMMISSION',
          agreedRate: '500.00',
          commissionRate: '10.00',
          mc: {
            defaultRateType: 'COMMISSION',
            defaultRate: '999.00',
            defaultCommissionRate: '5.00',
          },
        },
      ] as never,
      1000,
    );

    expect(cost).toBe(100);
  });

  it('falls back to MC default commission rate when assignment commission is missing', () => {
    const cost = computeMcCost(
      [
        {
          compensationType: 'COMMISSION',
          agreedRate: null,
          commissionRate: null,
          mc: {
            defaultRateType: 'COMMISSION',
            defaultRate: '200.00',
            defaultCommissionRate: '7.50',
          },
        },
      ] as never,
      2000,
    );

    expect(cost).toBe(150);
  });

  it('adds fixed and commission components for HYBRID compensation', () => {
    const cost = computeMcCost(
      [
        {
          compensationType: 'HYBRID',
          agreedRate: '300.00',
          commissionRate: '5.00',
          mc: {
            defaultRateType: 'HYBRID',
            defaultRate: '100.00',
            defaultCommissionRate: '1.00',
          },
        },
      ] as never,
      1000,
    );

    expect(cost).toBe(350);
  });

  it('falls back to StudioMc defaults before MC defaults', () => {
    const cost = computeMcCost(
      [
        {
          mcId: BigInt(1),
          compensationType: null,
          agreedRate: null,
          commissionRate: null,
          mc: {
            defaultRateType: 'FIXED',
            defaultRate: '200.00',
            defaultCommissionRate: '5.00',
          },
        },
      ] as never,
      1000,
      new Map([
        [BigInt(1), {
          mcId: BigInt(1),
          defaultRateType: 'FIXED',
          defaultRate: '300.00',
          defaultCommissionRate: '10.00',
        }],
      ]) as never,
    );

    expect(cost).toBe(300);
  });
});

describe('studioEconomicsService.getPnlView', () => {
  it('allocates total shift cost pro-rata by show count per group', async () => {
    const service = new StudioEconomicsService(
      { getShowById: jest.fn() } as never,
      {
        findByStudioAndDateRange: jest.fn().mockResolvedValue([
          { id: BigInt(1), uid: 'show_1', studioId: BigInt(100), scheduleId: BigInt(10), clientId: null, name: 'S1', Schedule: { uid: 'sch_10' }, client: null },
          { id: BigInt(2), uid: 'show_2', studioId: BigInt(100), scheduleId: BigInt(10), clientId: null, name: 'S2', Schedule: { uid: 'sch_10' }, client: null },
          { id: BigInt(3), uid: 'show_3', studioId: BigInt(100), scheduleId: BigInt(20), clientId: null, name: 'S3', Schedule: { uid: 'sch_20' }, client: null },
        ]),
      } as never,
      {
        findMany: jest.fn().mockResolvedValue([]),
      } as never,
      {
        findByShowIds: jest.fn().mockResolvedValue([
          { showId: BigInt(1), gmv: '100.00' },
          { showId: BigInt(2), gmv: '100.00' },
          { showId: BigInt(3), gmv: '100.00' },
        ]),
      } as never,
      { findDefaultsByStudioIdAndMcIds: jest.fn().mockResolvedValue([]) } as never,
      { findByShowWindow: jest.fn().mockResolvedValue([{ calculatedCost: null, projectedCost: '300.00' }]) } as never,
    );

    const result = await service.getPnlView(
      'std_1',
      'schedule',
      new Date('2026-03-07T00:00:00.000Z'),
      new Date('2026-03-08T00:00:00.000Z'),
    );

    const schedule10 = result.items.find((i) => i.group_id === 'sch_10');
    const schedule20 = result.items.find((i) => i.group_id === 'sch_20');

    expect(schedule10?.show_count).toBe(2);
    expect(schedule10?.total_shift_cost).toBe('200.00');
    expect(schedule20?.show_count).toBe(1);
    expect(schedule20?.total_shift_cost).toBe('100.00');
    expect(result.summary.total_shift_cost).toBe('300.00');
  });
});

describe('studioEconomicsService.getShowEconomics', () => {
  it('uses block-window overlap query for shift cost aggregation', async () => {
    const studioShiftRepository = {
      findByShowWindow: jest.fn(),
      findByStudioAndBlockWindow: jest.fn().mockResolvedValue([
        { calculatedCost: null, projectedCost: '120.00' },
      ]),
    };

    const service = new StudioEconomicsService(
      {
        getShowById: jest.fn().mockResolvedValue({
          id: BigInt(1),
          uid: 'show_1',
          startTime: new Date('2026-03-07T12:00:00.000Z'),
          endTime: new Date('2026-03-07T14:00:00.000Z'),
          studioId: BigInt(100),
          studio: { uid: 'std_1' },
        }),
      } as never,
      { findByStudioAndDateRange: jest.fn() } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      { findByShow: jest.fn().mockResolvedValue([]) } as never,
      { findDefaultsByStudioIdAndMcIds: jest.fn().mockResolvedValue([]) } as never,
      studioShiftRepository as never,
    );

    const result = await service.getShowEconomics('std_1', 'show_1');

    expect(result.shift_cost).toBe('120.00');
    expect(studioShiftRepository.findByStudioAndBlockWindow).toHaveBeenCalledWith({
      studioUid: 'std_1',
      start: new Date('2026-03-07T12:00:00.000Z'),
      end: new Date('2026-03-07T14:00:00.000Z'),
    });
    expect(studioShiftRepository.findByShowWindow).not.toHaveBeenCalled();
  });
});
