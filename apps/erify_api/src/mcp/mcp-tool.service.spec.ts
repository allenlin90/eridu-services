import { HttpException } from '@nestjs/common';

import { TASK_STATUS, TASK_TYPE } from '@eridu/api-types/task-management';

import { McpToolService } from './mcp-tool.service';

describe('mcpToolService', () => {
  const policy = {
    assertStudioAllowed: jest.fn((studioId: string) => studioId),
  };
  const taskOrchestrationService = {
    getStudioShow: jest.fn(),
  };
  const taskService = {
    findOne: jest.fn(),
    findByUidWithRelationsAdmin: jest.fn(),
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
});
