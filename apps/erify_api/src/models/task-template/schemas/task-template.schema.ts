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

/**
 * Payload for creating a task template (service layer).
 */
export type CreateTaskTemplatePayload = {
  name: string;
  description?: string | null;
  currentSchema: any;
  studioId: string;
  uid?: string;
  version?: number;
};

/**
 * Payload for updating a task template (service layer).
 */
export type UpdateTaskTemplatePayload = {
  name?: string;
  description?: string | null;
  currentSchema?: any;
  version?: number;
};
