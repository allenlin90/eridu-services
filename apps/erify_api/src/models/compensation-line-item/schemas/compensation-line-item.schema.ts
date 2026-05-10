import type { Prisma } from '@prisma/client';
import {
  CompensationItemType,
  CompensationLineItemTargetType,
} from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
  compensationLineItemApiResponseSchema,
  createAdminCompensationLineItemInputSchema,
  listCompensationLineItemsQuerySchema as sharedListCompensationLineItemsQuerySchema,
  updateCompensationLineItemInputSchema,
} from '@eridu/api-types/compensation-line-items';

import { StudioService } from '@/models/studio/studio.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { UserService } from '@/models/user/user.service';

const COMPENSATION_LINE_ITEM_UID_PREFIX = 'cli';

export type CreateAdminCompensationLineItemPayload = z.infer<
  typeof createAdminCompensationLineItemSchema
>;
export type UpdateCompensationLineItemPayload = z.infer<
  typeof updateCompensationLineItemSchema
>;
export type ListCompensationLineItemsQuery = z.infer<
  typeof listCompensationLineItemsQuerySchema
>;

export type CompensationLineItemWithRelations
  = Prisma.CompensationLineItemGetPayload<{
    include: typeof compensationLineItemDefaultInclude;
  }>;

function decimalToString(value: unknown): string {
  if (
    value
    && typeof value === 'object'
    && 'toString' in value
    && typeof value.toString === 'function'
  ) {
    return value.toString();
  }

  return String(value);
}

function getTargetUid(obj: {
  targetType: CompensationLineItemTargetType;
  show?: { uid: string } | null;
  showCreator?: { uid: string } | null;
  studioShift?: { uid: string } | null;
  studioShiftBlock?: { uid: string } | null;
}) {
  switch (obj.targetType) {
    case CompensationLineItemTargetType.SHOW:
      return obj.show?.uid;
    case CompensationLineItemTargetType.SHOW_CREATOR:
      return obj.showCreator?.uid;
    case CompensationLineItemTargetType.STUDIO_SHIFT:
      return obj.studioShift?.uid;
    case CompensationLineItemTargetType.STUDIO_SHIFT_BLOCK:
      return obj.studioShiftBlock?.uid;
  }
}

export const createAdminCompensationLineItemSchema
  = createAdminCompensationLineItemInputSchema.transform((data) => ({
    studioId: data.studio_id,
    targetType: data.target_type as CompensationLineItemTargetType,
    targetUid: data.target_uid,
    amount: data.amount,
    itemType: data.item_type as CompensationItemType,
    reason: data.reason,
    metadata: data.metadata,
  }));

export const updateCompensationLineItemSchema
  = updateCompensationLineItemInputSchema.transform((data) => ({
    amount: data.amount,
    itemType: data.item_type as CompensationItemType | undefined,
    reason: data.reason,
    metadata: data.metadata,
  }));

export const listCompensationLineItemsQuerySchema
  = sharedListCompensationLineItemsQuerySchema.transform((data) => ({
    ...data,
    targetType: data.targetType as CompensationLineItemTargetType | undefined,
    itemType: data.itemType as CompensationItemType | undefined,
  }));

export const compensationLineItemDefaultInclude = {
  studio: {
    select: { uid: true },
  },
  createdBy: {
    select: { uid: true },
  },
  show: {
    select: { uid: true },
  },
  showCreator: {
    select: { uid: true },
  },
  studioShift: {
    select: { uid: true },
  },
  studioShiftBlock: {
    select: { uid: true },
  },
} as const;

const compensationLineItemInternalSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(COMPENSATION_LINE_ITEM_UID_PREFIX),
  studioId: z.bigint(),
  amount: z.unknown(),
  itemType: z.nativeEnum(CompensationItemType),
  reason: z.string(),
  targetType: z.nativeEnum(CompensationLineItemTargetType),
  targetId: z.bigint(),
  showId: z.bigint().nullable(),
  showCreatorId: z.bigint().nullable(),
  studioShiftId: z.bigint().nullable(),
  studioShiftBlockId: z.bigint().nullable(),
  createdById: z.bigint(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  studio: z.object({ uid: z.string().startsWith(StudioService.UID_PREFIX) }),
  createdBy: z.object({ uid: z.string().startsWith(UserService.UID_PREFIX) }),
  show: z.object({ uid: z.string() }).nullable(),
  showCreator: z.object({ uid: z.string() }).nullable(),
  studioShift: z
    .object({ uid: z.string().startsWith(StudioShiftService.UID_PREFIX) })
    .nullable(),
  studioShiftBlock: z
    .object({ uid: z.string().startsWith(StudioShiftService.BLOCK_UID_PREFIX) })
    .nullable(),
});

export const compensationLineItemDto = compensationLineItemInternalSchema
  .transform((obj) => {
    const targetUid = getTargetUid(obj);
    if (!targetUid) {
      throw new Error(`Missing target relation for compensation line item ${obj.uid}`);
    }

    return {
      id: obj.uid,
      studio_id: obj.studio.uid,
      target_type: obj.targetType,
      target_id: targetUid,
      amount: decimalToString(obj.amount),
      item_type: obj.itemType,
      reason: obj.reason,
      metadata: obj.metadata,
      created_by_id: obj.createdBy.uid,
      created_at: obj.createdAt.toISOString(),
      updated_at: obj.updatedAt.toISOString(),
      deleted_at: obj.deletedAt?.toISOString() ?? null,
    };
  })
  .pipe(compensationLineItemApiResponseSchema);

export class CreateAdminCompensationLineItemDto extends createZodDto(
  createAdminCompensationLineItemSchema,
) {}

export class UpdateCompensationLineItemDto extends createZodDto(
  updateCompensationLineItemSchema,
) {}

export class ListCompensationLineItemsQueryDto extends createZodDto(
  listCompensationLineItemsQuerySchema,
) {
  declare page: number;
  declare limit: number;
  declare skip: number;
  declare take: number;
  declare sort: 'asc' | 'desc';
  declare studioId: string | undefined;
  declare targetType: CompensationLineItemTargetType | undefined;
  declare targetUid: string | undefined;
  declare itemType: CompensationItemType | undefined;
  declare createdByUid: string | undefined;
  declare from: Date | undefined;
  declare to: Date | undefined;
  declare includeDeleted: boolean;
}
