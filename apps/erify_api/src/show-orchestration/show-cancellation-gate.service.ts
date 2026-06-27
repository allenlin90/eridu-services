import { Injectable } from '@nestjs/common';
import type { Show } from '@prisma/client';

import { CANCELLATION_GATE_CONFIG, type GateKind, type GateOutcome } from '@eridu/api-types/shows';

import { GateNotificationService } from './gate-notification.service';

import { HttpError } from '@/lib/errors/http-error.util';
import { AuditService } from '@/models/audit/audit.service';
import type { AuditWithTargets } from '@/models/audit/schemas/audit.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowStatusService } from '@/models/show-status/show-status.service';
import { StudioShiftService } from '@/models/studio-shift/studio-shift.service';
import { TaskTargetService } from '@/models/task-target/task-target.service';

export type ActorTier = 'manager' | 'duty_manager';

export type GateAuditMetadata = {
  field: 'show_status';
  event: 'opened' | 'note_updated' | 'resolved';
  gate_kind: GateKind;
  old_value: string | null;
  new_value: string | null;
  reason_category?: string;
  actor_uid?: string;
  actor_name?: string;
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
    private readonly showRepository: ShowRepository,
    private readonly showStatusService: ShowStatusService,
    private readonly taskTargetService: TaskTargetService,
    private readonly gateNotificationService: GateNotificationService,
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
      openedBy: opened.meta.actor_uid ? { uid: opened.meta.actor_uid, name: opened.meta.actor_name! } : null,
      openedAt: opened.audit.createdAt,
      allowedOutcomes: [...config.allowedOutcomes],
      history: gateEntries
        .slice()
        .reverse() // chronological (oldest first) for display
        .map((e) => ({
          event: e.meta.event,
          actor: e.meta.actor_uid ? { uid: e.meta.actor_uid, name: e.meta.actor_name! } : null,
          at: e.audit.createdAt,
          note: e.audit.reason,
          outcome: e.meta.event === 'resolved' ? e.meta.new_value : null,
        })),
    };
  }

  async openPending(params: {
    show: Show;
    gateKind: GateKind;
    fromStatusSystemKey: string;
    reasonCategory: string;
    reasonNote: string;
    actor: { id: bigint; uid: string; name: string } | null;
  }): Promise<void> {
    const { show, gateKind, fromStatusSystemKey, reasonCategory, reasonNote, actor } = params;
    this.assertReasonCategoryAllowed(gateKind, reasonCategory);

    const [fromStatus, pendingStatus] = await Promise.all([
      this.requireShowStatusBySystemKey(fromStatusSystemKey),
      this.requireShowStatusBySystemKey('CANCELLED_PENDING_RESOLUTION'),
    ]);

    const updated = await this.showRepository.updateStatusIfPending(show.id, fromStatus.id, pendingStatus.id);
    if (!updated) {
      throw HttpError.conflict('SHOW_STATUS_CHANGED');
    }

    await this.writeGateAudit({
      showId: show.id,
      gateKind,
      event: 'opened',
      oldValue: fromStatusSystemKey,
      newValue: 'CANCELLED_PENDING_RESOLUTION',
      reasonCategory,
      note: reasonNote,
      actor,
    });
    this.gateNotificationService.notifyGateOpened(show, gateKind, { category: reasonCategory, note: reasonNote }, actor);
  }

  async resolveAtomic(params: {
    show: Show;
    gateKind: GateKind;
    fromStatusSystemKey: string;
    outcome: GateOutcome;
    reasonCategory: string;
    reasonNote: string;
    actor: { id: bigint; uid: string; name: string };
  }): Promise<void> {
    const { show, gateKind, fromStatusSystemKey, outcome, reasonCategory, reasonNote, actor } = params;
    this.assertReasonCategoryAllowed(gateKind, reasonCategory);
    this.assertOutcomeAllowed(gateKind, outcome);
    await this.assertActiveTaskGuard(gateKind, outcome, show.id);

    const [fromStatus, targetStatus] = await Promise.all([
      this.requireShowStatusBySystemKey(fromStatusSystemKey),
      this.requireShowStatusBySystemKey(outcome),
    ]);

    const updated = await this.showRepository.updateStatusIfPending(show.id, fromStatus.id, targetStatus.id);
    if (!updated) {
      throw HttpError.conflict('SHOW_STATUS_CHANGED');
    }

    await this.writeGateAudit({
      showId: show.id,
      gateKind,
      event: 'resolved',
      oldValue: fromStatusSystemKey,
      newValue: outcome,
      reasonCategory,
      note: reasonNote,
      actor,
    });
    this.gateNotificationService.notifyGateResolved(show, gateKind, outcome, actor);
  }

  async amendPendingNote(params: {
    showId: bigint;
    gateKind: GateKind;
    reasonNote: string;
    actor: { id: bigint; uid: string; name: string };
  }): Promise<void> {
    await this.writeGateAudit({
      showId: params.showId,
      gateKind: params.gateKind,
      event: 'note_updated',
      oldValue: null,
      newValue: null,
      note: params.reasonNote,
      actor: params.actor,
    });
  }

  async resolvePending(params: {
    show: Show;
    gateKind: GateKind;
    fromStatusSystemKey: string;
    outcome: string;
    resolutionNotes: string;
    actor: { id: bigint; uid: string; name: string } | null;
  }): Promise<void> {
    const { show, gateKind, fromStatusSystemKey, outcome, resolutionNotes, actor } = params;
    this.assertOutcomeAllowed(gateKind, outcome);
    await this.assertActiveTaskGuard(gateKind, outcome, show.id);

    const targetSystemKey = outcome === 'RESTORE_PREVIOUS' ? fromStatusSystemKey : outcome;
    const [pendingStatus, targetStatus] = await Promise.all([
      this.requireShowStatusBySystemKey('CANCELLED_PENDING_RESOLUTION'),
      this.requireShowStatusBySystemKey(targetSystemKey),
    ]);

    const updated = await this.showRepository.updateStatusIfPending(show.id, pendingStatus.id, targetStatus.id);
    if (!updated) {
      throw HttpError.conflict('SHOW_ALREADY_RESOLVED');
    }

    await this.writeGateAudit({
      showId: show.id,
      gateKind,
      event: 'resolved',
      oldValue: 'CANCELLED_PENDING_RESOLUTION',
      newValue: targetSystemKey,
      note: resolutionNotes,
      actor,
    });
    this.gateNotificationService.notifyGateResolved(show, gateKind, outcome, actor);
  }

  private assertReasonCategoryAllowed(gateKind: GateKind, reasonCategory: string): void {
    const config = CANCELLATION_GATE_CONFIG[gateKind];
    if (!(config.reasonOptions as readonly string[]).includes(reasonCategory)) {
      throw HttpError.badRequest(`REASON_CATEGORY_NOT_ALLOWED:${reasonCategory}`);
    }
  }

  private assertOutcomeAllowed(gateKind: GateKind, outcome: string): void {
    const config = CANCELLATION_GATE_CONFIG[gateKind];
    if (!(config.allowedOutcomes as readonly string[]).includes(outcome)) {
      throw HttpError.badRequest(`OUTCOME_NOT_ALLOWED:${outcome}`);
    }
  }

  private async assertActiveTaskGuard(gateKind: GateKind, outcome: string, showId: bigint): Promise<void> {
    const config = CANCELLATION_GATE_CONFIG[gateKind];
    if (!(config.outcomesRequiringNoActiveTasks as readonly string[]).includes(outcome)) {
      return;
    }
    const activeTaskCount = await this.taskTargetService.countActiveByShowId(showId);
    if (activeTaskCount > 0) {
      throw HttpError.badRequestWithDetails(`ACTIVE_TASKS_REMAIN:${showId}`, { activeTaskCount });
    }
  }

  private async requireShowStatusBySystemKey(systemKey: string): Promise<{ id: bigint }> {
    const status = await this.showStatusService.getShowStatusBySystemKey(systemKey);
    if (!status) {
      throw HttpError.notFound('ShowStatus', systemKey);
    }
    return status;
  }

  private async writeGateAudit(params: {
    showId: bigint;
    gateKind: GateKind;
    event: GateAuditMetadata['event'];
    oldValue: string | null;
    newValue: string | null;
    reasonCategory?: string;
    note: string;
    actor: { id: bigint; uid: string; name: string } | null;
  }): Promise<void> {
    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: params.actor?.id ?? null,
      reason: params.note,
      metadata: {
        field: 'show_status',
        event: params.event,
        gate_kind: params.gateKind,
        old_value: params.oldValue,
        new_value: params.newValue,
        ...(params.reasonCategory !== undefined && { reason_category: params.reasonCategory }),
        ...(params.actor !== null && { actor_uid: params.actor.uid, actor_name: params.actor.name }),
      },
      targets: [{ targetType: 'SHOW', targetId: params.showId }],
    });
  }
}
