import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import { CREATOR_COMPENSATION_TYPE } from '../creators/schemas.js';
import { createPaginatedResponseSchema } from '../pagination/schemas.js';

const creatorUidSchema = z
  .string()
  .startsWith(`${UID_PREFIXES.CREATOR}_`, 'Invalid creator id');

const showUidSchema = z.string().startsWith(`${UID_PREFIXES.SHOW}_`);

export const studioCreatorCatalogItemSchema = z.object({
  id: creatorUidSchema,
  name: z.string(),
  alias_name: z.string(),
  is_rostered: z.boolean(),
});

export const studioCreatorCatalogQuerySchema = z.object({
  search: z.string().optional(),
  include_rostered: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const studioCreatorAvailabilityItemSchema = z.object({
  id: creatorUidSchema,
  name: z.string(),
  alias_name: z.string(),
});

export const studioCreatorAvailabilityQuerySchema = z.object({
  date_from: z.iso.datetime(),
  date_to: z.iso.datetime(),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})
  .superRefine((data, ctx) => {
    if (new Date(data.date_to).getTime() <= new Date(data.date_from).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_to'],
        message: 'date_to must be later than date_from',
      });
    }
  });

const studioCreatorUidSchema = z
  .string()
  .startsWith(`${UID_PREFIXES.STUDIO_CREATOR}_`, 'Invalid studio creator id');

export const studioCreatorRosterItemSchema = z.object({
  id: studioCreatorUidSchema,
  creator_id: creatorUidSchema,
  creator_name: z.string(),
  creator_alias_name: z.string(),
  default_rate: z.string().nullable(),
  default_rate_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .nullable(),
  default_commission_rate: z.string().nullable(),
  is_active: z.boolean(),
  version: z.number().int().positive(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export const studioCreatorRosterListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(20),
  search: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
  default_rate_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .nullable()
    .optional(),
});

export const studioCreatorRosterListResponseSchema = createPaginatedResponseSchema(
  studioCreatorRosterItemSchema,
);

export const createStudioCreatorRosterInputSchema = z.object({
  creator_id: creatorUidSchema,
  default_rate: z.coerce.number().positive().nullable().optional(),
  default_rate_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .nullable()
    .optional(),
  default_commission_rate: z.coerce.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateStudioCreatorRosterInputSchema = z.object({
  version: z.number().int().positive(),
  default_rate: z.coerce.number().positive().nullable().optional(),
  default_rate_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .nullable()
    .optional(),
  default_commission_rate: z.coerce.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const creatorAvailabilityWindowSchema = z.object({
  date_from: z.iso.datetime(),
  date_to: z.iso.datetime(),
});

export const creatorAvailabilityRequestSchema = z.object({
  windows: z.array(creatorAvailabilityWindowSchema).min(1),
});

export const studioShowCreatorAssignmentItemInputSchema = z.object({
  creator_id: creatorUidSchema,
  note: z.string().max(1000).nullable().optional(),
  agreed_rate: z.coerce.number().positive().nullable().optional(),
  compensation_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .nullable()
    .optional(),
  commission_rate: z.coerce.number().min(0).max(100).nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const studioShowCreatorListItemSchema = z.object({
  creator_id: creatorUidSchema,
  creator_name: z.string(),
  creator_alias_name: z.string(),
  note: z.string().nullable(),
  agreed_rate: z.string().nullable(),
  compensation_type: z
    .enum(Object.values(CREATOR_COMPENSATION_TYPE) as [string, ...string[]])
    .nullable(),
  commission_rate: z.string().nullable(),
  metadata: z.record(z.string(), z.any()),
});

/** Maximum creators per single-show bulk assign call. Enforced on both API and UI. */
export const BULK_ASSIGN_MAX_CREATORS_PER_SHOW = 50;
/** Maximum shows per multi-show bulk assign call. Enforced on both API and UI. */
export const BULK_ASSIGN_MAX_SHOWS = 20;

export const bulkAssignStudioShowCreatorsInputSchema = z.object({
  creators: z.array(studioShowCreatorAssignmentItemInputSchema).min(1).max(BULK_ASSIGN_MAX_CREATORS_PER_SHOW),
});

export const bulkAssignStudioShowCreatorsFailureSchema = z.object({
  creator_id: creatorUidSchema,
  reason: z.string(),
});

export const bulkAssignStudioShowCreatorsResponseSchema = z.object({
  assigned: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.array(bulkAssignStudioShowCreatorsFailureSchema),
});

export const bulkShowCreatorAssignmentInputSchema = z.object({
  show_ids: z.array(showUidSchema).min(1).max(BULK_ASSIGN_MAX_SHOWS),
  creator_ids: z.array(creatorUidSchema).min(1).max(BULK_ASSIGN_MAX_CREATORS_PER_SHOW),
});

export const bulkShowCreatorAssignmentErrorSchema = z.object({
  show_id: showUidSchema,
  creator_id: creatorUidSchema,
  reason: z.string(),
});

export const bulkShowCreatorAssignmentResponseSchema = z.object({
  created: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(bulkShowCreatorAssignmentErrorSchema),
});

export type StudioCreatorCatalogItem = z.infer<typeof studioCreatorCatalogItemSchema>;
export type StudioCreatorCatalogQuery = z.infer<typeof studioCreatorCatalogQuerySchema>;
export type StudioCreatorAvailabilityItem = z.infer<typeof studioCreatorAvailabilityItemSchema>;
export type StudioCreatorAvailabilityQuery = z.infer<typeof studioCreatorAvailabilityQuerySchema>;
export type StudioCreatorRosterItem = z.infer<typeof studioCreatorRosterItemSchema>;
export type StudioCreatorRosterListQuery = z.infer<typeof studioCreatorRosterListQuerySchema>;
export type CreateStudioCreatorRosterInput = z.infer<typeof createStudioCreatorRosterInputSchema>;
export type UpdateStudioCreatorRosterInput = z.infer<typeof updateStudioCreatorRosterInputSchema>;
export type CreatorAvailabilityRequest = z.infer<typeof creatorAvailabilityRequestSchema>;
export type StudioShowCreatorAssignmentItemInput = z.infer<typeof studioShowCreatorAssignmentItemInputSchema>;
export type StudioShowCreatorListItem = z.infer<typeof studioShowCreatorListItemSchema>;
export type BulkAssignStudioShowCreatorsInput = z.infer<typeof bulkAssignStudioShowCreatorsInputSchema>;
export type BulkAssignStudioShowCreatorsFailure = z.infer<typeof bulkAssignStudioShowCreatorsFailureSchema>;
export type BulkAssignStudioShowCreatorsResponse = z.infer<typeof bulkAssignStudioShowCreatorsResponseSchema>;
export type BulkShowCreatorAssignmentInput = z.infer<typeof bulkShowCreatorAssignmentInputSchema>;
export type BulkShowCreatorAssignmentError = z.infer<typeof bulkShowCreatorAssignmentErrorSchema>;
export type BulkShowCreatorAssignmentResponse = z.infer<typeof bulkShowCreatorAssignmentResponseSchema>;
