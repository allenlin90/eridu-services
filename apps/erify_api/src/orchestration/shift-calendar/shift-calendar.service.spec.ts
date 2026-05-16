import { ShiftCalendarService } from './shift-calendar.service';

import type { StudioService } from '@/models/studio/studio.service';
import type { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

describe('shiftCalendarService', () => {
  let service: ShiftCalendarService;
  let studioService: jest.Mocked<StudioService>;
  let studioShiftService: jest.Mocked<StudioShiftService>;

  beforeEach(() => {
    studioService = {
      findByUid: jest.fn(),
    } as never;

    studioShiftService = {
      findShiftsInWindow: jest.fn(),
    } as never;

    service = new ShiftCalendarService(studioService, studioShiftService);
  });

  it('should throw when studio does not exist', async () => {
    studioService.findByUid.mockResolvedValue(null);

    await expect(
      service.getCalendar('std_missing', {
        dateFrom: new Date('2026-03-05'),
        dateTo: new Date('2026-03-06'),
        includeCancelled: true,
      }),
    ).rejects.toThrow('Studio not found');
  });

  it('groups shift segments by day and user with planned totals (no actuals)', async () => {
    studioService.findByUid.mockResolvedValue({ id: BigInt(1), uid: 'std_1' } as never);
    studioShiftService.findShiftsInWindow.mockResolvedValue([
      {
        uid: 'ssh_1',
        status: 'SCHEDULED',
        isDutyManager: true,
        hourlyRate: '20.00',
        user: { uid: 'user_1', name: 'Alice' },
        blocks: [
          {
            uid: 'ssb_1',
            startTime: new Date('2026-03-05T23:00:00.000Z'),
            endTime: new Date('2026-03-06T01:00:00.000Z'),
            actualStartTime: null,
            actualEndTime: null,
          },
        ],
      },
    ] as never);

    const result = await service.getCalendar('std_1', {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-06'),
      includeCancelled: true,
    });

    // Single shift, no actuals → counts as pending and contributes 0 to total_actual_cost.
    expect(result.summary).toEqual({
      shift_count: 1,
      block_count: 1,
      total_hours: 2,
      total_planned_cost: '40.00',
      total_actual_cost: '0.00',
      actual_cost_resolved_shift_count: 0,
      actual_cost_pending_shift_count: 1,
    });
    expect(result.timeline).toHaveLength(2);
    expect(result.timeline[0].date).toBe('2026-03-05');
    expect(result.timeline[1].date).toBe('2026-03-06');
    // Per-shift-per-day rows surface null actual_cost when the shift has no actuals.
    expect(result.timeline[0].users[0].shifts[0].actual_cost).toBeNull();
  });

  it('counts a shift as resolved and contributes to total_actual_cost when every block has complete actuals', async () => {
    studioService.findByUid.mockResolvedValue({ id: BigInt(1), uid: 'std_1' } as never);
    studioShiftService.findShiftsInWindow.mockResolvedValue([
      {
        uid: 'ssh_resolved',
        status: 'COMPLETED',
        isDutyManager: false,
        hourlyRate: '20.00',
        user: { uid: 'user_1', name: 'Alice' },
        blocks: [
          {
            uid: 'ssb_1',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T13:00:00.000Z'),
            actualStartTime: new Date('2026-03-05T09:05:00.000Z'),
            actualEndTime: new Date('2026-03-05T12:35:00.000Z'),
          },
        ],
      },
    ] as never);

    const result = await service.getCalendar('std_1', {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-05'),
      includeCancelled: true,
    });

    // Planned: 4h × 20 = 80.00; Actual: 3.5h × 20 = 70.00.
    expect(result.summary.total_planned_cost).toBe('80.00');
    expect(result.summary.total_actual_cost).toBe('70.00');
    expect(result.summary.actual_cost_resolved_shift_count).toBe(1);
    expect(result.summary.actual_cost_pending_shift_count).toBe(0);
    expect(result.timeline[0].users[0].shifts[0].planned_cost).toBe('80.00');
    expect(result.timeline[0].users[0].shifts[0].actual_cost).toBe('70.00');
  });

  it('treats a shift with any incomplete-actuals block as pending across the whole shift', async () => {
    studioService.findByUid.mockResolvedValue({ id: BigInt(1), uid: 'std_1' } as never);
    studioShiftService.findShiftsInWindow.mockResolvedValue([
      {
        uid: 'ssh_partial',
        status: 'SCHEDULED',
        isDutyManager: false,
        hourlyRate: '20.00',
        user: { uid: 'user_1', name: 'Alice' },
        blocks: [
          {
            uid: 'ssb_1',
            startTime: new Date('2026-03-05T09:00:00.000Z'),
            endTime: new Date('2026-03-05T13:00:00.000Z'),
            actualStartTime: new Date('2026-03-05T09:00:00.000Z'),
            actualEndTime: new Date('2026-03-05T13:00:00.000Z'),
          },
          {
            uid: 'ssb_2',
            startTime: new Date('2026-03-05T14:00:00.000Z'),
            endTime: new Date('2026-03-05T16:00:00.000Z'),
            actualStartTime: new Date('2026-03-05T14:00:00.000Z'),
            actualEndTime: null,
          },
        ],
      },
    ] as never);

    const result = await service.getCalendar('std_1', {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-05'),
      includeCancelled: true,
    });

    expect(result.summary.total_planned_cost).toBe('120.00');
    expect(result.summary.total_actual_cost).toBe('0.00');
    expect(result.summary.actual_cost_resolved_shift_count).toBe(0);
    expect(result.summary.actual_cost_pending_shift_count).toBe(1);
    expect(result.timeline[0].users[0].shifts[0].actual_cost).toBeNull();
  });

  it('pro-rates a cross-midnight block by each day-segment\'s share of the planned window', async () => {
    studioService.findByUid.mockResolvedValue({ id: BigInt(1), uid: 'std_1' } as never);
    // Planned 23:00 → 03:00 (4h): day 1 gets 1h, day 2 gets 3h.
    // Actual 23:00 → 02:00 (3h): proportionally day 1 gets 0.75h ($15), day 2 gets 2.25h ($45).
    studioShiftService.findShiftsInWindow.mockResolvedValue([
      {
        uid: 'ssh_xmidnight',
        status: 'COMPLETED',
        isDutyManager: false,
        hourlyRate: '20.00',
        user: { uid: 'user_1', name: 'Alice' },
        blocks: [
          {
            uid: 'ssb_1',
            startTime: new Date('2026-03-05T23:00:00.000Z'),
            endTime: new Date('2026-03-06T03:00:00.000Z'),
            actualStartTime: new Date('2026-03-05T23:00:00.000Z'),
            actualEndTime: new Date('2026-03-06T02:00:00.000Z'),
          },
        ],
      },
    ] as never);

    const result = await service.getCalendar('std_1', {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-06'),
      includeCancelled: true,
    });

    expect(result.summary.total_planned_cost).toBe('80.00');
    expect(result.summary.total_actual_cost).toBe('60.00');

    const day1 = result.timeline.find((d) => d.date === '2026-03-05')!;
    const day2 = result.timeline.find((d) => d.date === '2026-03-06')!;
    expect(day1.users[0].shifts[0].actual_cost).toBe('15.00');
    expect(day2.users[0].shifts[0].actual_cost).toBe('45.00');
  });
});
