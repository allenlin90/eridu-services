import type { Task } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';

import {
  cancelStudioShowRequestSchema,
  resolveStudioShowCancellationRequestSchema,
  studioShowStateGateSchema,
} from '@eridu/api-types/shows';

import type { GateHistoryEntry } from '@/show-orchestration/show-state-gate.config';

const cancelStudioShowTransformSchema = cancelStudioShowRequestSchema.transform((data) => ({
  reasonCategory: data.reason_category,
  reasonNote: data.reason_note,
  resolutionOwnerMembershipId: data.resolution_owner_membership_id,
  followUpDueAt: data.follow_up_due_at,
  followUpNotes: data.follow_up_notes,
}));

const resolveStudioShowCancellationTransformSchema
  = resolveStudioShowCancellationRequestSchema.transform((data) => ({
    outcome: data.outcome,
    resolutionNotes: data.resolution_notes,
  }));

export class CancelStudioShowDto extends createZodDto(cancelStudioShowTransformSchema) {}
export class ResolveStudioShowCancellationDto extends createZodDto(resolveStudioShowCancellationTransformSchema) {}

export type GateTaskWithAssignee = Task & {
  assignee: { uid: string; name: string } | null;
};

export function toStudioShowStateGateDto(
  task: GateTaskWithAssignee | null,
  allowedOutcomes: readonly string[],
) {
  if (!task) {
    return studioShowStateGateSchema.parse(null);
  }

  const content = task.content as Record<string, unknown>;
  const metadata = task.metadata as Record<string, unknown>;

  return studioShowStateGateSchema.parse({
    id: task.uid,
    gate_kind: metadata.gate_kind,
    reason_category: (content.reason_category as string | undefined) ?? null,
    reason_note: (content.reason_note as string | undefined) ?? null,
    follow_up_notes: (content.follow_up_notes as string | undefined) ?? null,
    resolution_notes: (content.resolution_notes as string | undefined) ?? null,
    assignee_id: task.assignee?.uid ?? null,
    assignee_name: task.assignee?.name ?? null,
    from_status: metadata.from_status,
    allowed_outcomes: allowedOutcomes,
    history: (content.history as GateHistoryEntry[] | undefined) ?? [],
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
  });
}
