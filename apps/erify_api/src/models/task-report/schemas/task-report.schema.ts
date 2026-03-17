import { createZodDto } from 'nestjs-zod';

import {
  getTaskReportSourcesQuerySchema,
  taskReportPreflightRequestSchema,
  taskReportRunRequestSchema,
} from '@eridu/api-types/task-management';

export class TaskReportPreflightDto extends createZodDto(taskReportPreflightRequestSchema) {}
export class TaskReportSourcesQueryDto extends createZodDto(getTaskReportSourcesQuerySchema) {}
export class TaskReportRunDto extends createZodDto(taskReportRunRequestSchema) {}
