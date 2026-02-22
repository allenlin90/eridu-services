import { createZodDto } from 'nestjs-zod';

import type {
  TaskStatus,
  TaskType,
} from '@eridu/api-types/task-management';
import {
  assignShowsRequestSchema,
  assignShowsResponseSchema,
  generateTasksRequestSchema,
  generateTasksResponseSchema,
  listMyTasksQuerySchema,
  listStudioShowsQuerySchema,
  reassignTaskRequestSchema,
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
  generateTasksRequestSchema,
  generateTasksResponseSchema,
  listMyTasksQuerySchema,
  listStudioShowsQuerySchema,
  reassignTaskRequestSchema,
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
export class ListStudioShowsQueryDto extends createZodDto(listStudioShowsQuerySchema) {}
export class ListMyTasksQueryDto extends createZodDto(listMyTasksQuerySchema) {}
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
  content?: any;
  metadata?: any;
  assigneeUid?: string;
};

/**
 * Internal payload for updating a task (service layer).
 */
export type UpdateTaskPayload = {
  content?: any;
  status?: TaskStatus;
};
