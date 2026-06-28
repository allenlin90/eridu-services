import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';
import { z } from 'zod';

import {
  DEFAULT_MCP_OPERATIONAL_DAY_START_HOUR,
  DEFAULT_MCP_TIMEZONE_OFFSET_MINUTES,
  resolveMcpOperationalDateRange,
} from './mcp-operational-date-range.util';
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

// Shared with mcp-server.factory.ts's `erify_query_shows` tool registration so
// the MCP SDK's protocol-level argument validation and this service's
// queryShowsSchema can never drift on field types/constraints. The MCP SDK's
// registerTool only accepts a raw ZodRawShape (not a refined ZodObject), so
// the cross-field rules below stay service-side only.
export const queryShowsShape = {
  studio_id: z.string().min(1).describe('The Studio UID (e.g., std_abc123).'),
  date_from: z.iso.datetime().optional().describe('Explicit ISO-8601 date-time lower bound for show start_time. Use together with date_to only when the user provides exact boundaries. Do not combine with date_preset or operational_date.'),
  date_to: z.iso.datetime().optional().describe('Explicit ISO-8601 date-time upper bound for show start_time. Use together with date_from only when the user provides exact boundaries. Do not combine with date_preset or operational_date.'),
  operational_date: z.iso.date().optional().describe('YYYY-MM-DD local operational date. The server resolves it to 06:00 on this date through 05:59:59.999 the next day using timezone_offset_minutes, default GMT+7. Use this for requests like "shows on June 28".'),
  date_preset: z.enum(['today', 'yesterday', 'tomorrow']).optional().describe('Relative operational date. Prefer this for user requests like "shows today". The server resolves the date using timezone_offset_minutes, default GMT+7, then applies the 06:00 operational-day boundary.'),
  timezone_offset_minutes: z.number().int().min(-12 * 60).max(14 * 60).optional().default(DEFAULT_MCP_TIMEZONE_OFFSET_MINUTES).describe('User timezone offset from UTC in minutes. Default is 420 for GMT+7 / Asia/Bangkok. Example: 420 means UTC+07:00.'),
  operational_day_start_hour: z.number().int().min(0).max(23).optional().default(DEFAULT_MCP_OPERATIONAL_DAY_START_HOUR).describe('Local hour when the operational day starts. Default is 6, meaning 06:00 local time.'),
  search: z.string().optional().describe('Optional search term to filter shows by name.'),
  needs_attention: z.boolean().optional().describe('Filter shows that need attention (e.g., has scheduling warnings).'),
  show_status_name: z.string().optional().describe('Filter shows by status name (e.g., Scheduled, Live, Ended).'),
  creator_name: z.string().optional().describe('Filter shows by creator name.'),
  page: z.number().int().min(1).optional().default(1).describe('Page number for pagination (starts at 1).'),
  limit: z.number().int().min(1).optional().default(20).describe('Maximum number of shows to return (default 20).'),
};

const queryShowsSchema = z
  .object(queryShowsShape)
  .superRefine((data, ctx) => {
    const hasExplicitRange = Boolean(data.date_from || data.date_to);
    const hasOperationalRange = Boolean(data.operational_date || data.date_preset);

    if (hasExplicitRange && hasOperationalRange) {
      ctx.addIssue({
        code: 'custom',
        path: ['date_from'],
        message: 'Use either explicit date_from/date_to or operational_date/date_preset, not both',
      });
    }

    if (data.operational_date && data.date_preset) {
      ctx.addIssue({
        code: 'custom',
        path: ['operational_date'],
        message: 'Use either operational_date or date_preset, not both',
      });
    }

    if (data.date_from && data.date_to && new Date(data.date_to).getTime() < new Date(data.date_from).getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['date_to'],
        message: 'date_to must be after or equal to date_from',
      });
    }
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
    const dateRange = resolveMcpOperationalDateRange({
      dateFrom: parsed.date_from,
      dateTo: parsed.date_to,
      operationalDate: parsed.operational_date,
      datePreset: parsed.date_preset,
      timezoneOffsetMinutes: parsed.timezone_offset_minutes,
      operationalDayStartHour: parsed.operational_day_start_hour,
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
