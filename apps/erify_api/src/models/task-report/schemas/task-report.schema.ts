import { createZodDto } from 'nestjs-zod';

import {
  createTaskReportDefinitionSchema,
  getTaskReportSourcesQuerySchema,
  listTaskReportDefinitionsQuerySchema,
  taskReportPreflightRequestSchema,
  taskReportRunRequestSchema,
  updateTaskReportDefinitionSchema,
} from '@eridu/api-types/task-management';

export class ListTaskReportDefinitionsQueryDto extends createZodDto(listTaskReportDefinitionsQuerySchema) {}
export class TaskReportPreflightDto extends createZodDto(taskReportPreflightRequestSchema) {}
export class TaskReportSourcesQueryDto extends createZodDto(getTaskReportSourcesQuerySchema) {}
export class TaskReportRunDto extends createZodDto(taskReportRunRequestSchema) {}
export class CreateTaskReportDefinitionDto extends createZodDto(createTaskReportDefinitionSchema) {}
export class UpdateTaskReportDefinitionDto extends createZodDto(updateTaskReportDefinitionSchema) {}
