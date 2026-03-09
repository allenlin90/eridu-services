import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { MC_COMPENSATION_TYPE } from '@eridu/api-types/mcs';

import { decimalToStringOrNull } from '@/lib/utils/decimal.util';
import { McService } from '@/models/mc/mc.service';
import { StudioMcService } from '@/models/studio-mc/studio-mc.service';

const studioMcRosterItemSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioMcService.UID_PREFIX),
  defaultRate: z.unknown().nullable(),
  defaultRateType: z.string().nullable(),
  defaultCommissionRate: z.unknown().nullable(),
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  mc: z.object({
    uid: z.string().startsWith(McService.UID_PREFIX),
    name: z.string(),
    aliasName: z.string(),
  }),
});

export const studioMcRosterItemDto = studioMcRosterItemSchema
  .transform((obj) => ({
    id: obj.uid,
    mc_id: obj.mc.uid,
    mc_name: obj.mc.name,
    mc_alias_name: obj.mc.aliasName,
    default_rate: decimalToStringOrNull(obj.defaultRate),
    default_rate_type: obj.defaultRateType,
    default_commission_rate: decimalToStringOrNull(obj.defaultCommissionRate),
    is_active: obj.isActive,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(z.object({
    id: z.string(),
    mc_id: z.string(),
    mc_name: z.string(),
    mc_alias_name: z.string(),
    default_rate: z.string().nullable(),
    default_rate_type: z.string().nullable(),
    default_commission_rate: z.string().nullable(),
    is_active: z.boolean(),
    metadata: z.record(z.string(), z.any()),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  }));

const compensationTypeSchema = z.enum(
  Object.values(MC_COMPENSATION_TYPE) as [string, ...string[]],
);

export const createStudioMcRosterSchema = z.object({
  mc_id: z.string().startsWith(McService.UID_PREFIX),
  default_rate: z.coerce.number().positive().nullable().optional(),
  default_rate_type: compensationTypeSchema.nullable().optional(),
  default_commission_rate: z.coerce.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).transform((data) => ({
  mcId: data.mc_id,
  defaultRate: data.default_rate !== undefined
    ? (data.default_rate === null ? null : data.default_rate.toFixed(2))
    : undefined,
  defaultRateType: data.default_rate_type,
  defaultCommissionRate: data.default_commission_rate !== undefined
    ? (data.default_commission_rate === null ? null : data.default_commission_rate.toFixed(2))
    : undefined,
  isActive: data.is_active,
  metadata: data.metadata,
}));

export const updateStudioMcRosterSchema = z.object({
  default_rate: z.coerce.number().positive().nullable().optional(),
  default_rate_type: compensationTypeSchema.nullable().optional(),
  default_commission_rate: z.coerce.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).transform((data) => ({
  defaultRate: data.default_rate !== undefined
    ? (data.default_rate === null ? null : data.default_rate.toFixed(2))
    : undefined,
  defaultRateType: data.default_rate_type,
  defaultCommissionRate: data.default_commission_rate !== undefined
    ? (data.default_commission_rate === null ? null : data.default_commission_rate.toFixed(2))
    : undefined,
  isActive: data.is_active,
  metadata: data.metadata,
}));

export class CreateStudioMcRosterDto extends createZodDto(createStudioMcRosterSchema) {}
export class UpdateStudioMcRosterDto extends createZodDto(updateStudioMcRosterSchema) {}

export type CreateStudioMcRosterPayload = z.infer<typeof createStudioMcRosterSchema>;
export type UpdateStudioMcRosterPayload = z.infer<typeof updateStudioMcRosterSchema>;
