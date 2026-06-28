import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';
import { z } from 'zod';

import { McpStudioPolicy } from './mcp-studio-policy';

import { HttpError } from '@/lib/errors/http-error.util';
import { showDto } from '@/models/show/schemas/show.schema';
import { taskWithRelationsDto } from '@/models/task/schemas/task.schema';
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

const queryShowsSchema = z.object({
  studio_id: z.string().min(1),
  date_from: z.iso.datetime().optional(),
  date_to: z.iso.datetime().optional(),
  search: z.string().optional(),
  needs_attention: z.boolean().optional(),
  show_status_name: z.string().optional(),
  creator_name: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
});

const queryTasksSchema = z.object({
  studio_id: z.string().min(1),
  completed_at_from: z.iso.datetime().optional(),
  completed_at_to: z.iso.datetime().optional(),
  due_date_from: z.iso.datetime().optional(),
  due_date_to: z.iso.datetime().optional(),
  status: z
    .union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  type: z
    .union([z.nativeEnum(TaskType), z.array(z.nativeEnum(TaskType))])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).optional().default(20),
});

type ShowScopedInput = z.input<typeof showScopedSchema>;
type TaskScopedInput = z.input<typeof taskScopedSchema>;
type QueryShowsInput = z.input<typeof queryShowsSchema>;
type QueryTasksInput = z.input<typeof queryTasksSchema>;

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
    const show = await this.taskOrchestrationService.getStudioShow(studioId, parsed.show_id);
    return showDto.parse(show);
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

    return taskWithRelationsDto.parse(task);
  }

  async queryShows(input: QueryShowsInput): Promise<unknown> {
    const parsed = queryShowsSchema.parse(input);
    const studioUid = this.studioPolicy.assertStudioAllowed(parsed.studio_id);

    const page = parsed.page ?? 1;
    const limit = parsed.limit ?? 20;

    const transformedQuery = {
      page,
      limit,
      take: limit,
      skip: (page - 1) * limit,
      sort: 'desc' as const,
      search: parsed.search,
      date_from: parsed.date_from,
      date_to: parsed.date_to,
      needs_attention: parsed.needs_attention,
      show_status_name: parsed.show_status_name,
      creator_name: parsed.creator_name,
    };

    return this.taskOrchestrationService.getStudioShowsWithTaskSummary(
      studioUid,
      transformedQuery,
    );
  }

  async queryTasks(input: QueryTasksInput): Promise<unknown> {
    const parsed = queryTasksSchema.parse(input);
    const studioUid = this.studioPolicy.assertStudioAllowed(parsed.studio_id);

    const completedAtFrom = parsed.completed_at_from ? new Date(parsed.completed_at_from) : undefined;
    const completedAtTo = parsed.completed_at_to ? new Date(parsed.completed_at_to) : undefined;
    const dueDateFrom = parsed.due_date_from ? new Date(parsed.due_date_from) : undefined;
    const dueDateTo = parsed.due_date_to ? new Date(parsed.due_date_to) : undefined;

    const page = parsed.page ?? 1;
    const limit = parsed.limit ?? 20;
    const skip = (page - 1) * limit;

    const tasks = await this.taskService.findTasksForMcp(studioUid, {
      completedAtFrom,
      completedAtTo,
      dueDateFrom,
      dueDateTo,
      status: parsed.status,
      type: parsed.type,
      skip,
      take: limit,
    });

    return tasks.map((t) => taskWithRelationsDto.parse(t));
  }
}
