import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { paginationQuerySchema } from '@/lib/pagination/pagination.schema';
import { StudioService } from '@/models/studio/studio.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { UserService } from '@/models/user/user.service';

const studioShiftStatusSchema = z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']);

function decimalToString(value: unknown): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object'
    && value !== null
    && 'toString' in value
    && typeof value.toString === 'function'
  ) {
    return value.toString();
  }

  return '0.00';
}

const studioShiftBlockSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioShiftService.BLOCK_UID_PREFIX),
  shiftId: z.bigint(),
  startTime: z.date(),
  endTime: z.date(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const studioShiftWithRelationsSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioShiftService.UID_PREFIX),
  studioId: z.bigint(),
  userId: z.bigint(),
  date: z.date(),
  hourlyRate: z.any(),
  projectedCost: z.any(),
  calculatedCost: z.any().nullable(),
  isApproved: z.boolean(),
  isDutyManager: z.boolean(),
  status: studioShiftStatusSchema,
  metadata: z.record(z.string(), z.any()),
  blocks: z.array(studioShiftBlockSchema),
  user: z.object({ uid: z.string().startsWith(UserService.UID_PREFIX) }),
  studio: z.object({ uid: z.string().startsWith(StudioService.UID_PREFIX) }),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const studioShiftApiResponseSchema = z.object({
  id: z.string(),
  studio_id: z.string(),
  user_id: z.string(),
  date: z.iso.date(),
  hourly_rate: z.string(),
  projected_cost: z.string(),
  calculated_cost: z.string().nullable(),
  is_approved: z.boolean(),
  is_duty_manager: z.boolean(),
  status: studioShiftStatusSchema,
  metadata: z.record(z.string(), z.any()),
  blocks: z.array(
    z.object({
      id: z.string(),
      start_time: z.iso.datetime(),
      end_time: z.iso.datetime(),
      metadata: z.record(z.string(), z.any()),
      created_at: z.iso.datetime(),
      updated_at: z.iso.datetime(),
    }),
  ),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const studioShiftDto = studioShiftWithRelationsSchema
  .transform((obj) => ({
    id: obj.uid,
    studio_id: obj.studio.uid,
    user_id: obj.user.uid,
    date: obj.date.toISOString().slice(0, 10),
    hourly_rate: decimalToString(obj.hourlyRate),
    projected_cost: decimalToString(obj.projectedCost),
    calculated_cost: obj.calculatedCost ? decimalToString(obj.calculatedCost) : null,
    is_approved: obj.isApproved,
    is_duty_manager: obj.isDutyManager,
    status: obj.status,
    metadata: obj.metadata,
    blocks: obj.blocks.map((block) => ({
      id: block.uid,
      start_time: block.startTime.toISOString(),
      end_time: block.endTime.toISOString(),
      metadata: block.metadata,
      created_at: block.createdAt.toISOString(),
      updated_at: block.updatedAt.toISOString(),
    })),
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(studioShiftApiResponseSchema);

const blockInputSchema = z.object({
  start_time: z.iso.datetime(),
  end_time: z.iso.datetime(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const validateUserUid = z.string().startsWith(UserService.UID_PREFIX);
const validateStudioUid = z.string().startsWith(StudioService.UID_PREFIX);

export const createStudioShiftSchema = z
  .object({
    user_id: validateUserUid,
    date: z.iso.date(),
    hourly_rate: z.coerce.number().positive().optional(),
    blocks: z.array(blockInputSchema).min(1),
    status: studioShiftStatusSchema.optional(),
    is_duty_manager: z.boolean().optional(),
    is_approved: z.boolean().optional(),
    calculated_cost: z.coerce.number().nonnegative().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    userId: data.user_id,
    date: new Date(data.date),
    hourlyRate: data.hourly_rate !== undefined ? data.hourly_rate.toFixed(2) : undefined,
    blocks: data.blocks.map((block) => ({
      startTime: new Date(block.start_time),
      endTime: new Date(block.end_time),
      metadata: block.metadata ?? {},
    })),
    status: data.status,
    isDutyManager: data.is_duty_manager,
    isApproved: data.is_approved,
    calculatedCost: data.calculated_cost !== undefined ? data.calculated_cost.toFixed(2) : undefined,
    metadata: data.metadata ?? {},
  }));

export const updateStudioShiftSchema = z
  .object({
    user_id: validateUserUid.optional(),
    date: z.iso.date().optional(),
    hourly_rate: z.coerce.number().positive().optional(),
    blocks: z.array(blockInputSchema).min(1).optional(),
    status: studioShiftStatusSchema.optional(),
    is_duty_manager: z.boolean().optional(),
    is_approved: z.boolean().optional(),
    calculated_cost: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    userId: data.user_id,
    date: data.date ? new Date(data.date) : undefined,
    hourlyRate: data.hourly_rate !== undefined ? data.hourly_rate.toFixed(2) : undefined,
    blocks: data.blocks?.map((block) => ({
      startTime: new Date(block.start_time),
      endTime: new Date(block.end_time),
      metadata: block.metadata ?? {},
    })),
    status: data.status,
    isDutyManager: data.is_duty_manager,
    isApproved: data.is_approved,
    calculatedCost: data.calculated_cost === null
      ? null
      : data.calculated_cost !== undefined
        ? data.calculated_cost.toFixed(2)
        : undefined,
    metadata: data.metadata,
  }));

export const listStudioShiftsQuerySchema = paginationQuerySchema
  .and(
    z.object({
      id: z.string().optional(),
      user_id: validateUserUid.optional(),
      date_from: z.iso.date().optional(),
      date_to: z.iso.date().optional(),
      status: studioShiftStatusSchema.optional(),
      is_duty_manager: z.coerce.boolean().optional(),
      include_deleted: z.coerce.boolean().default(false),
    }),
  )
  .transform((data) => ({
    ...data,
    uid: data.id,
    userId: data.user_id,
    dateFrom: data.date_from ? new Date(data.date_from) : undefined,
    dateTo: data.date_to ? new Date(data.date_to) : undefined,
    isDutyManager: data.is_duty_manager,
    includeDeleted: data.include_deleted,
  }));

export const listMyStudioShiftsQuerySchema = paginationQuerySchema
  .and(
    z.object({
      id: z.string().optional(),
      studio_id: validateStudioUid.optional(),
      date_from: z.iso.date().optional(),
      date_to: z.iso.date().optional(),
      status: studioShiftStatusSchema.optional(),
      is_duty_manager: z.coerce.boolean().optional(),
      include_deleted: z.coerce.boolean().default(false),
    }),
  )
  .transform((data) => ({
    ...data,
    uid: data.id,
    studioId: data.studio_id,
    dateFrom: data.date_from ? new Date(data.date_from) : undefined,
    dateTo: data.date_to ? new Date(data.date_to) : undefined,
    isDutyManager: data.is_duty_manager,
    includeDeleted: data.include_deleted,
  }));

export const dutyManagerQuerySchema = z.object({
  time: z.iso.datetime().optional(),
});

export const assignDutyManagerSchema = z.object({
  is_duty_manager: z.boolean(),
});

export type CreateStudioShiftInput = z.infer<typeof createStudioShiftSchema>;
export type UpdateStudioShiftInput = z.infer<typeof updateStudioShiftSchema>;
export type ListStudioShiftsQuery = z.infer<typeof listStudioShiftsQuerySchema>;
export type ListMyStudioShiftsQuery = z.infer<typeof listMyStudioShiftsQuerySchema>;
export type AssignDutyManagerInput = z.infer<typeof assignDutyManagerSchema>;

export class CreateStudioShiftDto extends createZodDto(createStudioShiftSchema) {}
export class UpdateStudioShiftDto extends createZodDto(updateStudioShiftSchema) {}
export class ListStudioShiftsQueryDto extends createZodDto(listStudioShiftsQuerySchema) {}
export class ListMyStudioShiftsQueryDto extends createZodDto(listMyStudioShiftsQuerySchema) {}
export class DutyManagerQueryDto extends createZodDto(dutyManagerQuerySchema) {}
export class AssignDutyManagerDto extends createZodDto(assignDutyManagerSchema) {}
export class StudioShiftDto extends createZodDto(studioShiftDto) {}
