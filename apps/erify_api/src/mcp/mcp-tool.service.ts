import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';
import { z } from 'zod';

import {
  resolveMcpCalendarDate,
  resolveMcpOperationalDateRange,
} from './mcp-operational-date-range.util';
import { McpStudioPolicy } from './mcp-studio-policy';

import { HttpError } from '@/lib/errors/http-error.util';
import { showDto } from '@/models/show/schemas/show.schema';
import { taskWithRelationsDto } from '@/models/task/schemas/task.schema';
import { TaskService } from '@/models/task/task.service';
import { TaskOrchestrationService } from '@/task-orchestration/task-orchestration.service';

const MCP_LIST_LIMIT_MAX = 100;

const showScopedSchema = z.object({
  studio_id: z.string().min(1),
  show_id: z.string().min(1),
});

const taskScopedSchema = z.object({
  studio_id: z.string().min(1),
  task_id: z.string().min(1),
});

// Shared with mcp-server.factory.ts's `erify_query_shows` tool registration.
export const queryShowsShape = {
  studio_id: z.string().min(1).describe('The Studio UID (e.g., std_abc123).'),
  date_from: z.iso.date().optional().describe('Filter shows starting on or after this local date (YYYY-MM-DD), assuming UTC+7 timezone and 06:00 operational day start.'),
  date_to: z.iso.date().optional().describe('Filter shows starting on or before this local date (YYYY-MM-DD), assuming UTC+7 timezone and 06:00 operational day start.'),
  search: z.string().optional().describe('Optional search term to filter shows by name.'),
  needs_attention: z.boolean().optional().describe('Filter shows that need attention (e.g., has scheduling warnings).'),
  show_status_name: z.string().optional().describe('Filter shows by status name (e.g., Scheduled, Live, Ended).'),
  creator_name: z.string().optional().describe('Filter shows by creator name.'),
  page: z.number().int().min(1).optional().default(1).describe('Page number for pagination (starts at 1).'),
  limit: z.number().int().min(1).max(MCP_LIST_LIMIT_MAX).optional().default(20).describe('Maximum number of shows to return (default 20, maximum 100).'),
};

const queryShowsSchema = z
  .object(queryShowsShape)
  .superRefine((data, ctx) => {
    if (data.date_from && data.date_to && new Date(data.date_to).getTime() < new Date(data.date_from).getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['date_to'],
        message: 'date_to must be after or equal to date_from',
      });
    }
  });

// Shared with mcp-server.factory.ts's `erify_query_tasks` tool registration.
export const queryTasksShape = {
  studio_id: z.string().min(1).describe('The Studio UID (e.g., std_abc123).'),
  completed_at_from: z.iso.date().optional().describe('Filter tasks completed on or after this local date (YYYY-MM-DD), assuming UTC+7 timezone.'),
  completed_at_to: z.iso.date().optional().describe('Filter tasks completed on or before this local date (YYYY-MM-DD), assuming UTC+7 timezone.'),
  due_date_from: z.iso.date().optional().describe('Filter tasks due on or after this local date (YYYY-MM-DD), assuming UTC+7 timezone.'),
  due_date_to: z.iso.date().optional().describe('Filter tasks due on or before this local date (YYYY-MM-DD), assuming UTC+7 timezone.'),
  status: z
    .union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional()
    .describe('Filter by task status(es) (e.g., COMPLETED, PENDING, REVIEW).'),
  type: z
    .union([z.nativeEnum(TaskType), z.array(z.nativeEnum(TaskType))])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional()
    .describe('Filter by task type(s) (e.g., SETUP, ACTIVE, CLOSURE).'),
  page: z.number().int().min(1).optional().default(1).describe('Page number for pagination (starts at 1).'),
  limit: z.number().int().min(1).max(MCP_LIST_LIMIT_MAX).optional().default(20).describe('Maximum number of tasks to return (default 20, maximum 100).'),
};

const queryTasksSchema = z.object(queryTasksShape);

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
    const dateRange = resolveMcpOperationalDateRange({
      dateFrom: parsed.date_from,
      dateTo: parsed.date_to,
    });

    const transformedQuery = {
      page,
      limit,
      take: limit,
      skip: (page - 1) * limit,
      sort: 'desc' as const,
      search: parsed.search,
      date_from: dateRange.dateFrom,
      date_to: dateRange.dateTo,
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

    const completedAtFrom = parsed.completed_at_from ? resolveMcpCalendarDate(parsed.completed_at_from, false) : undefined;
    const completedAtTo = parsed.completed_at_to ? resolveMcpCalendarDate(parsed.completed_at_to, true) : undefined;
    const dueDateFrom = parsed.due_date_from ? resolveMcpCalendarDate(parsed.due_date_from, false) : undefined;
    const dueDateTo = parsed.due_date_to ? resolveMcpCalendarDate(parsed.due_date_to, true) : undefined;

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
