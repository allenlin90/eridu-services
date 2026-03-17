import { createZodDto } from 'nestjs-zod';

import { taskReportPreflightRequestSchema } from '@eridu/api-types/task-management';

export class TaskReportPreflightDto extends createZodDto(taskReportPreflightRequestSchema) {}
