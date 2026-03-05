import { ShiftAlignmentService } from './shift-alignment.service';

import type { ShowService } from '@/models/show/show.service';
import type { StudioService } from '@/models/studio/studio.service';
import type { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

describe('shiftAlignmentService', () => {
  let service: ShiftAlignmentService;
  let studioService: jest.Mocked<StudioService>;
  let studioShiftService: jest.Mocked<StudioShiftService>;
  let showService: jest.Mocked<ShowService>;

  beforeEach(() => {
    studioService = {
      findByUid: jest.fn(),
    } as never;

    studioShiftService = {
      findShiftsInWindow: jest.fn(),
    } as never;

    showService = {
      findMany: jest.fn(),
    } as never;

    service = new ShiftAlignmentService(studioService, studioShiftService, showService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should throw when studio does not exist', async () => {
    studioService.findByUid.mockResolvedValue(null);

    await expect(
      service.getAlignment('std_missing', {
        dateFrom: new Date('2026-03-05'),
        dateTo: new Date('2026-03-06'),
        includeCancelled: false,
      }),
    ).rejects.toThrow('Studio not found');
  });

  it('should report both idle segments and missing shift assignments', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-05T09:00:00.000Z'));
    studioService.findByUid.mockResolvedValue({ id: BigInt(1), uid: 'std_1' } as never);

    studioShiftService.findShiftsInWindow.mockResolvedValue([
      {
        uid: 'ssh_1',
        user: { uid: 'user_1', name: 'Alice' },
        blocks: [
          {
            uid: 'ssb_1',
            startTime: new Date('2026-03-05T10:00:00.000Z'),
            endTime: new Date('2026-03-05T11:00:00.000Z'),
          },
        ],
      },
    ] as never);

    showService.findMany.mockResolvedValue([
      {
        uid: 'show_1',
        name: 'Show With Partial Coverage',
        startTime: new Date('2026-03-05T10:00:00.000Z'),
        endTime: new Date('2026-03-05T12:00:00.000Z'),
        showMCs: [
          {
            mc: {
              user: { uid: 'user_1', name: 'Alice' },
            },
          },
        ],
      },
      {
        uid: 'show_2',
        name: 'Show Without Coverage',
        startTime: new Date('2026-03-05T13:00:00.000Z'),
        endTime: new Date('2026-03-05T14:00:00.000Z'),
        showMCs: [
          {
            mc: {
              user: { uid: 'user_2', name: 'Bob' },
            },
          },
        ],
      },
    ] as never);

    const result = await service.getAlignment('std_1', {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-05'),
      includeCancelled: false,
    });

    expect(result.summary.shows_checked).toBe(2);
    expect(result.summary.assigned_members_checked).toBe(2);
    expect(result.summary.idle_segments_count).toBe(1);
    expect(result.summary.missing_shift_count).toBe(1);
    expect(result.idle_segments[0]).toEqual(expect.objectContaining({
      show_id: 'show_1',
      user_id: 'user_1',
      duration_minutes: 60,
    }));
    expect(result.missing_shift_assignments[0]).toEqual(expect.objectContaining({
      show_id: 'show_2',
      user_id: 'user_2',
    }));
  });

  it('should skip already-ended shows when checking planning coverage', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-05T15:00:00.000Z'));
    studioService.findByUid.mockResolvedValue({ id: BigInt(1), uid: 'std_1' } as never);

    studioShiftService.findShiftsInWindow.mockResolvedValue([
      {
        uid: 'ssh_1',
        user: { uid: 'user_1', name: 'Alice' },
        blocks: [
          {
            uid: 'ssb_1',
            startTime: new Date('2026-03-05T16:00:00.000Z'),
            endTime: new Date('2026-03-05T17:00:00.000Z'),
          },
        ],
      },
    ] as never);

    showService.findMany.mockResolvedValue([
      {
        uid: 'show_past',
        name: 'Past Show',
        startTime: new Date('2026-03-05T10:00:00.000Z'),
        endTime: new Date('2026-03-05T11:00:00.000Z'),
        showMCs: [
          {
            mc: {
              user: { uid: 'user_2', name: 'Bob' },
            },
          },
        ],
      },
      {
        uid: 'show_future',
        name: 'Future Show',
        startTime: new Date('2026-03-05T16:00:00.000Z'),
        endTime: new Date('2026-03-05T17:00:00.000Z'),
        showMCs: [
          {
            mc: {
              user: { uid: 'user_1', name: 'Alice' },
            },
          },
        ],
      },
    ] as never);

    const result = await service.getAlignment('std_1', {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-05'),
      includeCancelled: false,
    });

    expect(result.summary.shows_checked).toBe(1);
    expect(result.summary.assigned_members_checked).toBe(1);
    expect(result.summary.idle_segments_count).toBe(0);
    expect(result.summary.missing_shift_count).toBe(0);
    expect(result.idle_segments).toEqual([]);
    expect(result.missing_shift_assignments).toEqual([]);
  });
});
