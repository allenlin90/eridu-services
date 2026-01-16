import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import {
  createScheduleInputSchema,
  scheduleApiResponseSchema,
  updateScheduleInputSchema,
} from '@eridu/api-types/schedules';

import {
  SCHEDULE_STATUS,
  SCHEDULE_UID_PREFIX,
} from '../schedule.constants';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { ClientService } from '@/models/client/client.service';
import { clientSchema } from '@/models/client/schemas/client.schema';
import { userSchema } from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

// Internal schema for database entity
export const scheduleSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(SCHEDULE_UID_PREFIX),
  name: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  status: z.string(),
  publishedAt: z.date().nullable(),
  planDocument: z.record(z.string(), z.any()),
  version: z.number().int(),
  metadata: z.record(z.string(), z.any()),
  clientId: z.bigint().nullable(),
  createdBy: z.bigint().nullable(),
  publishedBy: z.bigint().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// Schema for Schedule with relations (used in admin endpoints)
export const scheduleWithRelationsSchema = scheduleSchema.extend({
  client: clientSchema.optional(),
  createdByUser: userSchema.optional(),
  publishedByUser: userSchema.nullable().optional(),
  planDocument: z.record(z.string(), z.any()).optional(), // Override to make optional for conditional inclusion
});

// API input schema (snake_case input, transforms to camelCase)
export const createScheduleSchema = createScheduleInputSchema.transform(
  (data) => ({
    name: data.name,
    startDate: new Date(data.start_date),
    endDate: new Date(data.end_date),
    status: data.status,
    planDocument: data.plan_document,
    version: data.version,
    metadata: data.metadata,
    client: { connect: { uid: data.client_id } },
    createdByUser: { connect: { uid: data.created_by } },
  }),
);

// CORE input schema
export const createScheduleCoreSchema = z.object({
  name: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
  status: z
    .enum([
      SCHEDULE_STATUS.DRAFT,
      SCHEDULE_STATUS.REVIEW,
      SCHEDULE_STATUS.PUBLISHED,
    ])
    .optional(),
  planDocument: z.record(z.string(), z.any()),
  version: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  clientId: z.bigint(),
  createdBy: z.bigint(),
});

// API input schema (snake_case input, transforms to camelCase)
export const updateScheduleSchema = updateScheduleInputSchema.transform(
  (data) => ({
    name: data.name,
    startDate: data.start_date ? new Date(data.start_date) : undefined,
    endDate: data.end_date ? new Date(data.end_date) : undefined,
    status: data.status,
    planDocument: data.plan_document,
    version: data.version, // This will be used for optimistic locking validation
    metadata: data.metadata,
    publishedByUser: data.published_by
      ? { connect: { uid: data.published_by } }
      : undefined,
  }),
);

export const updateScheduleCoreSchema = z.object({
  name: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.string().optional(),
  planDocument: z.record(z.string(), z.any()).optional(),
  version: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  publishedAt: z.date().nullable().optional(),
  publishedBy: z.bigint().nullable().optional(),
});

// API output schema (transforms to snake_case)
export const scheduleDto = scheduleWithRelationsSchema
  .transform((obj) => ({
    id: obj.uid,
    name: obj.name,
    start_date: obj.startDate.toISOString(),
    end_date: obj.endDate.toISOString(),
    status: obj.status,
    published_at: obj.publishedAt?.toISOString() ?? null,
    ...(obj.planDocument !== undefined && { plan_document: obj.planDocument }),
    version: obj.version,
    metadata: obj.metadata,
    client_id: obj.client?.uid ?? null,
    client_name: obj.client?.name ?? null,
    created_by: obj.createdByUser?.uid ?? null,
    created_by_name: obj.createdByUser?.name ?? null,
    published_by: obj.publishedByUser?.uid ?? null,
    published_by_name: obj.publishedByUser?.name ?? null,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(scheduleApiResponseSchema);

// Bulk operation schemas
export const bulkCreateScheduleSchema = z.object({
  schedules: z.array(createScheduleSchema).min(1).max(1000), // Limit to prevent abuse
});

export const bulkUpdateScheduleItemSchema = updateScheduleInputSchema
  .safeExtend({
    schedule_id: z.string().startsWith(SCHEDULE_UID_PREFIX),
  })
  .transform((data) => ({
    scheduleId: data.schedule_id,
    name: data.name,
    startDate: data.start_date ? new Date(data.start_date) : undefined,
    endDate: data.end_date ? new Date(data.end_date) : undefined,
    status: data.status,
    planDocument: data.plan_document,
    version: data.version,
    metadata: data.metadata,
    publishedByUser: data.published_by
      ? { connect: { uid: data.published_by } }
      : undefined,
  }));

export const bulkUpdateScheduleSchema = z.object({
  schedules: z.array(bulkUpdateScheduleItemSchema).min(1).max(1000),
});

// Bulk operation result schemas
export const bulkOperationResultItemSchema = z.object({
  index: z.number().int().optional(), // Index in the input array
  schedule_id: z.string().nullable(),
  client_id: z.string().nullable(),
  client_name: z.string().nullable(),
  success: z.boolean(),
  error: z.string().nullable(),
  error_code: z.string().nullable(),
});

export const bulkCreateScheduleResultSchema = z.object({
  total: z.number().int(),
  successful: z.number().int(),
  failed: z.number().int(),
  results: z.array(bulkOperationResultItemSchema),
  successful_schedules: z.array(scheduleDto).optional(),
});

export const bulkUpdateScheduleResultSchema = z.object({
  total: z.number().int(),
  successful: z.number().int(),
  failed: z.number().int(),
  results: z.array(bulkOperationResultItemSchema),
  successful_schedules: z.array(scheduleDto).optional(),
});

// List schedules filter schema (filters only, pagination handled separately)
export const listSchedulesFilterSchema = z.object({
  client_id: z
    .union([
      z.string().startsWith(ClientService.UID_PREFIX),
      z.array(z.string().startsWith(ClientService.UID_PREFIX)),
    ])
    .optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  created_by: z
    .union([
      z.string().startsWith(UserService.UID_PREFIX),
      z.array(z.string().startsWith(UserService.UID_PREFIX)),
    ])
    .optional(),
  published_by: z
    .union([
      z.string().startsWith(UserService.UID_PREFIX),
      z.array(z.string().startsWith(UserService.UID_PREFIX)),
    ])
    .optional(),
  start_date_from: z.iso.datetime().optional(),
  start_date_to: z.iso.datetime().optional(),
  end_date_from: z.iso.datetime().optional(),
  end_date_to: z.iso.datetime().optional(),
  name: z.string().optional(),
  order_by: z
    .enum(['created_at', 'updated_at', 'start_date', 'end_date'])
    .default('created_at'),
  order_direction: z.enum(['asc', 'desc']).default('desc'),
  include_plan_document: z.coerce.boolean().default(false),
  include_deleted: z.coerce.boolean().default(false),
  client_name: z.string().optional(),
});

// List schedules query schema (extends pagination with filters)
// Use .and() to combine schemas while preserving type inference
export const listSchedulesQuerySchema = paginationQuerySchema.and(
  listSchedulesFilterSchema,
);

// Type inference for the query schema
export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>;

// Monthly overview query schema
export const monthlyOverviewQuerySchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  client_ids: z.array(z.string()).optional(),
  status: z.string().optional(),
  include_deleted: z.coerce.boolean().default(false),
});

// Monthly overview response schema
export const monthlyOverviewResponseSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  total_schedules: z.number().int(),
  schedules_by_client: z.record(
    z.string(),
    z.object({
      client_id: z.string(),
      client_name: z.string(),
      count: z.number().int(),
      schedules: z.array(scheduleDto),
    }),
  ),
  schedules_by_status: z.record(z.string(), z.number().int()),
  schedules: z.array(scheduleDto),
});

// DTOs for input/output
export class CreateScheduleDto extends createZodDto(createScheduleSchema) {}
export class CreateScheduleCoreDto extends createZodDto(
  createScheduleCoreSchema,
) {}
export class UpdateScheduleDto extends createZodDto(updateScheduleSchema) {}
export class UpdateScheduleCoreDto extends createZodDto(
  updateScheduleCoreSchema,
) {}
export class ScheduleDto extends createZodDto(scheduleDto) {}
export class BulkCreateScheduleDto extends createZodDto(
  bulkCreateScheduleSchema,
) {}
export class BulkUpdateScheduleDto extends createZodDto(
  bulkUpdateScheduleSchema,
) {}
export class BulkCreateScheduleResultDto extends createZodDto(
  bulkCreateScheduleResultSchema,
) {}
export class BulkUpdateScheduleResultDto extends createZodDto(
  bulkUpdateScheduleResultSchema,
) {}
// List schedules query DTO (extends pagination with filters)
export class ListSchedulesQueryDto extends createZodDto(
  listSchedulesQuerySchema,
) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare name?: string;
  declare client_id?: string | string[];
  declare status?: string | string[];
  declare created_by?: string | string[];
  declare published_by?: string | string[];
  declare start_date_from?: string;
  declare start_date_to?: string;
  declare end_date_from?: string;
  declare end_date_to?: string;
  declare order_by: 'created_at' | 'updated_at' | 'start_date' | 'end_date';
  declare order_direction: 'asc' | 'desc';
  declare include_plan_document: boolean;
  declare include_deleted: boolean;
  declare client_name?: string;
}
export class MonthlyOverviewQueryDto extends createZodDto(
  monthlyOverviewQuerySchema,
) {}
export class MonthlyOverviewResponseDto extends createZodDto(
  monthlyOverviewResponseSchema,
) {}
