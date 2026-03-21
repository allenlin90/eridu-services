import { createZodDto } from 'nestjs-zod';

import {
  createTaskReportDefinitionSchema,
  getTaskReportSourcesQuerySchema,
  listTaskReportDefinitionsQuerySchema,
  taskReportRunRequestSchema,
  updateTaskReportDefinitionSchema,
} from '@eridu/api-types/task-management';

export class ListTaskReportDefinitionsQueryDto extends createZodDto(listTaskReportDefinitionsQuerySchema) {}
/**
 * Preflight uses the same flat query-param shape as source discovery.
 * The service wraps the parsed scope into `{ scope }` internally.
 */
export class TaskReportPreflightQueryDto extends createZodDto(getTaskReportSourcesQuerySchema) {}
export class TaskReportSourcesQueryDto extends createZodDto(getTaskReportSourcesQuerySchema) {}
export class TaskReportRunDto extends createZodDto(taskReportRunRequestSchema) {}
export class CreateTaskReportDefinitionDto extends createZodDto(createTaskReportDefinitionSchema) {}
export class UpdateTaskReportDefinitionDto extends createZodDto(updateTaskReportDefinitionSchema) {}
