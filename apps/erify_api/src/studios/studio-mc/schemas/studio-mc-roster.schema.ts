import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

import { decimalToStringOrNull } from '@/lib/utils/decimal.util';
import { CreatorService } from '@/models/creator/creator.service';
import { StudioCreatorService } from '@/models/studio-creator/studio-creator.service';

const studioMcRosterItemSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(StudioCreatorService.UID_PREFIX),
  defaultRate: z.unknown().nullable(),
  defaultRateType: z.string().nullable(),
  defaultCommissionRate: z.unknown().nullable(),
  isActive: z.boolean(),
  version: z.number().int().positive(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  mc: z.object({
    uid: z.string().refine(CreatorService.isValidCreatorUid, 'Invalid creator ID'),
    name: z.string(),
    aliasName: z.string(),
  }),
});

export const studioCreatorRosterItemDto = studioMcRosterItemSchema
  .transform((obj) => ({
    id: obj.uid,
    creator_id: obj.mc.uid,
    creator_name: obj.mc.name,
    creator_alias_name: obj.mc.aliasName,
    // Backward-compatible aliases.
    mc_id: obj.mc.uid,
    mc_name: obj.mc.name,
    mc_alias_name: obj.mc.aliasName,
    default_rate: decimalToStringOrNull(obj.defaultRate),
    default_rate_type: obj.defaultRateType,
    default_commission_rate: decimalToStringOrNull(obj.defaultCommissionRate),
    is_active: obj.isActive,
    version: obj.version,
    metadata: obj.metadata,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(z.object({
    id: z.string(),
    creator_id: z.string(),
    creator_name: z.string(),
    creator_alias_name: z.string(),
    mc_id: z.string(),
    mc_name: z.string(),
    mc_alias_name: z.string(),
    default_rate: z.string().nullable(),
    default_rate_type: z.string().nullable(),
    default_commission_rate: z.string().nullable(),
    is_active: z.boolean(),
    version: z.number().int().positive(),
    metadata: z.record(z.string(), z.any()),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  }));

const compensationTypeSchema = z.enum(
  Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]],
);

export const createStudioCreatorRosterSchema = z.object({
  creator_id: z
    .string()
    .refine(CreatorService.isValidCreatorUid, 'Invalid creator ID')
    .optional(),
  mc_id: z
    .string()
    .refine(CreatorService.isValidCreatorUid, 'Invalid creator ID')
    .optional(),
  default_rate: z.coerce.number().positive().nullable().optional(),
  default_rate_type: compensationTypeSchema.nullable().optional(),
  default_commission_rate: z.coerce.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).transform((data) => ({
  creatorId: data.creator_id ?? data.mc_id ?? '',
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

export const updateStudioCreatorRosterSchema = z.object({
  version: z.number().int().positive(),
  default_rate: z.coerce.number().positive().nullable().optional(),
  default_rate_type: compensationTypeSchema.nullable().optional(),
  default_commission_rate: z.coerce.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).transform((data) => ({
  version: data.version,
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

export class CreateStudioCreatorRosterDto extends createZodDto(createStudioCreatorRosterSchema) {}
export class UpdateStudioCreatorRosterDto extends createZodDto(updateStudioCreatorRosterSchema) {}

export type CreateStudioCreatorRosterPayload = z.infer<typeof createStudioCreatorRosterSchema>;
export type UpdateStudioCreatorRosterPayload = z.infer<typeof updateStudioCreatorRosterSchema>;

export { studioCreatorRosterItemDto as studioMcRosterItemDto };
export { createStudioCreatorRosterSchema as createStudioMcRosterSchema };
export { updateStudioCreatorRosterSchema as updateStudioMcRosterSchema };
export { CreateStudioCreatorRosterDto as CreateStudioMcRosterDto };
export { UpdateStudioCreatorRosterDto as UpdateStudioMcRosterDto };
export type CreateStudioMcRosterPayload = CreateStudioCreatorRosterPayload;
export type UpdateStudioMcRosterPayload = UpdateStudioCreatorRosterPayload;
