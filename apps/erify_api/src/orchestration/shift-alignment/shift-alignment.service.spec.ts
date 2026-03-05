import { ShiftAlignmentService } from './shift-alignment.service';

import type { ShowService } from '@/models/show/show.service';
import type { StudioService } from '@/models/studio/studio.service';
import type { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import type { TaskService } from '@/models/task/task.service';

describe('shiftAlignmentService', () => {
  let service: ShiftAlignmentService;
  let studioService: jest.Mocked<StudioService>;
  let studioShiftService: jest.Mocked<StudioShiftService>;
  let showService: jest.Mocked<ShowService>;
  let taskService: jest.Mocked<TaskService>;

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

    taskService = {
      findTasksByShowIds: jest.fn(),
    } as never;

    service = new ShiftAlignmentService(studioService, studioShiftService, showService, taskService);
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

  it('should report duty-manager and task-readiness risks for upcoming shows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-05T04:00:00.000Z'));
    studioService.findByUid.mockResolvedValue({ id: BigInt(1), uid: 'std_1' } as never);

    studioShiftService.findShiftsInWindow.mockResolvedValue([
      {
        uid: 'ssh_dm_1',
        status: 'SCHEDULED',
        isDutyManager: true,
        user: { uid: 'user_1', name: 'Duty' },
        blocks: [
          {
            uid: 'ssb_1',
            startTime: new Date('2026-03-05T06:00:00.000Z'),
            endTime: new Date('2026-03-05T08:00:00.000Z'),
          },
        ],
      },
    ] as never);

    showService.findMany.mockResolvedValue([
      {
        id: BigInt(11),
        uid: 'show_1',
        name: 'Covered Show',
        startTime: new Date('2026-03-05T06:30:00.000Z'),
        endTime: new Date('2026-03-05T07:30:00.000Z'),
        showStandard: { name: 'standard' },
      },
      {
        id: BigInt(12),
        uid: 'show_2',
        name: 'No Duty Manager',
        startTime: new Date('2026-03-05T09:00:00.000Z'),
        endTime: new Date('2026-03-05T10:00:00.000Z'),
        showStandard: { name: 'premium' },
      },
    ] as never);

    taskService.findTasksByShowIds.mockResolvedValue([
      {
        uid: 'task_setup_show_1',
        type: 'SETUP',
        assigneeId: BigInt(100),
        description: 'Setup lighting',
        template: { name: 'Setup checklist' },
        targets: [
          { showId: BigInt(11), targetType: 'SHOW', deletedAt: null },
        ],
      },
      {
        uid: 'task_active_show_1',
        type: 'ACTIVE',
        assigneeId: BigInt(100),
        description: 'On air support',
        template: { name: 'Active checklist' },
        targets: [
          { showId: BigInt(11), targetType: 'SHOW', deletedAt: null },
        ],
      },
      {
        uid: 'task_closure_show_1',
        type: 'CLOSURE',
        assigneeId: BigInt(100),
        description: 'Closure checklist',
        template: { name: 'Closure checklist' },
        targets: [
          { showId: BigInt(11), targetType: 'SHOW', deletedAt: null },
        ],
      },
      {
        uid: 'task_setup_show_2',
        type: 'SETUP',
        assigneeId: null,
        description: 'Setup only',
        template: { name: 'Setup checklist' },
        targets: [
          { showId: BigInt(12), targetType: 'SHOW', deletedAt: null },
        ],
      },
    ] as never);

    const result = await service.getAlignment('std_1', {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-05'),
      includeCancelled: false,
    });

    expect(result.summary.shows_checked).toBe(2);
    expect(result.summary.shows_without_duty_manager_count).toBe(1);
    expect(result.summary.shows_with_unassigned_tasks_count).toBe(1);
    expect(result.summary.shows_missing_required_tasks_count).toBe(1);
    expect(result.summary.premium_shows_missing_moderation_count).toBe(1);
    expect(result.summary.risk_show_count).toBe(1);
    expect(result.duty_manager_missing_shows[0]).toEqual(expect.objectContaining({
      show_id: 'show_2',
    }));
    expect(result.task_readiness_warnings[0]).toEqual(expect.objectContaining({
      show_id: 'show_2',
      missing_required_task_types: ['ACTIVE', 'CLOSURE'],
      missing_moderation_task: true,
    }));
  });

  it('should map pre-6am shows to previous operational day and skip passed shows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-05T05:00:00.000Z'));
    studioService.findByUid.mockResolvedValue({ id: BigInt(1), uid: 'std_1' } as never);
    studioShiftService.findShiftsInWindow.mockResolvedValue([] as never);
    showService.findMany.mockResolvedValue([
      {
        id: BigInt(20),
        uid: 'show_midnight',
        name: 'Midnight Show',
        startTime: new Date('2026-03-06T02:00:00.000Z'),
        endTime: new Date('2026-03-06T03:00:00.000Z'),
        showStandard: { name: 'standard' },
      },
      {
        id: BigInt(21),
        uid: 'show_past',
        name: 'Past Show',
        startTime: new Date('2026-03-05T01:00:00.000Z'),
        endTime: new Date('2026-03-05T02:00:00.000Z'),
        showStandard: { name: 'standard' },
      },
    ] as never);
    taskService.findTasksByShowIds.mockResolvedValue([] as never);

    const result = await service.getAlignment('std_1', {
      dateFrom: new Date('2026-03-05'),
      dateTo: new Date('2026-03-06'),
      includeCancelled: false,
    });

    expect(result.summary.shows_checked).toBe(1);
    expect(result.summary.operational_days_checked).toBe(1);
    expect(result.duty_manager_missing_shows[0].operational_day).toBe('2026-03-05');
  });
});
