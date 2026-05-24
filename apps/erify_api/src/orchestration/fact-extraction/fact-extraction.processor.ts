import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { ActualsSource, AuditMetadata, AuditTargetType } from '@eridu/api-types/audits';
import type { SystemFactKey } from '@eridu/api-types/task-management';

import { LATE_REASON_FALLBACK } from './extractors/creator-attendance-reasons';
import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractors/extractor.types';
import { canResolverOverwrite } from './source-priority';

import { AuditService } from '@/models/audit/audit.service';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

export type ProcessedFact = {
  decision: ExtractionDecision;
  auditUid?: string;
};

type ShowActualsSourceMap = Partial<Record<SystemFactKey, ActualsSource>>;
type ShowMetadataShape = { actuals_source?: ShowActualsSourceMap } & Record<string, unknown>;

export type PairedShowActualsInput = {
  startFact: ExtractedFact;
  endFact: ExtractedFact;
  startIncoming: Date;
  endIncoming: Date;
  ctx: ExtractionContext;
  targetIds: { targetType: AuditTargetType; targetId: bigint }[];
};

export type PairedShowActualsResult = {
  start: ProcessedFact;
  end: ProcessedFact;
};

export type PairedShowPlatformActualsInput = {
  /** UID of the ShowPlatform target — both sides paired against the same row. */
  showPlatformUid: string;
  startFact: ExtractedFact;
  endFact: ExtractedFact;
  startIncoming: Date;
  endIncoming: Date;
  ctx: ExtractionContext;
  targetIds: { targetType: AuditTargetType; targetId: bigint }[];
};

export type PairedShowPlatformActualsResult = PairedShowActualsResult;

export type PairedShowCreatorActualsInput = {
  showCreatorUid: string;
  startFact: ExtractedFact;
  endFact: ExtractedFact;
  startIncoming: Date;
  endIncoming: Date;
  ctx: ExtractionContext;
  targetIds: { targetType: AuditTargetType; targetId: bigint }[];
};

export type PairedShowCreatorActualsResult = PairedShowActualsResult;

/**
 * Per-fact transactional boundary for the extraction pipeline. The indexed
 * column write performed by the extractor and the audit envelope written by
 * the orchestrator must succeed or fail together — otherwise a failed audit
 * leaves a column write with no history, which the design (§2.B, §3.C)
 * explicitly forbids.
 *
 * Extracted into its own service because `@Transactional()` is wired via the
 * NestJS DI proxy and cannot intercept a `this.method()` call within the
 * same class. See `.agent/skills/orchestration-service-nestjs/SKILL.md` —
 * "Why a Separate Processor Service?".
 */
@Injectable()
export class FactExtractionProcessor {
  constructor(
    private readonly auditService: AuditService,
    private readonly showService: ShowService,
    private readonly showCreatorService: ShowCreatorService,
    private readonly showPlatformService: ShowPlatformService,
  ) {}

  /**
   * Runs the extractor and persists its audit envelope in a single CLS
   * transaction. The caller (`FactExtractionService`) is responsible for
   * resolving the target ids — passing them in keeps this method free of
   * scope-specific knowledge and avoids re-doing the lookup post-decision.
   *
   * Either both writes commit or both roll back. Errors propagate to the
   * caller which logs them; the outer orchestrator swallows so the task
   * submission still resolves.
   */
  @Transactional()
  async applyAndAudit(
    extractor: IngestionExtractor,
    fact: ExtractedFact,
    ctx: ExtractionContext,
    targetIds: { targetType: AuditTargetType; targetId: bigint }[],
  ): Promise<ProcessedFact> {
    const decision = await extractor.apply(fact, ctx);

    // `noop` carries no DB write, so no audit either.
    if (decision.kind === 'noop' || targetIds.length === 0) {
      return { decision };
    }

    const baseMetadata: AuditMetadata = {
      ingestion_source: 'task_submission',
      task_uid: ctx.taskUid,
      task_field_id: fact.sourceFieldId,
      fact_key: fact.factKey,
    };

    if (decision.kind === 'write') {
      const audit = await this.auditService.create({
        action: decision.action,
        actorId: null,
        metadata: {
          ...baseMetadata,
          old_value: decision.oldValue as AuditMetadata['old_value'],
          new_value: decision.newValue as AuditMetadata['new_value'],
        },
        targets: targetIds,
      });
      return { decision, auditUid: audit.uid };
    }

    const audit = await this.auditService.create({
      action: decision.action,
      actorId: null,
      metadata: {
        ...baseMetadata,
        skipped_by_source: decision.skippedBy,
        attempted_value: decision.attemptedValue as AuditMetadata['old_value'],
      },
      targets: targetIds,
    });
    return { decision, auditUid: audit.uid };
  }

  /**
   * Atomic paired write for `show_actual_start_time` + `show_actual_end_time`.
   *
   * Codex P1 review on PR #101: validating each side against a pre-parsed
   * counterpart computed before the per-fact loop is racy — the counterpart
   * write can become unwritable (concurrent higher-priority write lands, or
   * the paired extractor throws and rolls back) before the second extractor
   * runs, leaving the surviving write against an unpersistable incoming
   * value. The only race-free fix is a single transactional read +
   * priority-check + merged-pair validation + combined `updateShow` + per-
   * side audit write. Either both sides succeed (with the correct subset
   * actually persisting after priority filter) or both are rolled back.
   *
   * Caller (`FactExtractionService.extractFromTask`) is responsible for
   * filtering: collisions are routed to the collision-skip audit path
   * before this method runs, and unparseable / absent values prevent the
   * paired path entirely. Both facts handed in MUST be non-absent and
   * parseable.
   */
  @Transactional()
  async applyPairedShowActuals(input: PairedShowActualsInput): Promise<PairedShowActualsResult> {
    const show = await this.showService.getShowById(input.ctx.showUid);
    const metadata = (show.metadata as ShowMetadataShape | null) ?? {};
    const recordedSourceMap: ShowActualsSourceMap = metadata.actuals_source ?? {};

    const startRecorded = recordedSourceMap.show_actual_start_time;
    const endRecorded = recordedSourceMap.show_actual_end_time;
    const startCanWrite = canResolverOverwrite(input.ctx.source, startRecorded);
    const endCanWrite = canResolverOverwrite(input.ctx.source, endRecorded);

    const startCurrent = show.actualStartTime;
    const endCurrent = show.actualEndTime;
    const startUnchanged = startCanWrite
      && startCurrent !== null
      && startCurrent.getTime() === input.startIncoming.getTime()
      && startRecorded === input.ctx.source;
    const endUnchanged = endCanWrite
      && endCurrent !== null
      && endCurrent.getTime() === input.endIncoming.getTime()
      && endRecorded === input.ctx.source;

    const startEffectiveWrite = startCanWrite && !startUnchanged;
    const endEffectiveWrite = endCanWrite && !endUnchanged;

    // Validate the MERGED-FINAL state only when at least one side will
    // actually move. Gating on effective-write (not `canWrite`) keeps
    // no-op submissions idempotent against shows whose stored pair is
    // already inverted — the `updateShow` path itself does not enforce
    // actual-time ordering, so legacy / out-of-band writes can leave one.
    // A pure-resubmission of the recorded values must not surface as
    // `extractor_error` when nothing would have changed.
    if (startEffectiveWrite || endEffectiveWrite) {
      this.showService.ensureValidActualTimeRange(
        startCurrent,
        endCurrent,
        {
          ...(startEffectiveWrite ? { actualStartTime: input.startIncoming } : {}),
          ...(endEffectiveWrite ? { actualEndTime: input.endIncoming } : {}),
        },
      );
    }

    // Build the combined updateShow payload — one DB write covers both
    // columns and the metadata.actuals_source map. Skip the update entirely
    // when neither side actually changes; the audit table still reflects
    // the per-side skip/noop outcomes below.
    if (startEffectiveWrite || endEffectiveWrite) {
      const nextActualsSource: ShowActualsSourceMap = {
        ...recordedSourceMap,
        ...(startEffectiveWrite ? { show_actual_start_time: input.ctx.source } : {}),
        ...(endEffectiveWrite ? { show_actual_end_time: input.ctx.source } : {}),
      };
      const nextMetadata: ShowMetadataShape = { ...metadata, actuals_source: nextActualsSource };
      await this.showService.updateShow(input.ctx.showUid, {
        ...(startEffectiveWrite ? { actualStartTime: input.startIncoming } : {}),
        ...(endEffectiveWrite ? { actualEndTime: input.endIncoming } : {}),
        metadata: nextMetadata as unknown as Parameters<ShowService['updateShow']>[1]['metadata'],
      });
    }

    const start = await this.recordPairedSideDecision({
      fact: input.startFact,
      ctx: input.ctx,
      targetIds: input.targetIds,
      canWrite: startCanWrite,
      unchanged: startUnchanged,
      currentValue: startCurrent,
      incoming: input.startIncoming,
      recordedSource: startRecorded,
    });
    const end = await this.recordPairedSideDecision({
      fact: input.endFact,
      ctx: input.ctx,
      targetIds: input.targetIds,
      canWrite: endCanWrite,
      unchanged: endUnchanged,
      currentValue: endCurrent,
      incoming: input.endIncoming,
      recordedSource: endRecorded,
    });
    return { start, end };
  }

  @Transactional()
  async applyPairedShowCreatorActuals(
    input: PairedShowCreatorActualsInput,
  ): Promise<PairedShowCreatorActualsResult> {
    let showCreator: Awaited<ReturnType<ShowCreatorService['getShowCreatorById']>>;
    try {
      showCreator = await this.showCreatorService.getShowCreatorById(
        input.showCreatorUid,
        { includeShow: true },
      );
    } catch (err) {
      if (err instanceof NotFoundException) {
        const decision: ExtractionDecision = { kind: 'noop', reason: 'target_stale' };
        return { start: { decision }, end: { decision } };
      }
      throw err;
    }
    if (!showCreator || showCreator.showId !== input.ctx.showId) {
      const decision: ExtractionDecision = { kind: 'noop', reason: 'target_stale' };
      return { start: { decision }, end: { decision } };
    }

    const metadata = (showCreator.metadata as ShowMetadataShape | null) ?? {};
    const recordedSourceMap: ShowActualsSourceMap = metadata.actuals_source ?? {};

    const startRecorded = recordedSourceMap.creator_actual_start_time;
    const endRecorded = recordedSourceMap.creator_actual_end_time;
    const startCanWrite = canResolverOverwrite(input.ctx.source, startRecorded);
    const endCanWrite = canResolverOverwrite(input.ctx.source, endRecorded);

    const startCurrent = showCreator.actualStartTime;
    const endCurrent = showCreator.actualEndTime;
    const startUnchanged = startCanWrite
      && startCurrent !== null
      && startCurrent.getTime() === input.startIncoming.getTime()
      && startRecorded === input.ctx.source;
    const endUnchanged = endCanWrite
      && endCurrent !== null
      && endCurrent.getTime() === input.endIncoming.getTime()
      && endRecorded === input.ctx.source;

    const startEffectiveWrite = startCanWrite && !startUnchanged;
    const endEffectiveWrite = endCanWrite && !endUnchanged;

    if (startEffectiveWrite || endEffectiveWrite) {
      this.showCreatorService.ensureValidActualTimeRange(
        startCurrent,
        endCurrent,
        {
          ...(startEffectiveWrite ? { actualStartTime: input.startIncoming } : {}),
          ...(endEffectiveWrite ? { actualEndTime: input.endIncoming } : {}),
        },
      );
    }

    if (startEffectiveWrite || endEffectiveWrite) {
      const nextActualsSource: ShowActualsSourceMap = {
        ...recordedSourceMap,
        ...(startEffectiveWrite ? { creator_actual_start_time: input.ctx.source } : {}),
        ...(endEffectiveWrite ? { creator_actual_end_time: input.ctx.source } : {}),
      };
      const nextMetadata: ShowMetadataShape = { ...metadata, actuals_source: nextActualsSource };
      const trimmedReason = typeof input.startFact.reason === 'string'
        ? input.startFact.reason.trim()
        : '';
      const isLate = Boolean(
        startEffectiveWrite
        && showCreator.show?.startTime
        && input.startIncoming > showCreator.show.startTime,
      );
      // Symmetric with the single-fact start extractor: on a corrected
      // on-time start we deliberately do NOT clear `attendanceReason`.
      // The column is shared with `creator_attendance_missing`, and
      // clearing here would erase context owned by a different fact key.
      try {
        await this.showCreatorService.updateActuals(input.showCreatorUid, input.ctx.showId, {
          ...(startEffectiveWrite ? { actualStartTime: input.startIncoming } : {}),
          ...(endEffectiveWrite ? { actualEndTime: input.endIncoming } : {}),
          ...(isLate ? { attendanceReason: trimmedReason || LATE_REASON_FALLBACK } : {}),
          metadata: nextMetadata,
        });
      } catch (err) {
        if (err instanceof NotFoundException) {
          const decision: ExtractionDecision = { kind: 'noop', reason: 'target_stale' };
          return { start: { decision }, end: { decision } };
        }
        throw err;
      }
    }

    const start = await this.recordPairedSideDecision({
      fact: input.startFact,
      ctx: input.ctx,
      targetIds: input.targetIds,
      canWrite: startCanWrite,
      unchanged: startUnchanged,
      currentValue: startCurrent,
      incoming: input.startIncoming,
      recordedSource: startRecorded,
    });
    const end = await this.recordPairedSideDecision({
      fact: input.endFact,
      ctx: input.ctx,
      targetIds: input.targetIds,
      canWrite: endCanWrite,
      unchanged: endUnchanged,
      currentValue: endCurrent,
      incoming: input.endIncoming,
      recordedSource: endRecorded,
    });
    return { start, end };
  }

  /**
   * Per-target atomic paired write for
   * `show_platform_actual_start_time` + `show_platform_actual_end_time`.
   *
   * Mirrors `applyPairedShowActuals` but is scoped to one `ShowPlatform`
   * row. Multiple platform targets on the same task fire this method once
   * per `(targetUid)` so each platform's pair commits or rolls back
   * independently — a validation failure on platform A must not roll back
   * platform B's already-written pair.
   *
   * Caller (`FactExtractionService.extractFromTask`) is responsible for
   * filtering: collisions, stale targets, unparseable / absent values, and
   * unregistered fact keys are all routed elsewhere before this method runs.
   * Both facts handed in MUST belong to the same `targetUid` and be
   * non-absent + parseable.
   */
  @Transactional()
  async applyPairedShowPlatformActuals(
    input: PairedShowPlatformActualsInput,
  ): Promise<PairedShowPlatformActualsResult> {
    // The service-level stale-target guard has already verified that this
    // platform exists and belongs to the current show, but the transactional
    // read can race with a soft-delete or a reassignment that landed
    // between the bulk prefetch and the BEGIN of this transaction. A
    // `NotFoundException` here is a normal stale-target race, not an
    // extractor failure — collapse it to `target_stale` on both sides so
    // the orchestrator records it correctly instead of misclassifying the
    // whole submission as `extractor_error`. Every other error (Prisma
    // outage, connection failure, etc.) propagates so the failure stays
    // visible.
    let showPlatform: Awaited<ReturnType<ShowPlatformService['getShowPlatformById']>>;
    try {
      showPlatform = await this.showPlatformService.getShowPlatformById(input.showPlatformUid);
    } catch (err) {
      if (err instanceof NotFoundException) {
        const decision: ExtractionDecision = { kind: 'noop', reason: 'target_stale' };
        return { start: { decision }, end: { decision } };
      }
      throw err;
    }
    if (!showPlatform || showPlatform.showId !== input.ctx.showId) {
      const decision: ExtractionDecision = { kind: 'noop', reason: 'target_stale' };
      return { start: { decision }, end: { decision } };
    }

    const metadata = (showPlatform.metadata as ShowMetadataShape | null) ?? {};
    const recordedSourceMap: ShowActualsSourceMap = metadata.actuals_source ?? {};

    const startRecorded = recordedSourceMap.show_platform_actual_start_time;
    const endRecorded = recordedSourceMap.show_platform_actual_end_time;
    const startCanWrite = canResolverOverwrite(input.ctx.source, startRecorded);
    const endCanWrite = canResolverOverwrite(input.ctx.source, endRecorded);

    const startCurrent = showPlatform.actualStartTime;
    const endCurrent = showPlatform.actualEndTime;
    const startUnchanged = startCanWrite
      && startCurrent !== null
      && startCurrent.getTime() === input.startIncoming.getTime()
      && startRecorded === input.ctx.source;
    const endUnchanged = endCanWrite
      && endCurrent !== null
      && endCurrent.getTime() === input.endIncoming.getTime()
      && endRecorded === input.ctx.source;

    const startEffectiveWrite = startCanWrite && !startUnchanged;
    const endEffectiveWrite = endCanWrite && !endUnchanged;

    if (startEffectiveWrite || endEffectiveWrite) {
      this.showPlatformService.ensureValidActualTimeRange(
        startCurrent,
        endCurrent,
        {
          ...(startEffectiveWrite ? { actualStartTime: input.startIncoming } : {}),
          ...(endEffectiveWrite ? { actualEndTime: input.endIncoming } : {}),
        },
      );
    }

    if (startEffectiveWrite || endEffectiveWrite) {
      const nextActualsSource: ShowActualsSourceMap = {
        ...recordedSourceMap,
        ...(startEffectiveWrite ? { show_platform_actual_start_time: input.ctx.source } : {}),
        ...(endEffectiveWrite ? { show_platform_actual_end_time: input.ctx.source } : {}),
      };
      const nextMetadata: ShowMetadataShape = { ...metadata, actuals_source: nextActualsSource };
      try {
        await this.showPlatformService.updateActuals(input.showPlatformUid, input.ctx.showId, {
          ...(startEffectiveWrite ? { actualStartTime: input.startIncoming } : {}),
          ...(endEffectiveWrite ? { actualEndTime: input.endIncoming } : {}),
          metadata: nextMetadata,
        });
      } catch (err) {
        // Same concurrent soft-delete race as the per-extractor path:
        // the row was active when we read it but `updateActuals` filters
        // by `deletedAt: null`, so the write throws `NotFoundException`
        // when the platform was soft-deleted between read and write.
        // Collapse to `target_stale` on both sides so no audit / column
        // write claims a soft-deleted target. Non-not-found errors still
        // propagate so the `@Transactional` boundary rolls back.
        if (err instanceof NotFoundException) {
          const decision: ExtractionDecision = { kind: 'noop', reason: 'target_stale' };
          return { start: { decision }, end: { decision } };
        }
        throw err;
      }
    }

    const start = await this.recordPairedSideDecision({
      fact: input.startFact,
      ctx: input.ctx,
      targetIds: input.targetIds,
      canWrite: startCanWrite,
      unchanged: startUnchanged,
      currentValue: startCurrent,
      incoming: input.startIncoming,
      recordedSource: startRecorded,
    });
    const end = await this.recordPairedSideDecision({
      fact: input.endFact,
      ctx: input.ctx,
      targetIds: input.targetIds,
      canWrite: endCanWrite,
      unchanged: endUnchanged,
      currentValue: endCurrent,
      incoming: input.endIncoming,
      recordedSource: endRecorded,
    });
    return { start, end };
  }

  private async recordPairedSideDecision(input: {
    fact: ExtractedFact;
    ctx: ExtractionContext;
    targetIds: { targetType: AuditTargetType; targetId: bigint }[];
    canWrite: boolean;
    unchanged: boolean;
    currentValue: Date | null;
    incoming: Date;
    recordedSource: ActualsSource | undefined;
  }): Promise<ProcessedFact> {
    const baseMetadata: AuditMetadata = {
      ingestion_source: 'task_submission',
      task_uid: input.ctx.taskUid,
      task_field_id: input.fact.sourceFieldId,
      fact_key: input.fact.factKey,
    };

    if (!input.canWrite) {
      const decision: ExtractionDecision = {
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: input.recordedSource!,
        attemptedValue: input.incoming.toISOString(),
      };
      if (input.targetIds.length === 0) {
        return { decision };
      }
      const audit = await this.auditService.create({
        action: decision.action,
        actorId: null,
        metadata: {
          ...baseMetadata,
          skipped_by_source: decision.skippedBy,
          attempted_value: decision.attemptedValue as AuditMetadata['old_value'],
        },
        targets: input.targetIds,
      });
      return { decision, auditUid: audit.uid };
    }

    if (input.unchanged) {
      return { decision: { kind: 'noop', reason: 'value_unchanged' } };
    }

    const action: Extract<ExtractionDecision, { kind: 'write' }>['action'] = input.currentValue
      ? 'UPDATE'
      : 'CREATE';
    const decision: ExtractionDecision = {
      kind: 'write',
      action,
      oldValue: input.currentValue ? input.currentValue.toISOString() : null,
      newValue: input.incoming.toISOString(),
    };
    if (input.targetIds.length === 0) {
      return { decision };
    }
    const audit = await this.auditService.create({
      action: decision.action,
      actorId: null,
      metadata: {
        ...baseMetadata,
        old_value: decision.oldValue as AuditMetadata['old_value'],
        new_value: decision.newValue as AuditMetadata['new_value'],
      },
      targets: input.targetIds,
    });
    return { decision, auditUid: audit.uid };
  }
}
