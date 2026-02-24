import { createZodDto } from 'nestjs-zod';

import {
  adminTaskTemplateBindingDto,
  adminTaskTemplateDto,
  createAdminTaskTemplateSchema,
  createStudioTaskTemplateSchema,
  createTaskTemplateSchema,
  listAdminTaskTemplateBindingsQuerySchema,
  listAdminTaskTemplatesQuerySchema,
  listTaskTemplatesQuerySchema,
  taskTemplateDto,
  taskTemplateSchema,
  taskTemplateUsageSummaryDto,
  updateAdminTaskTemplateSchema,
  updateStudioTaskTemplateSchema,
} from '@eridu/api-types/task-management';

// Re-export shared schemas
export {
  adminTaskTemplateBindingDto,
  adminTaskTemplateDto,
  createAdminTaskTemplateSchema,
  createStudioTaskTemplateSchema,
  createTaskTemplateSchema,
  listAdminTaskTemplateBindingsQuerySchema,
  listAdminTaskTemplatesQuerySchema,
  listTaskTemplatesQuerySchema,
  taskTemplateDto,
  taskTemplateSchema,
  taskTemplateUsageSummaryDto,
  updateAdminTaskTemplateSchema,
  updateStudioTaskTemplateSchema,
};

// Define DTOs using shared schemas
export class CreateStudioTaskTemplateDto extends createZodDto(createStudioTaskTemplateSchema) {}
export class UpdateStudioTaskTemplateDto extends createZodDto(updateStudioTaskTemplateSchema) {}
export class CreateAdminTaskTemplateDto extends createZodDto(createAdminTaskTemplateSchema) {}
export class UpdateAdminTaskTemplateDto extends createZodDto(updateAdminTaskTemplateSchema) {}
export class TaskTemplateDto extends createZodDto(taskTemplateDto) {}
export class AdminTaskTemplateDto extends createZodDto(adminTaskTemplateDto) {}
export class TaskTemplateUsageSummaryDto extends createZodDto(taskTemplateUsageSummaryDto) {}
export class AdminTaskTemplateBindingDto extends createZodDto(adminTaskTemplateBindingDto) {}
export class ListTaskTemplatesQueryDto extends createZodDto(listTaskTemplatesQuerySchema) {}
export class ListAdminTaskTemplatesQueryDto extends createZodDto(listAdminTaskTemplatesQuerySchema) {}
export class ListAdminTaskTemplateBindingsQueryDto extends createZodDto(listAdminTaskTemplateBindingsQuerySchema) {}

/**
 * Payload for creating a task template (service layer).
 */
export type CreateTaskTemplatePayload = {
  name: string;
  description?: string | null;
  taskType: 'SETUP' | 'ACTIVE' | 'CLOSURE' | 'ADMIN' | 'ROUTINE' | 'OTHER';
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
  taskType?: 'SETUP' | 'ACTIVE' | 'CLOSURE' | 'ADMIN' | 'ROUTINE' | 'OTHER';
  currentSchema?: any;
  version?: number;
};
