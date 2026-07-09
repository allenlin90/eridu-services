import { Injectable } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type {
  ApplyConflictParams,
  DismissConflictParams,
  HeldBackFieldValue,
  ReconcileShowConflictParams,
  ResolveConflictResult,
  ScheduleConflictHeldBack,
} from './schedule-conflict.types';
import { FK_FIELD_MODEL_MAP, isNoLongerEligible } from './schedule-conflict.types';

import { HttpError } from '@/lib/errors/http-error.util';
import { AuditService } from '@/models/audit/audit.service';
import type { AuditWithTargets } from '@/models/audit/schemas/audit.schema';
import { UtilityService } from '@/utility/utility.service';

const CONFLICT_UID_PREFIX = 'conflict';
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
    show_creators: unknown[];
    show_platforms: unknown[];
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
    private readonly utilityService: UtilityService,
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
        await this.writeResolved(params.showId, pending, 'auto_resolved_no_longer_conflicting', null);
      }
      return { recorded: false };
    }

    const resolvedHeldBack = await this.resolveHeldBackLabels(params.heldBack);

    if (pending && this.sameHeldBack(pending.held_back, resolvedHeldBack)) {
      return { recorded: false };
    }

    if (pending) {
      await this.writeResolved(params.showId, pending, 'superseded', null);
    }

    await this.writeOpened(params, resolvedHeldBack);
    return { recorded: true };
  }

  async dismissConflict(params: DismissConflictParams): Promise<ResolveConflictResult> {
    await this.lockShow(params.showId);
    const pending = await this.requirePendingConflict(params.showId, params.conflictUid);

    await this.writeResolved(params.showId, pending, 'dismissed', { actorId: params.actorId, reason: params.reason });
    return { outcome: 'dismissed' };
  }

  async applyConflict(params: ApplyConflictParams): Promise<ResolveConflictResult> {
    await this.lockShow(params.showId);
    const pending = await this.requirePendingConflict(params.showId, params.conflictUid);

    if (isNoLongerEligible(pending.conflict_type, params.currentShowStatus)) {
      await this.writeResolved(params.showId, pending, 'auto_resolved_no_longer_conflicting', null);
      throw HttpError.conflict('SHOW_NO_LONGER_ELIGIBLE');
    }

    const snapshotOld = pending.held_back.show_fields?.old ?? {};
    const drifted = Object.entries(snapshotOld).some(([field, value]) => {
      return JSON.stringify(params.currentFieldValues[field] ?? null) !== JSON.stringify(this.unwrapForCompare(value));
    });
    if (drifted) {
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
    const conflictUid = this.utilityService.generateBrandedId(CONFLICT_UID_PREFIX);
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
      targets: [{ targetType: 'SHOW', targetId: params.showId }],
    });
  }

  private async writeResolved(
    showId: bigint,
    pending: StaleConflictMetadata,
    outcome: 'applied' | 'dismissed' | 'superseded' | 'auto_resolved_no_longer_conflicting',
    resolution: { actorId: bigint; reason: string } | null,
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
