import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { ScheduleService } from '@/models/schedule/schedule.service';
import { scheduleSchema } from '@/models/schedule/schemas/schedule.schema';
import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';
import { userSchema } from '@/models/user/schemas/user.schema';
import { UserService } from '@/models/user/user.service';

// Internal schema for database entity
export const scheduleSnapshotSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ScheduleSnapshotService.UID_PREFIX),
  planDocument: z.record(z.string(), z.any()),
  version: z.number().int(),
  status: z.string(),
  snapshotReason: z.string(),
  metadata: z.record(z.string(), z.any()),
  createdBy: z.bigint(),
  scheduleId: z.bigint(),
  createdAt: z.date(),
});

// Schema for ScheduleSnapshot with relations (used in admin endpoints)
export const scheduleSnapshotWithRelationsSchema =
  scheduleSnapshotSchema.extend({
    user: userSchema.optional(),
    schedule: scheduleSchema.optional(),
  });

// API input schema (snake_case input, transforms to camelCase)
export const createScheduleSnapshotSchema = z
  .object({
    plan_document: z.record(z.string(), z.any()),
    version: z.number().int(),
    status: z.string(),
    snapshot_reason: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
    created_by: z.string().startsWith(UserService.UID_PREFIX),
    schedule_id: z.string().startsWith(ScheduleService.UID_PREFIX),
  })
  .transform((data) => ({
    planDocument: data.plan_document,
    version: data.version,
    status: data.status,
    snapshotReason: data.snapshot_reason,
    metadata: data.metadata,
    user: { connect: { uid: data.created_by } },
    schedule: { connect: { uid: data.schedule_id } },
  }));

// CORE input schema
export const createScheduleSnapshotCoreSchema = z.object({
  planDocument: z.record(z.string(), z.any()),
  version: z.number().int(),
  status: z.string(),
  snapshotReason: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdBy: z.bigint(),
  scheduleId: z.bigint(),
});

// API input schema (snake_case input, transforms to camelCase)
export const updateScheduleSnapshotSchema = z
  .object({
    plan_document: z.record(z.string(), z.any()).optional(),
    version: z.number().int().optional(),
    status: z.string().optional(),
    snapshot_reason: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    planDocument: data.plan_document,
    version: data.version,
    status: data.status,
    snapshotReason: data.snapshot_reason,
    metadata: data.metadata,
  }));

export const updateScheduleSnapshotCoreSchema = z.object({
  planDocument: z.record(z.string(), z.any()).optional(),
  version: z.number().int().optional(),
  status: z.string().optional(),
  snapshotReason: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// API output schema (transforms to snake_case)
export const scheduleSnapshotDto = scheduleSnapshotWithRelationsSchema
  .transform((obj) => ({
    id: obj.uid,
    plan_document: obj.planDocument,
    version: obj.version,
    status: obj.status,
    snapshot_reason: obj.snapshotReason,
    metadata: obj.metadata,
    created_by: obj.user?.uid ?? null,
    created_by_name: obj.user?.name ?? null,
    schedule_id: obj.schedule?.uid ?? null,
    schedule_name: obj.schedule?.name ?? null,
    created_at: obj.createdAt.toISOString(),
  }))
  .pipe(
    z.object({
      id: z.string(),
      plan_document: z.record(z.string(), z.any()),
      version: z.number().int(),
      status: z.string(),
      snapshot_reason: z.string(),
      metadata: z.record(z.string(), z.any()),
      created_by: z.string().nullable(),
      created_by_name: z.string().nullable(),
      schedule_id: z.string().nullable(),
      schedule_name: z.string().nullable(),
      created_at: z.iso.datetime(),
    }),
  );

// DTOs for input/output
export class CreateScheduleSnapshotDto extends createZodDto(
  createScheduleSnapshotSchema,
) {}
export class CreateScheduleSnapshotCoreDto extends createZodDto(
  createScheduleSnapshotCoreSchema,
) {}
export class UpdateScheduleSnapshotDto extends createZodDto(
  updateScheduleSnapshotSchema,
) {}
export class UpdateScheduleSnapshotCoreDto extends createZodDto(
  updateScheduleSnapshotCoreSchema,
) {}
export class ScheduleSnapshotDto extends createZodDto(scheduleSnapshotDto) {}
