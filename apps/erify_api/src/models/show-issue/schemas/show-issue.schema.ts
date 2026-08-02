import type { Prisma, ShowIssue } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import type {
  ShowIssueCategory,
  ShowIssueOrigin,
  ShowIssueResolutionCode,
  ShowIssueSeverity,
  ShowIssueStatus,
} from '@eridu/api-types/show-issues';
import {
  createShowIssueInputSchema,
  escalateShowIssueInputSchema,
  listShowIssuesFilterSchema,
  reopenShowIssueInputSchema,
  resolveShowIssueInputSchema,
  showIssueApiResponseSchema,
  updateShowIssueInputSchema,
} from '@eridu/api-types/show-issues';

import { paginationBaseSchema, transformPagination } from '@/lib/pagination/pagination.schema';

// Re-exported Prisma types for service/repository consumption (schemas CAN import Prisma)
export type ShowIssueRecord = ShowIssue;

/**
 * Eager-load shape shared by every repository read/write path. Small and
 * fixed — a dedicated `include` parameter is not exposed to callers.
 */
export const showIssueDetailInclude = {
  show: { select: { uid: true } },
  owner: { select: { uid: true, name: true } },
  createdBy: { select: { uid: true, name: true } },
  escalatedBy: { select: { uid: true, name: true } },
  resolvedBy: { select: { uid: true, name: true } },
  showCreator: { select: { uid: true } },
  showPlatformViolation: { select: { uid: true } },
} as const satisfies Prisma.ShowIssueInclude;

export type ShowIssueWithRelations = Prisma.ShowIssueGetPayload<{
  include: typeof showIssueDetailInclude;
}>;

// Domain-level payload for creating a show issue (service layer, internal
// bigint FKs — resolved from UIDs by the calling workflow service).
export type CreateShowIssuePayload = {
  showId: bigint;
  category: string;
  origin: string;
  severity: string;
  title: string;
  evidence?: string | null;
  ownerId?: bigint | null;
  dueAt?: Date | null;
  createdById?: bigint | null;
  // Typed automated-source FKs. Only ever set by the (future) reconciliation
  // workflow — the public manual-create path never populates these.
  showCreatorId?: bigint | null;
  showPlatformViolationId?: bigint | null;
};

// Domain-level payload for a generic field edit. `status` accepts only the
// "start" transition (`IN_PROGRESS`) — resolve/reopen/escalate are separate
// explicit workflow methods, each with their own version-checked write.
export type UpdateShowIssueFieldsPayload = {
  category?: string;
  severity?: string;
  status?: 'IN_PROGRESS';
  title?: string;
  evidence?: string | null;
  ownerId?: bigint | null;
  dueAt?: Date | null;
};

export type ResolveShowIssuePayload = {
  resolvedById: bigint | null;
  resolutionCode: string;
  resolutionNote: string;
};

export type EscalateShowIssuePayload = {
  escalatedById: bigint | null;
  escalationNote?: string | null;
};

export type ListShowIssuesFilters = {
  studioUid: string;
  showUid?: string;
  ownerUid?: string;
  status?: string;
  severity?: string;
  category?: string;
  origin?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
};

// ---------------------------------------------------------------------------
// API DTOs (snake_case in, transformed to camelCase payloads)
// ---------------------------------------------------------------------------

const createShowIssueTransformSchema = createShowIssueInputSchema.transform((data) => ({
  showId: data.show_id,
  category: data.category,
  severity: data.severity,
  title: data.title,
  evidence: data.evidence,
  ownerId: data.owner_id,
  dueAt: data.due_at ? new Date(data.due_at) : (data.due_at === null ? null : undefined),
}));
export class CreateShowIssueDto extends createZodDto(createShowIssueTransformSchema) {
  declare showId: string;
  declare category: ShowIssueCategory;
  declare severity: ShowIssueSeverity;
  declare title: string;
  declare evidence: string | null | undefined;
  declare ownerId: string | null | undefined;
  declare dueAt: Date | null | undefined;
}

const updateShowIssueTransformSchema = updateShowIssueInputSchema.transform((data) => ({
  version: data.version,
  category: data.category,
  severity: data.severity,
  status: data.status,
  title: data.title,
  evidence: data.evidence,
  ownerId: data.owner_id,
  dueAt: data.due_at ? new Date(data.due_at) : (data.due_at === null ? null : undefined),
}));
export class UpdateShowIssueDto extends createZodDto(updateShowIssueTransformSchema) {
  declare version: number;
  declare category: ShowIssueCategory | undefined;
  declare severity: ShowIssueSeverity | undefined;
  declare status: 'IN_PROGRESS' | undefined;
  declare title: string | undefined;
  declare evidence: string | null | undefined;
  declare ownerId: string | null | undefined;
  declare dueAt: Date | null | undefined;
}

const resolveShowIssueTransformSchema = resolveShowIssueInputSchema.transform((data) => ({
  version: data.version,
  resolutionCode: data.resolution_code,
  resolutionNote: data.resolution_note,
}));
export class ResolveShowIssueDto extends createZodDto(resolveShowIssueTransformSchema) {
  declare version: number;
  declare resolutionCode: ShowIssueResolutionCode;
  declare resolutionNote: string;
}

const reopenShowIssueTransformSchema = reopenShowIssueInputSchema.transform((data) => ({
  version: data.version,
  reason: data.reason,
}));
export class ReopenShowIssueDto extends createZodDto(reopenShowIssueTransformSchema) {
  declare version: number;
  declare reason: string;
}

const escalateShowIssueTransformSchema = escalateShowIssueInputSchema.transform((data) => ({
  version: data.version,
  escalationNote: data.escalation_note,
}));
export class EscalateShowIssueDto extends createZodDto(escalateShowIssueTransformSchema) {
  declare version: number;
  declare escalationNote: string | undefined;
}

// The shared `paginationQuerySchema` only requires `limit >= 1` with no
// ceiling, so the canonical collection composes its own bound (matching the
// 100-row cap used by the show-audits sub-resource) instead of accepting an
// unbounded `take` at the repository.
const listShowIssuesPaginationSchema = paginationBaseSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
});
const listShowIssuesQuerySchema = listShowIssuesPaginationSchema
  .and(listShowIssuesFilterSchema)
  .transform(transformPagination);
export class ListShowIssuesQueryDto extends createZodDto(listShowIssuesQuerySchema) {
  declare page: number;
  declare limit: number;
  declare take: number;
  declare skip: number;
  declare sort: 'asc' | 'desc';
  declare show_id?: string;
  declare owner_id?: string;
  declare status?: ShowIssueStatus;
  declare severity?: ShowIssueSeverity;
  declare category?: ShowIssueCategory;
  declare origin?: ShowIssueOrigin;
  declare date_from?: string;
  declare date_to?: string;
  declare search?: string;
}

// ---------------------------------------------------------------------------
// API response DTO (camelCase entity -> snake_case wire shape)
// ---------------------------------------------------------------------------

function actorRef(actor: { uid: string; name: string } | null | undefined) {
  return actor ? { uid: actor.uid, name: actor.name } : null;
}

export function toShowIssueApiResponse(issue: ShowIssueWithRelations) {
  return showIssueApiResponseSchema.parse({
    id: issue.uid,
    show_id: issue.show.uid,
    category: issue.category,
    origin: issue.origin,
    severity: issue.severity,
    status: issue.status,
    title: issue.title,
    evidence: issue.evidence ?? null,
    owner: actorRef(issue.owner),
    due_at: issue.dueAt?.toISOString() ?? null,
    created_by: actorRef(issue.createdBy),
    escalation_level: issue.escalationLevel,
    escalated_at: issue.escalatedAt?.toISOString() ?? null,
    escalated_by: actorRef(issue.escalatedBy),
    escalation_note: issue.escalationNote ?? null,
    resolved_at: issue.resolvedAt?.toISOString() ?? null,
    resolved_by: actorRef(issue.resolvedBy),
    resolution_code: issue.resolutionCode ?? null,
    resolution_note: issue.resolutionNote ?? null,
    show_creator_id: issue.showCreator?.uid ?? null,
    show_platform_violation_id: issue.showPlatformViolation?.uid ?? null,
    version: issue.version,
    created_at: issue.createdAt.toISOString(),
    updated_at: issue.updatedAt.toISOString(),
  });
}

export const showIssueApiResponseZodSchema = showIssueApiResponseSchema;

export type ShowIssueApiResponse = z.infer<typeof showIssueApiResponseSchema>;
