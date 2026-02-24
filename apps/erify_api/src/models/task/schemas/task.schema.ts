import type { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

import type {
  TaskStatus,
  TaskType,
} from '@eridu/api-types/task-management';
import {
  assignShowsRequestSchema,
  assignShowsResponseSchema,
  bulkDeleteTasksRequestSchema,
  bulkDeleteTasksResponseSchema,
  generateTasksRequestSchema,
  generateTasksResponseSchema,
  listMyTasksQuerySchema,
  listStudioShowsQuerySchema,
  reassignTaskRequestSchema,
  reassignTaskShowRequestSchema,
  showWithTaskSummaryDto,
  taskDto,
  taskSchema,
  taskWithRelationsDto,
  updateTaskRequestSchema,
} from '@eridu/api-types/task-management';

// Re-export shared schemas
export {
  assignShowsRequestSchema,
  assignShowsResponseSchema,
  bulkDeleteTasksRequestSchema,
  bulkDeleteTasksResponseSchema,
  generateTasksRequestSchema,
  generateTasksResponseSchema,
  listMyTasksQuerySchema,
  listStudioShowsQuerySchema,
  reassignTaskRequestSchema,
  reassignTaskShowRequestSchema,
  showWithTaskSummaryDto,
  taskDto,
  taskSchema,
  taskWithRelationsDto,
  updateTaskRequestSchema,
};

// Define DTOs using shared schemas
export class GenerateTasksDto extends createZodDto(generateTasksRequestSchema) {}
export class GenerateTasksResponseDto extends createZodDto(generateTasksResponseSchema) {}
export class AssignShowsDto extends createZodDto(assignShowsRequestSchema) {}
export class AssignShowsResponseDto extends createZodDto(assignShowsResponseSchema) {}
export class ReassignTaskDto extends createZodDto(reassignTaskRequestSchema) {}
export class ReassignTaskShowDto extends createZodDto(reassignTaskShowRequestSchema) {}
export class ListStudioShowsQueryDto extends createZodDto(listStudioShowsQuerySchema) {}
export class ListMyTasksQueryDto extends createZodDto(listMyTasksQuerySchema) {}
export class BulkDeleteTasksDto extends createZodDto(bulkDeleteTasksRequestSchema) {}
export class BulkDeleteTasksResponseDto extends createZodDto(bulkDeleteTasksResponseSchema) {}
export class TaskDto extends createZodDto(taskDto) {}
export class TaskWithRelationsDto extends createZodDto(taskWithRelationsDto) {}
export class ShowWithTaskSummaryDto extends createZodDto(showWithTaskSummaryDto) {}
export class UpdateTaskDto extends createZodDto(updateTaskRequestSchema) {}

/**
 * Internal payload for creating a task (service layer).
 */
export type CreateTaskPayload = {
  description: string;
  type: TaskType;
  studioUid: string;
  snapshotId: bigint;
  templateId: bigint;
  uid?: string;
  dueDate?: Date | null;
  content?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
  assigneeUid?: string;
};

/**
 * Internal payload for updating a task (service layer).
 */
export type UpdateTaskPayload = {
  content?: Prisma.JsonValue;
  status?: TaskStatus;
};
