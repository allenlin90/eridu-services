import { Injectable } from '@nestjs/common';

import { CANCELLATION_GATE_CONFIG, type GateKind } from '@eridu/api-types/shows';

import { AuditService } from '@/models/audit/audit.service';
import type { AuditWithTargets } from '@/models/audit/schemas/audit.schema';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';

export type ActorTier = 'manager' | 'duty_manager';

export type GateAuditMetadata = {
  field: 'show_status';
  event: 'opened' | 'note_updated' | 'resolved';
  gate_kind: GateKind;
  old_value: string | null;
  new_value: string | null;
  reason_category?: string;
  actor_uid: string;
  actor_name: string;
};

export type CancellationHistoryEntryResult = {
  event: 'opened' | 'note_updated' | 'resolved';
  actor: { uid: string; name: string } | null;
  at: Date;
  note: string | null;
  outcome: string | null;
};

export type CancellationStatusResult = {
  isPending: boolean;
  gateKind: GateKind | null;
  fromStatus: string | null;
  reasonCategory: string | null;
  reasonNote: string | null;
  openedBy: { uid: string; name: string } | null;
  openedAt: Date | null;
  allowedOutcomes: string[];
  history: CancellationHistoryEntryResult[];
};

const NOT_PENDING_RESULT: CancellationStatusResult = {
  isPending: false,
  gateKind: null,
  fromStatus: null,
  reasonCategory: null,
  reasonNote: null,
  openedBy: null,
  openedAt: null,
  allowedOutcomes: [],
  history: [],
};

// Audit.metadata is Prisma's untyped Json column (Prisma.JsonValue), not
// GateAuditMetadata directly — narrow via a plain function instead of a type
// predicate, since JsonValue and GateAuditMetadata don't structurally
// overlap enough for TS to narrow safely with `is`.
function getGateMetadata(audit: AuditWithTargets): GateAuditMetadata | null {
  const metadata = audit.metadata as unknown as Partial<GateAuditMetadata> | null;
  if (metadata?.field !== 'show_status') {
    return null;
  }
  return metadata as GateAuditMetadata;
}

/**
 * Owns the show cancellation gate: who may act (Manager tier is always
 * static-role; Duty Manager tier is the time-windowed shift flag, checked
 * only when Manager tier doesn't apply) and what the "live" pending snapshot
 * is. No Task/TaskTarget usage anywhere — Show.status is the gate state,
 * Audit is the only persistence. See
 * docs/superpowers/specs/2026-06-26-show-state-gate-v2-design.md.
 */
@Injectable()
export class ShowCancellationGateService {
  constructor(
    private readonly studioShiftService: StudioShiftService,
    private readonly auditService: AuditService,
  ) {}

  async resolveActorTier(
    studioUid: string,
    studioRole: string | undefined,
    actor: { id: bigint },
  ): Promise<ActorTier | null> {
    if (studioRole === 'admin' || studioRole === 'manager') {
      return 'manager';
    }

    const dutyManagerShift = await this.studioShiftService.findActiveDutyManager(studioUid, new Date());
    if (dutyManagerShift && dutyManagerShift.user.id === actor.id) {
      return 'duty_manager';
    }

    return null;
  }

  async getCancellationStatus(
    show: { id: bigint; showStatus: { systemKey: string | null } | null },
  ): Promise<CancellationStatusResult> {
    if (show.showStatus?.systemKey !== 'CANCELLED_PENDING_RESOLUTION') {
      return NOT_PENDING_RESULT;
    }

    const audits = await this.auditService.findForTargets([{ targetType: 'SHOW', targetId: show.id }]);
    const gateEntries = audits
      .map((audit) => ({ audit, meta: getGateMetadata(audit) }))
      .filter((entry): entry is { audit: AuditWithTargets; meta: GateAuditMetadata } => entry.meta !== null);

    // findForTargets orders createdAt desc; at most one unresolved "opened"
    // cycle can exist while Show.status is pending (re-opening is blocked
    // elsewhere), so the topmost "opened" row is the current cycle's origin.
    const opened = gateEntries.find((e) => e.meta.event === 'opened');
    const latestNote = gateEntries.find((e) => e.meta.event === 'opened' || e.meta.event === 'note_updated');

    if (!opened || !latestNote) {
      return { ...NOT_PENDING_RESULT, isPending: true };
    }

    const gateKind = opened.meta.gate_kind;
    const config = CANCELLATION_GATE_CONFIG[gateKind];

    return {
      isPending: true,
      gateKind,
      fromStatus: opened.meta.old_value,
      reasonCategory: opened.meta.reason_category ?? null,
      reasonNote: latestNote.audit.reason,
      openedBy: { uid: opened.meta.actor_uid, name: opened.meta.actor_name },
      openedAt: opened.audit.createdAt,
      allowedOutcomes: [...config.allowedOutcomes],
      history: gateEntries
        .slice()
        .reverse() // chronological (oldest first) for display
        .map((e) => ({
          event: e.meta.event,
          actor: { uid: e.meta.actor_uid, name: e.meta.actor_name },
          at: e.audit.createdAt,
          note: e.audit.reason,
          outcome: e.meta.event === 'resolved' ? e.meta.new_value : null,
        })),
    };
  }
}
