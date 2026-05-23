import { Injectable, Logger } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

import type { ActualsSource, AuditTargetType } from '@eridu/api-types/audits';
import {
  type FieldItemV2,
  parseHydratedContentKey,
  SYSTEM_FACT_KEY_DEFINITIONS,
  type SystemFactKey,
  type UiSchemaV2,
} from '@eridu/api-types/task-management';

import { parseDateTimeValue } from './extractors/datetime-value';
import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
} from './extractors/extractor.types';
import { ExtractorRegistry } from './extractors/extractor-registry';
import {
  FactExtractionProcessor,
  type PairedShowActualsResult,
} from './fact-extraction.processor';

import { AuditService } from '@/models/audit/audit.service';
import { TaskService } from '@/models/task/task.service';

/**
 * Outcome the orchestrator returns to the caller (typically
 * `TaskOrchestrationService` on a COMPLETED transition). Each entry
 * summarizes one bound field, regardless of whether it produced an indexed
 * write, was skipped on priority, was blocked by a cross-task collision, or
 * was a no-op (blank value, no registered extractor, etc.).
 */
export type ExtractionResultEntry = {
  factKey: SystemFactKey;
  sourceFieldId: string;
  contentKey: string;
  targetUid: string;
  outcome:
    | 'written'
    | 'skipped_lower_priority'
    | 'skipped_collision'
    | 'skipped_no_extractor'
    | 'skipped_stale_target'
    | 'noop';
  /** UID of the persisted Audit row, if one was written. */
  auditUid?: string;
  /** Reason copied from the decision for the noop / collision cases. */
  reason?: string;
};

export type ExtractionResult = {
  taskId: bigint;
  taskUid: string;
  entries: ExtractionResultEntry[];
};

type ExtractFromTaskInput = {
  taskId: bigint;
  taskUid: string;
  studioId: bigint | null;
  showId: bigint;
  showUid: string;
  source: ActualsSource;
};

/**
 * Task statuses that count as "still in flight" for the cross-task collision
 * guard. A sibling task in any of these states could still emit a write for
 * the same fact key against the same show, so we route the current write to
 * the review path instead of letting a winner be picked silently.
 *
 * `COMPLETED` and `CLOSED` are deliberately excluded: their content is
 * frozen, so they can no longer race with the incoming submission.
 */
const COLLISION_ACTIVE_TASK_STATUSES = [
  TaskStatus.PENDING,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.BLOCKED,
] as const;

@Injectable()
export class FactExtractionService {
  private readonly logger = new Logger(FactExtractionService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly auditService: AuditService,
    private readonly extractorRegistry: ExtractorRegistry,
    private readonly factExtractionProcessor: FactExtractionProcessor,
  ) {}

  /**
   * Runs extraction for every bound field on the task's snapshot. Caller is
   * expected to invoke this after the task has been persisted at `COMPLETED`
   * so the source-of-truth `task.content` is final. Engine writes use
   * `actorId = null` per design §3.C.
   */
  async extractFromTask(input: ExtractFromTaskInput): Promise<ExtractionResult> {
    const task = await this.taskService.findByUidWithSnapshot(input.taskUid);
    if (!task || !task.snapshot) {
      return { taskId: input.taskId, taskUid: input.taskUid, entries: [] };
    }

    const schema = task.snapshot.schema as unknown as UiSchemaV2 | null;
    if (!schema || !Array.isArray(schema.items)) {
      return { taskId: input.taskId, taskUid: input.taskUid, entries: [] };
    }

    const content = (task.content as Record<string, unknown> | null) ?? {};

    const facts = collectBoundFacts(schema, content, input.showUid);
    if (facts.length === 0) {
      return { taskId: input.taskId, taskUid: input.taskUid, entries: [] };
    }

    // Only scan for collisions on facts the pipeline can actually act on:
    //   - non-absent value (a blank submission isn't competing for the column)
    //   - registered extractor (unregistered keys are silent no-ops by the
    //     registry contract; per Codex P2 review, an unregistered key with a
    //     colliding sibling must NOT emit a SKIPPED_LOWER_PRIORITY audit
    //     because nothing in this pipeline can write it, so the "collision"
    //     is fictional from the review surface's perspective).
    const writingFacts = facts.filter(
      (fact) => !isFactValueAbsent(fact.rawValue) && this.extractorRegistry.has(fact.factKey),
    );
    const collidingFactKeys = await this.findCollidingFactKeys({
      currentTaskId: input.taskId,
      showId: input.showId,
      factKeys: writingFacts.map((fact) => fact.factKey),
    });

    const ctx: ExtractionContext = {
      taskId: input.taskId,
      taskUid: input.taskUid,
      studioId: input.studioId,
      showId: input.showId,
      showUid: input.showUid,
      source: input.source,
    };

    const entries: ExtractionResultEntry[] = [];

    // Codex P1 review on PR #101: when both `show_actual_start_time` and
    // `show_actual_end_time` are present and eligible on the same
    // submission, the per-fact loop cannot validate them safely — each
    // extractor's individual write/audit transaction commits independently,
    // so a paired update of a valid range can be rejected on stored-only
    // counterpart validation, and an extractor error or concurrent
    // higher-priority write can leave one side persisted against an
    // unpersistable counterpart. The atomic paired processor reads the
    // show, runs priority + merged-pair validation, and writes both
    // columns + both audits inside a single CLS transaction.
    const handledPairedKeys = await this.tryAtomicPairedShowActuals({
      facts,
      collidingFactKeys,
      ctx,
      entries,
    });

    for (const fact of facts) {
      if (handledPairedKeys.has(fact.factKey)) {
        continue;
      }
      // Empty submissions never write, never audit. Per Codex P2 review:
      // emitting a `skipped_collision` audit for a blank field misrepresents
      // a non-attempted write as a contested one and pollutes the review queue.
      if (isFactValueAbsent(fact.rawValue)) {
        entries.push({
          factKey: fact.factKey,
          sourceFieldId: fact.sourceFieldId,
          contentKey: fact.contentKey,
          targetUid: fact.targetUid,
          outcome: 'noop',
          reason: 'value_absent',
        });
        continue;
      }

      // Registry check BEFORE collision check: an unregistered fact key is
      // invisible to the pipeline (registry contract = silent no-op), so it
      // must not produce a collision audit either. Reversing this order
      // would write SKIPPED_LOWER_PRIORITY rows for future creator/platform
      // keys that 12.0.5 cannot yet act on.
      const extractor = this.extractorRegistry.resolve(fact.factKey);
      if (!extractor) {
        entries.push({
          factKey: fact.factKey,
          sourceFieldId: fact.sourceFieldId,
          contentKey: fact.contentKey,
          targetUid: fact.targetUid,
          outcome: 'skipped_no_extractor',
          reason: 'extractor_not_registered',
        });
        continue;
      }

      if (collidingFactKeys.has(fact.factKey)) {
        const audit = await this.writeCollisionSkipAudit(fact, ctx);
        entries.push({
          factKey: fact.factKey,
          sourceFieldId: fact.sourceFieldId,
          contentKey: fact.contentKey,
          targetUid: fact.targetUid,
          outcome: 'skipped_collision',
          auditUid: audit?.uid,
          reason: 'cross_task_same_fact_key',
        });
        continue;
      }

      const targetIds = this.resolveAuditTargetIds(fact, ctx);

      let processed: { decision: ExtractionDecision; auditUid?: string };
      try {
        processed = await this.factExtractionProcessor.applyAndAudit(
          extractor,
          fact,
          ctx,
          targetIds,
        );
      } catch (err) {
        // Transactional boundary — both the column write and the audit rolled
        // back together. Per Codex P1 review: the indexed write and audit
        // envelope can never disagree.
        this.logger.error(
          `Extractor for ${fact.factKey} threw on task ${input.taskUid}: ${(err as Error).message}`,
        );
        entries.push({
          factKey: fact.factKey,
          sourceFieldId: fact.sourceFieldId,
          contentKey: fact.contentKey,
          targetUid: fact.targetUid,
          outcome: 'noop',
          reason: 'extractor_error',
        });
        continue;
      }

      entries.push({
        factKey: fact.factKey,
        sourceFieldId: fact.sourceFieldId,
        contentKey: fact.contentKey,
        targetUid: fact.targetUid,
        outcome: outcomeFromDecision(processed.decision),
        auditUid: processed.auditUid,
        reason: processed.decision.kind === 'noop' ? processed.decision.reason : undefined,
      });
    }

    return { taskId: input.taskId, taskUid: input.taskUid, entries };
  }

  /**
   * Returns the set of fact keys that already have *another active* task
   * targeting the same show. Active = any non-terminal status (PENDING,
   * IN_PROGRESS, REVIEW, BLOCKED), not soft-deleted. Routing colliding
   * writes to a SKIPPED audit avoids silently picking a winner when two
   * operator surfaces are in flight on the same fact key.
   *
   * Per Codex P1 review: `IN_PROGRESS` and `BLOCKED` are common assignee
   * working states; omitting them let competing tasks race past the guard.
   */
  private async findCollidingFactKeys(input: {
    currentTaskId: bigint;
    showId: bigint;
    factKeys: SystemFactKey[];
  }): Promise<Set<SystemFactKey>> {
    if (input.factKeys.length === 0) {
      return new Set();
    }
    const siblings = await this.taskService.findActiveTasksForShowExcluding(
      input.showId,
      input.currentTaskId,
      [...COLLISION_ACTIVE_TASK_STATUSES],
    );
    const colliding = new Set<SystemFactKey>();
    for (const sibling of siblings) {
      const schema = sibling.snapshot?.schema as unknown as UiSchemaV2 | null;
      if (!schema || !Array.isArray(schema.items)) {
        continue;
      }
      for (const item of schema.items) {
        const itemFactKey = (item as FieldItemV2).system_fact_key;
        if (itemFactKey && input.factKeys.includes(itemFactKey)) {
          colliding.add(itemFactKey);
        }
      }
    }
    return colliding;
  }

  private async writeCollisionSkipAudit(
    fact: ExtractedFact,
    ctx: ExtractionContext,
  ): Promise<{ uid: string } | undefined> {
    const targetIds = this.resolveAuditTargetIds(fact, ctx);
    if (targetIds.length === 0) {
      return undefined;
    }
    return this.auditService.create({
      action: 'SKIPPED_LOWER_PRIORITY',
      actorId: null,
      metadata: {
        ingestion_source: 'task_submission',
        task_uid: ctx.taskUid,
        task_field_id: fact.sourceFieldId,
        fact_key: fact.factKey,
        collision_reason: 'cross_task_same_fact_key',
      },
      targets: targetIds,
    });
  }

  /**
   * Routes a paired show-actual submission (both `show_actual_start_time`
   * and `show_actual_end_time` present, non-absent, parseable, registered,
   * and non-colliding) through the atomic processor and records the per-
   * side outcome entries. Mutates `entries` and returns the set of fact
   * keys it consumed so the main per-fact loop can skip them.
   *
   * Falls through (consumes nothing) when only one side is in the
   * submission, when either side is unparseable or absent, or when either
   * side is collision-blocked — in those cases the existing per-extractor
   * flow already produces the correct outcome (a one-sided update
   * validates against the stored counterpart, and a collision is handled
   * by `writeCollisionSkipAudit` in the main loop).
   */
  private async tryAtomicPairedShowActuals(input: {
    facts: ExtractedFact[];
    collidingFactKeys: Set<SystemFactKey>;
    ctx: ExtractionContext;
    entries: ExtractionResultEntry[];
  }): Promise<Set<SystemFactKey>> {
    const startFact = input.facts.find((fact) => fact.factKey === 'show_actual_start_time');
    const endFact = input.facts.find((fact) => fact.factKey === 'show_actual_end_time');
    if (!startFact || !endFact) {
      return new Set();
    }
    if (isFactValueAbsent(startFact.rawValue) || isFactValueAbsent(endFact.rawValue)) {
      return new Set();
    }
    if (
      input.collidingFactKeys.has('show_actual_start_time')
      || input.collidingFactKeys.has('show_actual_end_time')
    ) {
      return new Set();
    }
    if (
      !this.extractorRegistry.has('show_actual_start_time')
      || !this.extractorRegistry.has('show_actual_end_time')
    ) {
      return new Set();
    }
    const startIncoming = parseDateTimeValue(startFact.rawValue);
    const endIncoming = parseDateTimeValue(endFact.rawValue);
    if (!startIncoming || !endIncoming) {
      return new Set();
    }

    const targetIds = this.resolveAuditTargetIds(startFact, input.ctx);
    let result: PairedShowActualsResult;
    try {
      result = await this.factExtractionProcessor.applyPairedShowActuals({
        startFact,
        endFact,
        startIncoming,
        endIncoming,
        ctx: input.ctx,
        targetIds,
      });
    } catch (err) {
      // The `@Transactional` boundary rolled back both writes and both
      // audits together, so neither column moved. Surface the same
      // `extractor_error` outcome the per-fact flow would have emitted, on
      // both sides, since the atomic boundary couldn't distinguish which
      // half triggered the failure.
      this.logger.error(
        `Paired show-actuals processor threw on task ${input.ctx.taskUid}: ${(err as Error).message}`,
      );
      for (const fact of [startFact, endFact]) {
        input.entries.push({
          factKey: fact.factKey,
          sourceFieldId: fact.sourceFieldId,
          contentKey: fact.contentKey,
          targetUid: fact.targetUid,
          outcome: 'noop',
          reason: 'extractor_error',
        });
      }
      return new Set(['show_actual_start_time', 'show_actual_end_time']);
    }

    input.entries.push({
      factKey: startFact.factKey,
      sourceFieldId: startFact.sourceFieldId,
      contentKey: startFact.contentKey,
      targetUid: startFact.targetUid,
      outcome: outcomeFromDecision(result.start.decision),
      auditUid: result.start.auditUid,
      reason: result.start.decision.kind === 'noop' ? result.start.decision.reason : undefined,
    });
    input.entries.push({
      factKey: endFact.factKey,
      sourceFieldId: endFact.sourceFieldId,
      contentKey: endFact.contentKey,
      targetUid: endFact.targetUid,
      outcome: outcomeFromDecision(result.end.decision),
      auditUid: result.end.auditUid,
      reason: result.end.decision.kind === 'noop' ? result.end.decision.reason : undefined,
    });
    return new Set(['show_actual_start_time', 'show_actual_end_time']);
  }

  /**
   * Resolves the polymorphic audit target row(s) for a fact. Only `show`
   * scope is wired in PR 12.0.5; the other branches are placeholders for
   * 12.1/12.2/12.3 so the orchestrator doesn't need to grow when those
   * extractors land. Synchronous because show-scope id is already in the
   * extraction context — no extra round-trip needed.
   */
  private resolveAuditTargetIds(
    fact: ExtractedFact,
    ctx: ExtractionContext,
  ): { targetType: AuditTargetType; targetId: bigint }[] {
    if (fact.scope === 'show') {
      return [{ targetType: 'SHOW', targetId: ctx.showId }];
    }
    // 12.1.x and 12.2 register extractors for show_creator / show_platform
    // scopes; until they do, we have no resolved DB id to anchor the audit.
    return [];
  }
}

/**
 * `null`, `undefined`, and empty string are the universal "operator left the
 * field blank" signals. Extractors with type-specific semantics (e.g.,
 * `creator_attendance_missing` treating `false` as a meaningful answer) can
 * still classify their own edge cases via the `noop` decision; this filter
 * only catches the obvious cases so the orchestrator never emits a misleading
 * collision/lower-priority audit for a non-attempted write.
 */
function isFactValueAbsent(rawValue: unknown): boolean {
  return rawValue == null || rawValue === '';
}

/**
 * Walks a hydrated submission and emits one `ExtractedFact` per bound,
 * filled field. Stale-target entries (hydrated but unassigned at render)
 * are skipped; their content stays in `task.content` for the review queue
 * in PR 12.4.
 */
function collectBoundFacts(
  schema: UiSchemaV2,
  content: Record<string, unknown>,
  showUid: string,
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const itemByFieldId = new Map<string, FieldItemV2>(schema.items.map((item) => [item.id, item]));

  // Show-scoped bindings — no per-target hydration; one fact per template field.
  for (const item of schema.items) {
    const factKey = item.system_fact_key;
    if (!factKey)
      continue;
    const definition = SYSTEM_FACT_KEY_DEFINITIONS[factKey];
    if (definition.target !== 'show')
      continue;
    facts.push({
      contentKey: item.id,
      sourceFieldId: item.id,
      factKey,
      scope: 'show',
      targetUid: showUid,
      rawValue: content[item.id],
    });
  }

  // Per-target hydrated keys for creator / platform scopes — parsed at extraction
  // time so the engine can route each entry to the correct extractor without
  // re-running hydration. Sibling sidecar keys (`*__reason`, `*__extra`) are
  // ignored because they don't parse as hydrated keys.
  for (const [contentKey, rawValue] of Object.entries(content)) {
    const parsed = parseHydratedContentKey(contentKey);
    if (!parsed)
      continue;
    const templateItem = itemByFieldId.get(parsed.fieldId);
    if (!templateItem || !templateItem.system_fact_key)
      continue;
    const definition = SYSTEM_FACT_KEY_DEFINITIONS[templateItem.system_fact_key];
    const expectedScope = definition.target === 'show_creator' ? 'creator' : definition.target === 'show_platform' ? 'platform' : null;
    if (!expectedScope || expectedScope !== parsed.scope)
      continue;
    facts.push({
      contentKey,
      sourceFieldId: parsed.fieldId,
      factKey: templateItem.system_fact_key,
      scope: parsed.scope,
      targetUid: parsed.targetUid,
      rawValue,
    });
  }

  return facts;
}

function outcomeFromDecision(decision: ExtractionDecision): ExtractionResultEntry['outcome'] {
  switch (decision.kind) {
    case 'write':
      return 'written';
    case 'skip':
      return 'skipped_lower_priority';
    case 'noop':
      return 'noop';
  }
}
