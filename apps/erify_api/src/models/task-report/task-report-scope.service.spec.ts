import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import {
  TASK_REPORT_DATE_PRESET,
  taskReportPreflightRequestSchema,
} from '@eridu/api-types/task-management';

import { TaskReportScopeRepository } from './task-report-scope.repository';
import { TaskReportScopeService } from './task-report-scope.service';

describe('taskReportScopeService', () => {
  let service: TaskReportScopeService;
  let repository: jest.Mocked<TaskReportScopeRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskReportScopeService,
        {
          provide: TaskReportScopeRepository,
          useValue: {
            countShowsInScope: jest.fn(),
            countSubmittedTasksInScope: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TaskReportScopeService);
    repository = module.get(TaskReportScopeRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns preflight counts and within_limit true when task count is under default limit', async () => {
    repository.countShowsInScope.mockResolvedValue(5);
    repository.countSubmittedTasksInScope.mockResolvedValue(9999);

    const result = await service.preflight('std_123', {
      scope: {
        show_ids: ['show_1'],
        submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
      },
    });

    expect(result).toEqual({
      show_count: 5,
      task_count: 9999,
      within_limit: true,
      limit: 10000,
    });
  });

  it('returns within_limit false when task count exceeds default limit', async () => {
    repository.countShowsInScope.mockResolvedValue(5);
    repository.countSubmittedTasksInScope.mockResolvedValue(10001);

    const result = await service.preflight('std_123', {
      scope: {
        show_type_id: 'sht_1',
        submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
      },
    });

    expect(result.within_limit).toBe(false);
    expect(result.limit).toBe(10000);
  });

  it('resolves date_preset and passes date range filters to repository', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-17T08:00:00.000Z'));
    repository.countShowsInScope.mockResolvedValue(1);
    repository.countSubmittedTasksInScope.mockResolvedValue(2);

    await service.preflight(
      'std_123',
      taskReportPreflightRequestSchema.parse({
        scope: {
          date_preset: TASK_REPORT_DATE_PRESET.THIS_WEEK,
          submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
        },
      }),
    );

    // 2026-03-17 08:00 UTC is Tuesday in all practical server timezones
    // → week starts Monday 2026-03-16, ends Sunday 2026-03-22
    const callArgs = repository.countShowsInScope.mock.calls[0]?.[1];
    expect(callArgs?.dateFrom).toBeInstanceOf(Date);
    expect(callArgs?.dateTo).toBeInstanceOf(Date);
    expect(callArgs?.dateFrom?.getDate()).toBe(16);   // Monday 2026-03-16
    expect(callArgs?.dateFrom?.getHours()).toBe(0);
    expect(callArgs?.dateTo?.getDate()).toBe(22);     // Sunday 2026-03-22
    expect(callArgs?.dateTo?.getHours()).toBe(23);

    jest.useRealTimers();
  });

  it('uses local day boundaries for explicit date_from/date_to scope', async () => {
    repository.countShowsInScope.mockResolvedValue(1);
    repository.countSubmittedTasksInScope.mockResolvedValue(2);

    await service.preflight(
      'std_123',
      taskReportPreflightRequestSchema.parse({
        scope: {
          date_from: '2026-03-10',
          date_to: '2026-03-11',
          submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
        },
      }),
    );

    const callArgs = repository.countShowsInScope.mock.calls[0]?.[1];
    expect(callArgs?.dateFrom?.getFullYear()).toBe(2026);
    expect(callArgs?.dateFrom?.getMonth()).toBe(2);
    expect(callArgs?.dateFrom?.getDate()).toBe(10);
    expect(callArgs?.dateFrom?.getHours()).toBe(0);
    expect(callArgs?.dateTo?.getFullYear()).toBe(2026);
    expect(callArgs?.dateTo?.getMonth()).toBe(2);
    expect(callArgs?.dateTo?.getDate()).toBe(11);
    expect(callArgs?.dateTo?.getHours()).toBe(23);
    expect(callArgs?.dateTo?.getMinutes()).toBe(59);
  });
});
