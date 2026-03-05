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

  it('should group shift segments by day and user with summary totals', async () => {
    studioService.findByUid.mockResolvedValue({ id: BigInt(1), uid: 'std_1' } as never);
    studioShiftService.findShiftsInWindow.mockResolvedValue([
      {
        uid: 'ssh_1',
        status: 'SCHEDULED',
        isDutyManager: true,
        hourlyRate: '20.00',
        projectedCost: '40.00',
        calculatedCost: null,
        user: { uid: 'user_1', name: 'Alice' },
        blocks: [
          {
            uid: 'ssb_1',
            startTime: new Date('2026-03-05T23:00:00.000Z'),
            endTime: new Date('2026-03-06T01:00:00.000Z'),
          },
        ],
      },
    ] as never);

    const result = await service.getCalendar('std_1', {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-06'),
      includeCancelled: true,
    });

    expect(result.summary).toEqual({
      shift_count: 1,
      block_count: 1,
      total_hours: 2,
      total_projected_cost: '40.00',
      total_calculated_cost: '0.00',
    });
    expect(result.timeline).toHaveLength(2);
    expect(result.timeline[0].date).toBe('2026-03-05');
    expect(result.timeline[1].date).toBe('2026-03-06');
  });
});
