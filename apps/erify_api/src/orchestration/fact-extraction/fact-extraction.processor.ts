import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { ActualsSource, AuditMetadata, AuditTargetType } from '@eridu/api-types/audits';
import type { SystemFactKey } from '@eridu/api-types/task-management';

import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractors/extractor.types';
import { canResolverOverwrite } from './source-priority';

import { AuditService } from '@/models/audit/audit.service';
import { ShowService } from '@/models/show/show.service';

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

    // Validate the MERGED-FINAL state (incoming for sides that will write,
    // stored for sides that won't). This is the only validation that
    // matters — by the time the transaction commits, exactly the
    // canWrite-sides will have changed in storage. If neither side writes
    // (both priority-skipped), no validation is needed; nothing changes.
    if (startCanWrite || endCanWrite) {
      this.showService.ensureValidActualTimeRange(
        show.actualStartTime,
        show.actualEndTime,
        {
          ...(startCanWrite ? { actualStartTime: input.startIncoming } : {}),
          ...(endCanWrite ? { actualEndTime: input.endIncoming } : {}),
        },
      );
    }

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
