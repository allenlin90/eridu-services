import type { Prisma } from '@prisma/client';
import z from 'zod';

import {
  showCancellationFinalDispositionSchema,
  showCancellationReasonCategorySchema,
  studioShowCancellationResolutionSchema,
} from '@eridu/api-types/shows';

import { SHOW_CANCELLATION_RESOLUTION_UID_PREFIX } from '../show-cancellation-resolution-uid.util';

import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { UserService } from '@/models/user/user.service';

export type ShowCancellationResolutionInclude = Prisma.ShowCancellationResolutionInclude;
export type ShowCancellationResolutionWithPayload<T extends ShowCancellationResolutionInclude> =
  Prisma.ShowCancellationResolutionGetPayload<{ include: T }>;

export type CreatePendingShowCancellationResolutionPayload = {
  showId: bigint;
  reasonCategory: z.infer<typeof showCancellationReasonCategorySchema>;
  reasonNote?: string | null;
  resolutionOwnerMembershipId: bigint;
  followUpDueAt?: Date | null;
  followUpNotes?: string | null;
  createdById?: bigint | null;
};

export type ResolveShowCancellationResolutionPayload = {
  finalDisposition: z.infer<typeof showCancellationFinalDispositionSchema>;
  resolutionNotes: string;
  resolvedById?: bigint | null;
};

export const showCancellationResolutionOwnerInclude = {
  resolutionOwnerMembership: {
    select: {
      uid: true,
      user: {
        select: {
          uid: true,
          name: true,
        },
      },
    },
  },
} as const satisfies Prisma.ShowCancellationResolutionInclude;

export const showCancellationResolutionSchema = z.object({
  id: z.bigint(),
  uid: z.string().startsWith(SHOW_CANCELLATION_RESOLUTION_UID_PREFIX),
  showId: z.bigint(),
  reasonCategory: showCancellationReasonCategorySchema,
  reasonNote: z.string().nullable(),
  resolutionOwnerMembershipId: z.bigint().nullable(),
  followUpDueAt: z.date().nullable(),
  followUpNotes: z.string().nullable(),
  finalDisposition: showCancellationFinalDispositionSchema.nullable(),
  resolutionNotes: z.string().nullable(),
  createdById: z.bigint().nullable(),
  resolvedById: z.bigint().nullable(),
  resolvedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const showCancellationResolutionWithOwnerSchema = showCancellationResolutionSchema.extend({
  resolutionOwnerMembership: z.object({
    uid: z.string().startsWith(StudioMembershipService.UID_PREFIX),
    user: z.object({
      uid: z.string().startsWith(UserService.UID_PREFIX),
      name: z.string(),
    }),
  }).nullable().optional(),
});

export const showCancellationResolutionDto = showCancellationResolutionWithOwnerSchema
  .transform((obj) => ({
    id: obj.uid,
    reason_category: obj.reasonCategory,
    reason_note: obj.reasonNote,
    resolution_owner_membership_id: obj.resolutionOwnerMembership?.uid ?? null,
    resolution_owner_user_id: obj.resolutionOwnerMembership?.user.uid ?? null,
    resolution_owner_name: obj.resolutionOwnerMembership?.user.name ?? null,
    follow_up_due_at: obj.followUpDueAt?.toISOString() ?? null,
    follow_up_notes: obj.followUpNotes,
    final_disposition: obj.finalDisposition,
    resolution_notes: obj.resolutionNotes,
    resolved_at: obj.resolvedAt?.toISOString() ?? null,
    created_at: obj.createdAt.toISOString(),
    updated_at: obj.updatedAt.toISOString(),
  }))
  .pipe(studioShowCancellationResolutionSchema);
