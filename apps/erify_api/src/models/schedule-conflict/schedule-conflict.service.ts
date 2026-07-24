import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type {
  ApplyConflictParams,
  CheckEligibilityParams,
  CheckEligibilityResult,
  DismissConflictParams,
  HeldBackFieldValue,
  ReconcileShowConflictParams,
  ResolveConflictResult,
  ScheduleConflictHeldBack,
} from './schedule-conflict.types';
import { FK_FIELD_MODEL_MAP, isNoLongerEligible } from './schedule-conflict.types';

import { HttpError } from '@/lib/errors/http-error.util';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { AuditService } from '@/models/audit/audit.service';
import type { AuditWithTargets } from '@/models/audit/schemas/audit.schema';

export const CONFLICT_UID_PREFIX = 'conflict';
const SCHEDULE_PUBLISH_IMPACT_EVENT = 'schedule_publish_impact';
const STALE_CONFLICT_IMPACT_KIND = 'stale_conflict';
const SCHEDULE_PUBLISH_SOURCE = 'google_sheets_schedule_publish';

type StaleConflictMetadata = {
  event: typeof SCHEDULE_PUBLISH_IMPACT_EVENT;
  impact_kind: typeof STALE_CONFLICT_IMPACT_KIND;
  conflict_uid: string;
  lifecycle: 'opened' | 'resolved';
  schedule_uid: string;
  external_id: string | null;
  conflict_type: 'update_held_back' | 'removal_held_back';
  held_back: {
    show_fields: { changed_fields: string[]; old: Record<string, unknown>; new: Record<string, unknown> } | null;
    show_creators: Array<{
      creator_uid: string;
      action: 'update' | 'remove';
      old_note: string | null;
      new_note: string | null;
    }>;
    show_platforms: Array<{
      platform_uid: string;
      action: 'update' | 'remove';
      old: { live_stream_link: string | null; platform_show_id: string | null };
      new: { live_stream_link: string | null; platform_show_id: string | null };
    }>;
    proposed_status_transition: { from: string; to: string } | null;
  };
  source: typeof SCHEDULE_PUBLISH_SOURCE;
  resolves_conflict_uid?: string;
  outcome?: 'applied' | 'dismissed' | 'superseded' | 'auto_resolved_no_longer_conflicting';
};

@Injectable()
export class ScheduleConflictService {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly auditService: AuditService,
    private readonly uidGenerator: UidGeneratorService,
  ) {}

  /**
   * Opens, supersedes, or auto-resolves a show's stale-conflict Audit trail
   * for the current publish run. Must run inside the publish transaction,
   * after the caller has already acquired the schedule-level advisory lock —
   * this method additionally locks on `showId` so a concurrent resolve
   * request (see `applyConflict`/`dismissConflict`) can't race the same
   * conflict_uid's read-check-then-insert (spec: "the same lock must also
   * guard publish's own reconciliation writes").
   */
  @Transactional()
  async reconcileShowConflict(params: ReconcileShowConflictParams): Promise<{ recorded: boolean }> {
    await this.lockShow(params.showId);

    const latest = await this.auditService.findLatestScheduleConflictForShow(params.showId);
    const pending = this.asPendingMetadata(latest);

    if (!params.heldBack) {
      if (pending) {
        await this.writeResolved(params.showId, pending, 'auto_resolved_no_longer_conflicting', null, params.publishRunId ?? null);
      }
      return { recorded: false };
    }

    const resolvedHeldBack = await this.resolveHeldBackLabels(params.heldBack);

    if (pending && this.sameHeldBack(pending.held_back, resolvedHeldBack)) {
      return { recorded: false };
    }

    if (pending) {
      await this.writeResolved(params.showId, pending, 'superseded', null, params.publishRunId ?? null);
    }

    await this.writeOpened(params, resolvedHeldBack);
    return { recorded: true };
  }

  @Transactional()
  async dismissConflict(params: DismissConflictParams): Promise<ResolveConflictResult> {
    await this.lockShow(params.showId);
    const pending = await this.requirePendingConflict(params.showId, params.conflictUid);

    await this.writeResolved(params.showId, pending, 'dismissed', { actorId: params.actorId, reason: params.reason });
    return { outcome: 'dismissed' };
  }

  /**
   * Determines whether a show is still eligible to have its pending conflict
   * applied and, if not, auto-resolves it on the spot. Must be invoked
   * directly by the caller (never nested inside another `@Transactional()`
   * call) so this method's transaction commits independently of whatever the
   * caller does next: a single transaction can't both durably write the
   * auto-resolve audit row AND propagate a `SHOW_NO_LONGER_ELIGIBLE` throw to
   * the caller, since Prisma rolls back the whole transaction on any throw.
   * The caller is expected to throw `SHOW_NO_LONGER_ELIGIBLE` itself once
   * this call returns `{ eligible: false }` and no transaction is open.
   */
  @Transactional()
  async checkEligibility(params: CheckEligibilityParams): Promise<CheckEligibilityResult> {
    await this.lockShow(params.showId);
    const pending = await this.requirePendingConflict(params.showId, params.conflictUid);

    if (isNoLongerEligible(pending.conflict_type, params.currentShowStatus)) {
      await this.writeResolved(params.showId, pending, 'auto_resolved_no_longer_conflicting', null);
      return { eligible: false };
    }
    return { eligible: true };
  }

  /**
   * Applies an already-eligibility-checked conflict. Re-acquires the
   * showId advisory lock (released when `checkEligibility`'s transaction
   * committed) and re-verifies the pending conflict, plus defensively
   * re-checks eligibility for the narrow race window between that call and
   * this one. If the show has become ineligible in that window, this simply
   * throws — nothing has been written yet in this transaction, so rollback
   * is safe; the conflict stays open and is picked up by the caller's next
   * resolve attempt or by schedule-publish reconciliation.
   */
  @Transactional()
  async applyConflict(params: ApplyConflictParams): Promise<ResolveConflictResult> {
    await this.lockShow(params.showId);
    const pending = await this.requirePendingConflict(params.showId, params.conflictUid);

    // Loaded only now, after the showId advisory lock is held — see
    // `ApplyConflictParams.loadCurrentState` — so the checks below compare
    // against fresh state, not a pre-lock snapshot.
    const { currentShowStatus, currentFieldValues, currentRelationValues } = await params.loadCurrentState();

    if (isNoLongerEligible(pending.conflict_type, currentShowStatus)) {
      throw HttpError.conflict('SHOW_NO_LONGER_ELIGIBLE');
    }

    const snapshotOld = pending.held_back.show_fields?.old ?? {};
    const fieldsDrifted = Object.entries(snapshotOld).some(([field, value]) => {
      return JSON.stringify(currentFieldValues[field] ?? null) !== JSON.stringify(this.unwrapForCompare(value));
    });

    // Relation entries need the same old-value/current-value check as show
    // fields: `show_fields` is null for a relation-only held-back conflict,
    // so without this a manager's edit to a creator note or platform link
    // made after the conflict opened would go undetected and get silently
    // overwritten by `applyHeldBackRelations`.
    const creatorsDrifted = pending.held_back.show_creators.some((entry) => {
      const currentNote = currentRelationValues.showCreators[entry.creator_uid];
      return currentNote === undefined || currentNote !== entry.old_note;
    });
    const platformsDrifted = pending.held_back.show_platforms.some((entry) => {
      const current = currentRelationValues.showPlatforms[entry.platform_uid];
      return !current
        || current.liveStreamLink !== entry.old.live_stream_link
        || current.platformShowId !== entry.old.platform_show_id;
    });

    if (fieldsDrifted || creatorsDrifted || platformsDrifted) {
      throw HttpError.conflict('CONFLICT_STATE_CHANGED');
    }

    await this.writeResolved(params.showId, pending, 'applied', { actorId: params.actorId, reason: params.reason });
    return { outcome: 'applied' };
  }

  /** FK-backed snapshot values are stored as `{uid, name}` — compare by uid, not the whole object, since the caller's `currentFieldValues` supplies a raw comparable value (uid string) for FK fields, per Task 6's controller wiring. */
  private unwrapForCompare(value: unknown): unknown {
    if (value && typeof value === 'object' && 'uid' in (value as Record<string, unknown>)) {
      return (value as { uid: string }).uid;
    }
    return value;
  }

  private async requirePendingConflict(showId: bigint, conflictUid: string): Promise<StaleConflictMetadata> {
    const latest = await this.auditService.findLatestScheduleConflictForShow(showId);
    const pending = this.asPendingMetadata(latest);
    if (!pending || pending.conflict_uid !== conflictUid) {
      throw HttpError.conflict('CONFLICT_ALREADY_RESOLVED');
    }
    return pending;
  }

  private async lockShow(showId: bigint): Promise<void> {
    const tx = this.txHost.tx;
    if (typeof tx.$executeRaw === 'function') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${showId})`;
    }
  }

  private asPendingMetadata(audit: AuditWithTargets | null): StaleConflictMetadata | null {
    if (!audit) {
      return null;
    }
    const metadata = audit.metadata as unknown as StaleConflictMetadata;
    return metadata.lifecycle === 'opened' ? metadata : null;
  }

  private async writeOpened(
    params: ReconcileShowConflictParams,
    heldBack: StaleConflictMetadata['held_back'],
  ): Promise<void> {
    const conflictUid = this.uidGenerator.generateBrandedId(CONFLICT_UID_PREFIX);
    const metadata: StaleConflictMetadata = {
      event: SCHEDULE_PUBLISH_IMPACT_EVENT,
      impact_kind: STALE_CONFLICT_IMPACT_KIND,
      conflict_uid: conflictUid,
      lifecycle: 'opened',
      schedule_uid: params.scheduleUid,
      external_id: params.externalId,
      conflict_type: params.conflictType,
      held_back: heldBack,
      source: SCHEDULE_PUBLISH_SOURCE,
    };

    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: params.actorId,
      reason: null,
      metadata: metadata as unknown as Record<string, unknown>,
      publishRunId: params.publishRunId ?? null,
      targets: [{ targetType: 'SHOW', targetId: params.showId }],
    });
  }

  private async writeResolved(
    showId: bigint,
    pending: StaleConflictMetadata,
    outcome: 'applied' | 'dismissed' | 'superseded' | 'auto_resolved_no_longer_conflicting',
    resolution: { actorId: bigint; reason: string } | null,
    // Only publish-driven reconciliation carries a run id; manual resolve
    // paths (apply/dismiss/eligibility) write outside any publish batch.
    publishRunId: bigint | null = null,
  ): Promise<void> {
    const metadata: StaleConflictMetadata = {
      ...pending,
      lifecycle: 'resolved',
      resolves_conflict_uid: pending.conflict_uid,
      outcome,
    };

    await this.auditService.create({
      action: 'OVERRIDE',
      actorId: resolution?.actorId ?? null,
      reason: resolution?.reason ?? null,
      metadata: metadata as unknown as Record<string, unknown>,
      publishRunId,
      targets: [{ targetType: 'SHOW', targetId: showId }],
    });
  }

  private sameHeldBack(a: StaleConflictMetadata['held_back'], b: StaleConflictMetadata['held_back']): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Resolves every FK-backed field in `held_back.show_fields` to `{uid, name}`
   * before it's written into `Audit.metadata` — this must happen at write
   * time since the API later serializes the stored JSON directly (spec line 64).
   */
  private async resolveHeldBackLabels(heldBack: ScheduleConflictHeldBack): Promise<StaleConflictMetadata['held_back']> {
    const showFields = heldBack.showFields
      ? {
          changed_fields: heldBack.showFields.changedFields,
          old: await this.resolveFieldRecord(heldBack.showFields.changedFields, heldBack.showFields.old),
          new: await this.resolveFieldRecord(heldBack.showFields.changedFields, heldBack.showFields.new),
        }
      : null;

    return {
      show_fields: showFields,
      show_creators: heldBack.showCreators.map((c) => ({
        creator_uid: c.creatorUid,
        action: c.action,
        old_note: c.oldNote,
        new_note: c.newNote,
      })),
      show_platforms: heldBack.showPlatforms.map((p) => ({
        platform_uid: p.platformUid,
        action: p.action,
        old: { live_stream_link: p.old.liveStreamLink, platform_show_id: p.old.platformShowId },
        new: { live_stream_link: p.new.liveStreamLink, platform_show_id: p.new.platformShowId },
      })),
      proposed_status_transition: heldBack.proposedStatusTransition,
    };
  }

  private async resolveFieldRecord(
    changedFields: string[],
    values: Record<string, HeldBackFieldValue>,
  ): Promise<Record<string, unknown>> {
    const fkFields = changedFields.filter((field): field is keyof typeof FK_FIELD_MODEL_MAP => field in FK_FIELD_MODEL_MAP);
    const labelsByField = new Map<string, Map<bigint, { uid: string; name: string }>>();

    await Promise.all(fkFields.map(async (field) => {
      const model = FK_FIELD_MODEL_MAP[field];
      const id = values[field];
      if (typeof id !== 'bigint') {
        return;
      }
      const delegate = (this.txHost.tx as any)[model];
      const rows: Array<{ id: bigint; uid: string; name: string }> = await delegate.findMany({
        where: { id },
        select: { id: true, uid: true, name: true },
      });
      const map = new Map(rows.map((r) => [r.id, { uid: r.uid, name: r.name }]));
      labelsByField.set(field, map);
    }));

    const resolved: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(values)) {
      if (field in FK_FIELD_MODEL_MAP && typeof value === 'bigint') {
        resolved[field] = labelsByField.get(field)?.get(value) ?? null;
      } else {
        resolved[field] = value;
      }
    }
    return resolved;
  }
}
