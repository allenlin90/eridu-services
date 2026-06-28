import { HttpException } from '@nestjs/common';
import { ZodError } from 'zod';

import { TASK_STATUS, TASK_TYPE } from '@eridu/api-types/task-management';

import { McpToolService } from './mcp-tool.service';

describe('mcpToolService', () => {
  const policy = {
    assertStudioAllowed: jest.fn((studioId: string) => studioId),
  };
  const taskOrchestrationService = {
    getStudioShow: jest.fn(),
    getStudioShowsWithTaskSummary: jest.fn(),
  };
  const taskService = {
    findOne: jest.fn(),
    findByUidWithRelationsAdmin: jest.fn(),
    findTasksForMcp: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createService() {
    return new McpToolService(
      policy as never,
      taskOrchestrationService as never,
      taskService as never,
    );
  }

  // Mirrors the raw Prisma row shape (BigInt ids, internal FKs) that the
  // underlying service/repository methods actually return.
  function rawShow() {
    return {
      id: 9001n,
      uid: 'show_123',
      clientId: 1n,
      studioId: 1n,
      studioRoomId: null,
      showTypeId: 1n,
      showStatusId: 1n,
      showStandardId: 1n,
      name: 'Morning show',
      startTime: new Date('2026-06-28T01:00:00.000Z'),
      endTime: new Date('2026-06-28T02:00:00.000Z'),
      metadata: {},
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      deletedAt: null,
    };
  }

  function rawTask() {
    return {
      id: 5001n,
      uid: 'task_123',
      studioId: 1n,
      templateId: null,
      snapshotId: 7001n,
      assigneeId: null,
      description: 'Review stream',
      status: TASK_STATUS.PENDING,
      type: TASK_TYPE.OTHER,
      dueDate: null,
      completedAt: null,
      content: {},
      metadata: {},
      version: 1,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      deletedAt: null,
    };
  }

  it('loads a studio-scoped show through the existing task orchestration service and strips internal ids', async () => {
    taskOrchestrationService.getStudioShow.mockResolvedValue(rawShow());

    const result = await createService().getShow({
      studio_id: 'std_123',
      show_id: 'show_123',
    }) as Record<string, unknown>;

    expect(policy.assertStudioAllowed).toHaveBeenCalledWith('std_123');
    expect(taskOrchestrationService.getStudioShow).toHaveBeenCalledWith('std_123', 'show_123');
    expect(result.id).toBe('show_123');
    expect(result.name).toBe('Morning show');
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(JSON.stringify(result)).not.toMatch(/studio_id_internal|clientId|studioId/);
  });

  it('loads task details only after verifying the task belongs to the studio, and strips internal ids', async () => {
    taskService.findOne.mockResolvedValue({ uid: 'task_123' });
    taskService.findByUidWithRelationsAdmin.mockResolvedValue(rawTask());

    const result = await createService().getTask({
      studio_id: 'std_123',
      task_id: 'task_123',
    }) as Record<string, unknown>;

    expect(taskService.findOne).toHaveBeenCalledWith({
      uid: 'task_123',
      studio: { uid: 'std_123' },
      deletedAt: null,
    });
    expect(taskService.findByUidWithRelationsAdmin).toHaveBeenCalledWith('task_123');
    expect(result.id).toBe('task_123');
    expect(result.description).toBe('Review stream');
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('throws not found when the task is outside the studio scope', async () => {
    taskService.findOne.mockResolvedValue(null);

    await expect(createService().getTask({
      studio_id: 'std_123',
      task_id: 'task_123',
    })).rejects.toBeInstanceOf(HttpException);

    expect(taskService.findByUidWithRelationsAdmin).not.toHaveBeenCalled();
  });

  it('queries shows for a studio by date range and applies pagination', async () => {
    taskOrchestrationService.getStudioShowsWithTaskSummary.mockResolvedValue({ data: [rawShow()], total: 1 });

    const result = await createService().queryShows({
      studio_id: 'std_123',
      date_from: '2026-06-01T00:00:00Z',
      date_to: '2026-06-30T00:00:00Z',
      page: 2,
      limit: 10,
    }) as any;

    expect(policy.assertStudioAllowed).toHaveBeenCalledWith('std_123');
    expect(taskOrchestrationService.getStudioShowsWithTaskSummary).toHaveBeenCalledWith('std_123', {
      page: 2,
      limit: 10,
      take: 10,
      skip: 10,
      sort: 'desc',
      date_from: '2026-06-01T00:00:00Z',
      date_to: '2026-06-30T00:00:00Z',
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('resolves operational show dates before querying shows', async () => {
    taskOrchestrationService.getStudioShowsWithTaskSummary.mockResolvedValue({ data: [rawShow()], total: 1 });

    await createService().queryShows({
      studio_id: 'std_123',
      operational_date: '2026-06-28',
      page: 1,
      limit: 10,
    });

    expect(taskOrchestrationService.getStudioShowsWithTaskSummary).toHaveBeenCalledWith('std_123', expect.objectContaining({
      date_from: '2026-06-27T23:00:00.000Z',
      date_to: '2026-06-28T22:59:59.999Z',
    }));
  });

  it('rejects ambiguous explicit and operational show date inputs', async () => {
    await expect(createService().queryShows({
      studio_id: 'std_123',
      date_from: '2026-06-28T00:00:00Z',
      date_preset: 'today',
    })).rejects.toBeInstanceOf(ZodError);

    expect(taskOrchestrationService.getStudioShowsWithTaskSummary).not.toHaveBeenCalled();
  });

  it('queries tasks for a studio by completedAt/dueDate range and maps to taskWithRelationsDto', async () => {
    taskService.findTasksForMcp.mockResolvedValue([rawTask()]);

    const result = await createService().queryTasks({
      studio_id: 'std_123',
      completed_at_from: '2026-06-01T00:00:00Z',
      completed_at_to: '2026-06-30T00:00:00Z',
      status: 'COMPLETED',
      type: ['SETUP'],
      page: 1,
      limit: 5,
    }) as any[];

    expect(policy.assertStudioAllowed).toHaveBeenCalledWith('std_123');
    expect(taskService.findTasksForMcp).toHaveBeenCalledWith('std_123', {
      completedAtFrom: new Date('2026-06-01T00:00:00Z'),
      completedAtTo: new Date('2026-06-30T00:00:00Z'),
      dueDateFrom: undefined,
      dueDateTo: undefined,
      status: ['COMPLETED'],
      type: ['SETUP'],
      skip: 0,
      take: 5,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task_123');
  });

  it('throws bad request when date strings are invalid', async () => {
    await expect(createService().queryTasks({
      studio_id: 'std_123',
      completed_at_from: 'invalid-date',
    })).rejects.toBeInstanceOf(ZodError);

    await expect(createService().queryShows({
      studio_id: 'std_123',
      date_from: 'invalid-date',
    })).rejects.toBeInstanceOf(ZodError);
  });

  it('uses default page=1 and limit=20 in queryShows and queryTasks', async () => {
    taskOrchestrationService.getStudioShowsWithTaskSummary.mockResolvedValue({ data: [], total: 0 });
    taskService.findTasksForMcp.mockResolvedValue([]);

    await createService().queryShows({ studio_id: 'std_123' });
    await createService().queryTasks({ studio_id: 'std_123' });

    expect(taskOrchestrationService.getStudioShowsWithTaskSummary).toHaveBeenCalledWith('std_123', expect.objectContaining({
      page: 1,
      limit: 20,
      take: 20,
      skip: 0,
    }));

    expect(taskService.findTasksForMcp).toHaveBeenCalledWith('std_123', expect.objectContaining({
      take: 20,
      skip: 0,
    }));
  });
});
