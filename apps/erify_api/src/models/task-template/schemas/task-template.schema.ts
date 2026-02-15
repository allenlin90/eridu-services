import type { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

import {
  createStudioTaskTemplateSchema,
  createTaskTemplateSchema,
  listTaskTemplatesQuerySchema,
  taskTemplateDto,
  taskTemplateSchema,
  updateStudioTaskTemplateSchema,
} from '@eridu/api-types/task-management';

// Re-export shared schemas
export {
  createStudioTaskTemplateSchema,
  createTaskTemplateSchema,
  listTaskTemplatesQuerySchema,
  taskTemplateDto,
  taskTemplateSchema,
  updateStudioTaskTemplateSchema,
};

// Define DTOs using shared schemas
export class CreateStudioTaskTemplateDto extends createZodDto(createStudioTaskTemplateSchema) {}
export class UpdateStudioTaskTemplateDto extends createZodDto(updateStudioTaskTemplateSchema) {}
export class TaskTemplateDto extends createZodDto(taskTemplateDto) {}
export class ListTaskTemplatesQueryDto extends createZodDto(listTaskTemplatesQuerySchema) {}

// For Task Template Service
export type CreateTaskTemplatePayload = Omit<Prisma.TaskTemplateCreateInput, 'uid' | 'version'> & { uid?: string; version?: number };
