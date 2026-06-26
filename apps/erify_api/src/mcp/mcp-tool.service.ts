import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { McpStudioPolicy } from './mcp-studio-policy';

import { HttpError } from '@/lib/errors/http-error.util';
import { TaskService } from '@/models/task/task.service';
import { TaskOrchestrationService } from '@/task-orchestration/task-orchestration.service';

const showScopedSchema = z.object({
  studio_id: z.string().min(1),
  show_id: z.string().min(1),
});

const taskScopedSchema = z.object({
  studio_id: z.string().min(1),
  task_id: z.string().min(1),
});

type ShowScopedInput = z.input<typeof showScopedSchema>;
type TaskScopedInput = z.input<typeof taskScopedSchema>;

@Injectable()
export class McpToolService {
  constructor(
    private readonly studioPolicy: McpStudioPolicy,
    private readonly taskOrchestrationService: TaskOrchestrationService,
    private readonly taskService: TaskService,
  ) {}

  async getShow(input: ShowScopedInput): Promise<unknown> {
    const parsed = showScopedSchema.parse(input);
    const studioId = this.studioPolicy.assertStudioAllowed(parsed.studio_id);
    return this.taskOrchestrationService.getStudioShow(studioId, parsed.show_id);
  }

  async getTask(input: TaskScopedInput): Promise<unknown> {
    const parsed = taskScopedSchema.parse(input);
    const studioId = this.studioPolicy.assertStudioAllowed(parsed.studio_id);
    const scoped = await this.taskService.findOne({
      uid: parsed.task_id,
      studio: { uid: studioId },
      deletedAt: null,
    });

    if (!scoped) {
      throw HttpError.notFound('Task', parsed.task_id);
    }

    const task = await this.taskService.findByUidWithRelationsAdmin(parsed.task_id);
    if (!task) {
      throw HttpError.notFound('Task', parsed.task_id);
    }

    return task;
  }
}
