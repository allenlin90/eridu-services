import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';
import {
  createPaginatedResponseSchema,
  paginationBaseSchema,
  paginationQuerySchema,
  transformPagination,
} from '../pagination/schemas.js';

export const compensationItemTypeSchema = z.enum([
  'BONUS',
  'ALLOWANCE',
  'OVERTIME',
  'DEDUCTION',
  'OTHER',
]);

export const compensationLineItemTargetTypeSchema = z.enum([
  'SHOW',
  'SHOW_CREATOR',
  'STUDIO_SHIFT',
  'STUDIO_SHIFT_BLOCK',
]);

// Backed by Postgres DECIMAL(12,2): max 10 integer digits, max 2 fractional digits.
const decimalAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().regex(/^-?\d{1,10}(?:\.\d{1,2})?$/))
  .transform((value) => {
    const [whole, fractional = ''] = value.split('.');
    return `${whole}.${fractional.padEnd(2, '0')}`;
  });

const reasonSchema = z.string().trim().min(1);

const metadataSchema = z.record(z.string(), z.unknown());

export const createAdminCompensationLineItemInputSchema = z.object({
  studio_id: z.string().startsWith(UID_PREFIXES.STUDIO),
  target_type: compensationLineItemTargetTypeSchema,
  target_id: z.string().min(1),
  amount: decimalAmountSchema,
  item_type: compensationItemTypeSchema,
  reason: reasonSchema,
  metadata: metadataSchema.optional().default({}),
});

export const createStudioCompensationLineItemInputSchema
  = createAdminCompensationLineItemInputSchema.omit({
    studio_id: true,
  }).strict();

export const updateCompensationLineItemInputSchema = z
  .object({
    amount: decimalAmountSchema.optional(),
    item_type: compensationItemTypeSchema.optional(),
    reason: reasonSchema.optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

export const listCompensationLineItemsQuerySchema = paginationQuerySchema
  .and(
    z.object({
      studio_id: z.string().startsWith(UID_PREFIXES.STUDIO).optional(),
      target_type: compensationLineItemTargetTypeSchema.optional(),
      target_id: z.string().min(1).optional(),
      item_type: compensationItemTypeSchema.optional(),
      created_by_uid: z.string().startsWith(UID_PREFIXES.USER).optional(),
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
      include_deleted: z
        .union([z.boolean(), z.enum(['true', 'false'])])
        .transform((value) => (typeof value === 'string' ? value === 'true' : value))
        .optional()
        .default(false),
    }),
  )
  .transform((data) => ({
    page: data.page,
    limit: data.limit,
    skip: data.skip,
    take: data.take,
    sort: data.sort,
    studioId: data.studio_id,
    targetType: data.target_type,
    targetId: data.target_id,
    itemType: data.item_type,
    createdByUid: data.created_by_uid,
    from: data.from ? new Date(data.from) : undefined,
    to: data.to ? new Date(data.to) : undefined,
    includeDeleted: data.include_deleted,
  }));

// Studio list intentionally omits `studio_id` (route is authoritative) and
// `created_by_uid` (admin-only support filter). Built from `paginationBaseSchema`
// + manual `transformPagination` because `.strict()` only works on a plain
// object before any transform — keep in sync with `paginationQuerySchema` if
// shared pagination contracts gain new fields.
export const listStudioCompensationLineItemsQuerySchema = paginationBaseSchema
  .extend({
    sort: z.enum(['asc', 'desc']).optional().default('desc'),
    target_type: compensationLineItemTargetTypeSchema.optional(),
    target_id: z.string().min(1).optional(),
    item_type: compensationItemTypeSchema.optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    include_deleted: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => (typeof value === 'string' ? value === 'true' : value))
      .optional()
      .default(false),
  })
  .strict()
  .transform(transformPagination)
  .transform((data) => ({
    page: data.page,
    limit: data.limit,
    skip: data.skip,
    take: data.take,
    sort: data.sort,
    targetType: data.target_type,
    targetId: data.target_id,
    itemType: data.item_type,
    from: data.from ? new Date(data.from) : undefined,
    to: data.to ? new Date(data.to) : undefined,
    includeDeleted: data.include_deleted,
  }));

export const compensationLineItemApiResponseSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.COMPENSATION_LINE_ITEM),
  studio_id: z.string().startsWith(UID_PREFIXES.STUDIO),
  target_type: compensationLineItemTargetTypeSchema,
  target_id: z.string(),
  amount: z.string(),
  item_type: compensationItemTypeSchema,
  reason: z.string(),
  metadata: metadataSchema,
  created_by_id: z.string().startsWith(UID_PREFIXES.USER),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  deleted_at: z.iso.datetime().nullable(),
});

export const compensationLineItemListResponseSchema
  = createPaginatedResponseSchema(compensationLineItemApiResponseSchema);
