import { createZodDto } from 'nestjs-zod';
import z from 'zod';

import { McService } from '../../mc/mc.service';
import { mcSchema } from '../../mc/schemas/mc.schema';
import { showSchema } from '../../show/schemas/show.schema';
import { ShowService } from '../../show/show.service';
import { ShowMcService } from '../show-mc.service';

// Internal schema for database entity
export const showMcSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(ShowMcService.UID_PREFIX),
  showId: z.bigint(),
  mcId: z.bigint(),
  note: z.string().nullable(),
  metadata: z.record(z.string(), z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// API input schema (snake_case input, transforms to camelCase)
export const createShowMcSchema = z
  .object({
    show_id: z.string().startsWith(ShowService.UID_PREFIX), // UID
    mc_id: z.string().startsWith(McService.UID_PREFIX), // UID
    note: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    showId: data.show_id,
    mcId: data.mc_id,
    note: data.note,
    metadata: data.metadata,
  }));

// API update schema (snake_case input, transforms to camelCase)
export const updateShowMcSchema = z
  .object({
    show_id: z.string().startsWith(ShowService.UID_PREFIX).optional(), // UID
    mc_id: z.string().startsWith(McService.UID_PREFIX).optional(), // UID
    note: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => ({
    showId: data.show_id,
    mcId: data.mc_id,
    note: data.note,
    metadata: data.metadata,
  }));

// Schema for ShowMC with relations (used in admin endpoints)
export const showMcWithRelationsSchema = showMcSchema.extend({
  show: showSchema.optional(),
  mc: mcSchema.optional(),
});

// API output schema (transforms to snake_case)
export const showMcDto = showMcWithRelationsSchema.transform((obj) => ({
  id: obj.uid,
  show_id: obj.show?.uid,
  show_name: obj.show?.name,
  mc_id: obj.mc?.uid,
  mc_name: obj.mc?.name,
  mc_alias_name: obj.mc?.aliasName,
  note: obj.note,
  metadata: obj.metadata,
  created_at: obj.createdAt,
  updated_at: obj.updatedAt,
}));

// DTOs for input/output
export class CreateShowMcDto extends createZodDto(createShowMcSchema) {}
export class UpdateShowMcDto extends createZodDto(updateShowMcSchema) {}
export class ShowMcDto extends createZodDto(showMcDto) {}
