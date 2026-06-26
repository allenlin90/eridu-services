import { HttpException } from '@nestjs/common';

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

  it('loads a studio-scoped show through the existing task orchestration service', async () => {
    taskOrchestrationService.getStudioShow.mockResolvedValue({
      id: 'show_123',
      name: 'Morning show',
    });

    const result = await createService().getShow({
      studio_id: 'std_123',
      show_id: 'show_123',
    });

    expect(policy.assertStudioAllowed).toHaveBeenCalledWith('std_123');
    expect(taskOrchestrationService.getStudioShow).toHaveBeenCalledWith('std_123', 'show_123');
    expect(result).toEqual({
      id: 'show_123',
      name: 'Morning show',
    });
  });

  it('loads task details only after verifying the task belongs to the studio', async () => {
    taskService.findOne.mockResolvedValue({ uid: 'task_123' });
    taskService.findByUidWithRelationsAdmin.mockResolvedValue({
      id: 'task_123',
      description: 'Review stream',
    });

    const result = await createService().getTask({
      studio_id: 'std_123',
      task_id: 'task_123',
    });

    expect(taskService.findOne).toHaveBeenCalledWith({
      uid: 'task_123',
      studio: { uid: 'std_123' },
      deletedAt: null,
    });
    expect(taskService.findByUidWithRelationsAdmin).toHaveBeenCalledWith('task_123');
    expect(result).toEqual({ id: 'task_123', description: 'Review stream' });
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
