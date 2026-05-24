import { Injectable, Logger } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

import type { ActualsSource, AuditTargetType } from '@eridu/api-types/audits';
import {
  type FieldItemV2,
  getTaskContentReasonKey,
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
  type PairedShowCreatorActualsResult,
  type PairedShowPlatformActualsResult,
} from './fact-extraction.processor';

import { AuditService } from '@/models/audit/audit.service';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
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
    private readonly showCreatorService: ShowCreatorService,
    private readonly showPlatformService: ShowPlatformService,
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
    const showScopeFactKeys = new Set<SystemFactKey>();
    const perTargetCollisionKeys = new Set<string>();
    for (const fact of writingFacts) {
      if (fact.scope === 'show') {
        showScopeFactKeys.add(fact.factKey);
      } else {
        perTargetCollisionKeys.add(perTargetCollisionKey(fact.factKey, fact.targetUid));
      }
    }
    const collidingFacts = await this.findCollidingFacts({
      currentTaskId: input.taskId,
      showId: input.showId,
      showScopeFactKeys,
      perTargetCollisionKeys,
    });

    // Bulk-resolve active platform target UIDs in one DB round-trip so per-
    // fact stale-target checks and audit-id resolution share the same cache.
    // Scoped to `input.showId` so a platform reassigned to a different show
    // between submission and extraction stays out of the cache and is
    // emitted as `skipped_stale_target` rather than leaking into the
    // collision / audit-target paths. Targets missing from the map
    // (soft-deleted or wrong show) emit a `skipped_stale_target` outcome —
    // no write, no audit row (a stale target is unwritable, not contested,
    // so a SKIPPED audit would be misleading on the review surface).
    const creatorTargetById = await this.showCreatorService.findActiveByUids(
      uniqueTargetUids(facts, 'creator'),
      input.showId,
    );
    const platformTargetById = await this.showPlatformService.findActiveByUids(
      uniqueTargetUids(facts, 'platform'),
      input.showId,
    );

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
      collidingFacts,
      ctx,
      entries,
    });

    const handledPairedCreatorContentKeys = await this.tryAtomicPairedCreatorActuals({
      facts,
      collidingFacts,
      creatorTargetById,
      ctx,
      entries,
    });

    // Same atomicity guarantee, applied per-platform: if a single submission
    // carries paired start+end for the same `ShowPlatform`, route the pair
    // through the per-target atomic processor so the priority check +
    // merged-pair validation + paired column write all commit (or roll back)
    // together. Each platform target gets its own transaction so a
    // validation failure on platform A doesn't roll back platform B's
    // already-written pair.
    const handledPairedPlatformContentKeys = await this.tryAtomicPairedShowPlatformActuals({
      facts,
      collidingFacts,
      platformTargetById,
      ctx,
      entries,
    });

    for (const fact of facts) {
      if (handledPairedKeys.has(fact.factKey)) {
        continue;
      }
      if (handledPairedPlatformContentKeys.has(fact.contentKey)) {
        continue;
      }
      if (handledPairedCreatorContentKeys.has(fact.contentKey)) {
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

      // Stale-target pre-filter for platform-scope facts BEFORE collision
      // routing. Per Codex P2 review on PR #103: a stale platform target
      // is unwritable by definition, so it cannot meaningfully "collide"
      // with a sibling task — emitting `skipped_collision` (which writes
      // a SKIPPED_LOWER_PRIORITY audit) would mislabel an unwritable row
      // as a contested write. The bulk lookup is already scoped to
      // `ctx.showId`, so missing entries mean the platform is either
      // soft-deleted or has been reassigned to another show; either way,
      // the value stays in `task.content` for the PR 12.4 review queue.
      if (
        (fact.scope === 'creator' && !creatorTargetById.has(fact.targetUid))
        || (fact.scope === 'platform' && !platformTargetById.has(fact.targetUid))
      ) {
        entries.push({
          factKey: fact.factKey,
          sourceFieldId: fact.sourceFieldId,
          contentKey: fact.contentKey,
          targetUid: fact.targetUid,
          outcome: 'skipped_stale_target',
          reason: 'target_unassigned_or_deleted',
        });
        continue;
      }

      if (isFactColliding(fact, collidingFacts)) {
        const audit = await this.writeCollisionSkipAudit(fact, ctx, creatorTargetById, platformTargetById);
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

      const targetIds = this.resolveAuditTargetIds(fact, ctx, creatorTargetById, platformTargetById);

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
   * Computes cross-task collisions at two granularities:
   *
   * - **Show scope** (`colliding.showScope`): per-fact-key. A show fact has
   *   one canonical target (the show), so any active sibling with the same
   *   fact key in its schema is a race we must route to the review path.
   * - **Per-target scope** (`colliding.perTarget`, keyed `<factKey>|<targetUid>`):
   *   per-(fact-key, target-uid). Two tasks binding the same platform/creator
   *   fact key on *different* targets do NOT collide — they write to
   *   different rows. We only mark a collision when a sibling task has
   *   already entered CONTENT for the same (fact-key, target-uid) pair.
   *   No-content-yet siblings are not preemptively blocked; if they later
   *   race past this guard, the priority resolver handles same-source
   *   last-write-wins semantics.
   *
   * Active = any non-terminal status (PENDING, IN_PROGRESS, REVIEW,
   * BLOCKED), not soft-deleted — `COMPLETED` / `CLOSED` content is frozen
   * so a finished sibling can no longer race.
   *
   * Per Codex P1 review on PR #103: a show-wide per-fact-key flag blocked
   * unrelated platform paired writes whenever any sibling task bound the
   * same fact key (even for a different platform), leaving valid actuals
   * stale. Per-target detection scopes the collision to the actual write
   * conflict.
   */
  private async findCollidingFacts(input: {
    currentTaskId: bigint;
    showId: bigint;
    showScopeFactKeys: Set<SystemFactKey>;
    perTargetCollisionKeys: Set<string>;
  }): Promise<CollisionTracker> {
    const colliding: CollisionTracker = {
      showScope: new Set(),
      perTarget: new Set(),
    };
    if (input.showScopeFactKeys.size === 0 && input.perTargetCollisionKeys.size === 0) {
      return colliding;
    }
    const siblings = await this.taskService.findActiveTasksForShowExcluding(
      input.showId,
      input.currentTaskId,
      [...COLLISION_ACTIVE_TASK_STATUSES],
    );
    for (const sibling of siblings) {
      const schema = sibling.snapshot?.schema as unknown as UiSchemaV2 | null;
      if (!schema || !Array.isArray(schema.items)) {
        continue;
      }

      const factKeyByFieldId = new Map<string, SystemFactKey>();
      for (const item of schema.items) {
        const itemFactKey = (item as FieldItemV2).system_fact_key;
        if (!itemFactKey) {
          continue;
        }
        // Per Codex P1 review on PR #103: sibling snapshots are persisted
        // JSON cast to `UiSchemaV2`, so a mixed-version / legacy sibling
        // can carry a `system_fact_key` this binary doesn't know. Guard
        // the definition lookup — an unknown key from a different binary
        // can't collide with anything the current binary writes, so it's
        // safe to skip silently rather than throw and abort the whole
        // `extractFromTask` run with a `TypeError`.
        const definition = SYSTEM_FACT_KEY_DEFINITIONS[itemFactKey];
        if (!definition) {
          continue;
        }
        factKeyByFieldId.set(item.id, itemFactKey);
        // Show-scope collision: schema-only match is sufficient because the
        // sibling will produce one write per the (one) show target on submit.
        if (definition.target === 'show' && input.showScopeFactKeys.has(itemFactKey)) {
          colliding.showScope.add(itemFactKey);
        }
      }

      // Per-target collision: look at the sibling's *content* (not just
      // schema). A sibling that has the per-target fact key in its schema
      // but no value yet for a specific target is not preemptively
      // blocking — only entries the sibling has actually started filling
      // are considered races.
      //
      // Per Codex P1 review on PR #103: a sibling can carry an
      // explicitly-cleared hydrated key (`null` / `undefined` / `''`); the
      // mere presence of the key is not a competing write. Skip absent
      // values so a stale empty key on the sibling doesn't push the
      // current task into a fictional `skipped_collision`.
      const siblingContent = (sibling.content as Record<string, unknown> | null) ?? {};
      for (const [contentKey, siblingValue] of Object.entries(siblingContent)) {
        if (isFactValueAbsent(siblingValue)) {
          continue;
        }
        const parsed = parseHydratedContentKey(contentKey);
        if (!parsed) {
          continue;
        }
        const siblingFactKey = factKeyByFieldId.get(parsed.fieldId);
        if (!siblingFactKey) {
          continue;
        }
        const collisionKey = perTargetCollisionKey(siblingFactKey, parsed.targetUid);
        if (input.perTargetCollisionKeys.has(collisionKey)) {
          colliding.perTarget.add(collisionKey);
        }
      }
    }
    return colliding;
  }

  private async writeCollisionSkipAudit(
    fact: ExtractedFact,
    ctx: ExtractionContext,
    creatorTargetById: Map<string, { id: bigint; showId: bigint }>,
    platformTargetById: Map<string, { id: bigint; showId: bigint }>,
  ): Promise<{ uid: string } | undefined> {
    const targetIds = this.resolveAuditTargetIds(fact, ctx, creatorTargetById, platformTargetById);
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
    collidingFacts: CollisionTracker;
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
      input.collidingFacts.showScope.has('show_actual_start_time')
      || input.collidingFacts.showScope.has('show_actual_end_time')
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

    // Show scope: bulk-resolved platform cache isn't relevant here, but the
    // resolver signature is shared so we pass an empty map.
    const targetIds = this.resolveAuditTargetIds(startFact, input.ctx, new Map(), new Map());
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
   * Resolves the polymorphic audit target row(s) for a fact. `show` scope
   * uses the id already in `ctx`; `platform` scope reads from the bulk-
   * resolved cache built once per `extractFromTask` call. Creator scope is
   * still a placeholder until PR 12.2 lands.
   *
   * Returns an empty array when the platform target is missing from the
   * cache — callers should pre-filter stale targets and emit
   * `skipped_stale_target` outcomes rather than relying on empty target
   * ids to silently drop the audit.
   */
  private resolveAuditTargetIds(
    fact: ExtractedFact,
    ctx: ExtractionContext,
    creatorTargetById: Map<string, { id: bigint; showId: bigint }>,
    platformTargetById: Map<string, { id: bigint; showId: bigint }>,
  ): { targetType: AuditTargetType; targetId: bigint }[] {
    if (fact.scope === 'show') {
      return [{ targetType: 'SHOW', targetId: ctx.showId }];
    }
    if (fact.scope === 'platform') {
      const resolved = platformTargetById.get(fact.targetUid);
      if (!resolved) {
        return [];
      }
      return [{ targetType: 'SHOW_PLATFORM', targetId: resolved.id }];
    }
    if (fact.scope === 'creator') {
      const resolved = creatorTargetById.get(fact.targetUid);
      if (!resolved) {
        return [];
      }
      return [{ targetType: 'SHOW_CREATOR', targetId: resolved.id }];
    }
    return [];
  }

  private async tryAtomicPairedCreatorActuals(input: {
    facts: ExtractedFact[];
    collidingFacts: CollisionTracker;
    creatorTargetById: Map<string, { id: bigint; showId: bigint }>;
    ctx: ExtractionContext;
    entries: ExtractionResultEntry[];
  }): Promise<Set<string>> {
    const consumed = new Set<string>();
    if (
      !this.extractorRegistry.has('creator_actual_start_time')
      || !this.extractorRegistry.has('creator_actual_end_time')
    ) {
      return consumed;
    }

    const startByTarget = new Map<string, ExtractedFact>();
    const endByTarget = new Map<string, ExtractedFact>();
    for (const fact of input.facts) {
      if (fact.scope !== 'creator') {
        continue;
      }
      if (fact.factKey === 'creator_actual_start_time') {
        startByTarget.set(fact.targetUid, fact);
      } else if (fact.factKey === 'creator_actual_end_time') {
        endByTarget.set(fact.targetUid, fact);
      }
    }

    for (const [targetUid, startFact] of startByTarget) {
      const endFact = endByTarget.get(targetUid);
      if (!endFact) {
        continue;
      }
      if (isFactValueAbsent(startFact.rawValue) || isFactValueAbsent(endFact.rawValue)) {
        continue;
      }
      const resolved = input.creatorTargetById.get(targetUid);
      if (!resolved) {
        continue;
      }
      if (
        input.collidingFacts.perTarget.has(
          perTargetCollisionKey('creator_actual_start_time', targetUid),
        )
        || input.collidingFacts.perTarget.has(
          perTargetCollisionKey('creator_actual_end_time', targetUid),
        )
      ) {
        continue;
      }
      const startIncoming = parseDateTimeValue(startFact.rawValue);
      const endIncoming = parseDateTimeValue(endFact.rawValue);
      if (!startIncoming || !endIncoming) {
        continue;
      }

      const targetIds = [{ targetType: 'SHOW_CREATOR' as AuditTargetType, targetId: resolved.id }];

      let result: PairedShowCreatorActualsResult;
      try {
        result = await this.factExtractionProcessor.applyPairedShowCreatorActuals({
          showCreatorUid: targetUid,
          startFact,
          endFact,
          startIncoming,
          endIncoming,
          ctx: input.ctx,
          targetIds,
        });
      } catch (err) {
        this.logger.error(
          `Paired creator-actuals processor threw on task ${input.ctx.taskUid} target ${targetUid}: ${(err as Error).message}`,
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
          consumed.add(fact.contentKey);
        }
        continue;
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
      consumed.add(startFact.contentKey);
      consumed.add(endFact.contentKey);
    }
    return consumed;
  }

  /**
   * Per-target paired ShowPlatform actuals routing. Iterates unique
   * `targetUid`s among the platform facts, and for each target that carries
   * both `show_platform_actual_start_time` and `show_platform_actual_end_time`
   * (non-absent, parseable, registered, non-colliding, non-stale), routes the
   * pair through `applyPairedShowPlatformActuals` in its own transaction.
   * Returns the set of content keys it consumed so the per-fact loop can
   * skip them.
   */
  private async tryAtomicPairedShowPlatformActuals(input: {
    facts: ExtractedFact[];
    collidingFacts: CollisionTracker;
    platformTargetById: Map<string, { id: bigint; showId: bigint }>;
    ctx: ExtractionContext;
    entries: ExtractionResultEntry[];
  }): Promise<Set<string>> {
    const consumed = new Set<string>();
    if (
      !this.extractorRegistry.has('show_platform_actual_start_time')
      || !this.extractorRegistry.has('show_platform_actual_end_time')
    ) {
      return consumed;
    }

    // Group platform facts by target so each ShowPlatform pair commits or
    // rolls back independently. A pair on platform A failing validation must
    // not roll back platform B's already-written pair.
    const startByTarget = new Map<string, ExtractedFact>();
    const endByTarget = new Map<string, ExtractedFact>();
    for (const fact of input.facts) {
      if (fact.scope !== 'platform') {
        continue;
      }
      if (fact.factKey === 'show_platform_actual_start_time') {
        startByTarget.set(fact.targetUid, fact);
      } else if (fact.factKey === 'show_platform_actual_end_time') {
        endByTarget.set(fact.targetUid, fact);
      }
    }

    for (const [targetUid, startFact] of startByTarget) {
      const endFact = endByTarget.get(targetUid);
      if (!endFact) {
        continue;
      }
      if (isFactValueAbsent(startFact.rawValue) || isFactValueAbsent(endFact.rawValue)) {
        continue;
      }
      const resolved = input.platformTargetById.get(targetUid);
      if (!resolved) {
        // Stale targets fall through to the per-fact loop's stale-target
        // pre-filter, which emits `skipped_stale_target` on each side.
        continue;
      }
      // Per-target collision: only block the paired write when a sibling
      // task has actual content for the same `(factKey, targetUid)` pair.
      // Falls through to the per-fact loop so each side emits its own
      // `skipped_collision` audit anchored on the SHOW_PLATFORM target.
      if (
        input.collidingFacts.perTarget.has(
          perTargetCollisionKey('show_platform_actual_start_time', targetUid),
        )
        || input.collidingFacts.perTarget.has(
          perTargetCollisionKey('show_platform_actual_end_time', targetUid),
        )
      ) {
        continue;
      }
      const startIncoming = parseDateTimeValue(startFact.rawValue);
      const endIncoming = parseDateTimeValue(endFact.rawValue);
      if (!startIncoming || !endIncoming) {
        continue;
      }

      const targetIds = [{ targetType: 'SHOW_PLATFORM' as AuditTargetType, targetId: resolved.id }];

      let result: PairedShowPlatformActualsResult;
      try {
        result = await this.factExtractionProcessor.applyPairedShowPlatformActuals({
          showPlatformUid: targetUid,
          startFact,
          endFact,
          startIncoming,
          endIncoming,
          ctx: input.ctx,
          targetIds,
        });
      } catch (err) {
        this.logger.error(
          `Paired show-platform-actuals processor threw on task ${input.ctx.taskUid} target ${targetUid}: ${(err as Error).message}`,
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
          consumed.add(fact.contentKey);
        }
        continue;
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
      consumed.add(startFact.contentKey);
      consumed.add(endFact.contentKey);
    }
    return consumed;
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
 * Two-tier cross-task collision view computed once per `extractFromTask`.
 * See `findCollidingFacts` for the construction rules and the rationale for
 * per-target collision tracking on hydrated scopes.
 */
type CollisionTracker = {
  showScope: Set<SystemFactKey>;
  /** Keys shaped `<factKey>|<targetUid>` — built via `perTargetCollisionKey`. */
  perTarget: Set<string>;
};

function perTargetCollisionKey(factKey: SystemFactKey, targetUid: string): string {
  return `${factKey}|${targetUid}`;
}

function isFactColliding(fact: ExtractedFact, colliding: CollisionTracker): boolean {
  if (fact.scope === 'show') {
    return colliding.showScope.has(fact.factKey);
  }
  return colliding.perTarget.has(perTargetCollisionKey(fact.factKey, fact.targetUid));
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
    // Snapshots are persisted JSON cast to `UiSchemaV2`; a snapshot
    // produced by a different binary version can carry a `system_fact_key`
    // unknown to this binary. Skip silently — unknown keys can't be
    // extracted by any registered extractor anyway.
    const definition = SYSTEM_FACT_KEY_DEFINITIONS[factKey];
    if (!definition || definition.target !== 'show')
      continue;
    facts.push({
      contentKey: item.id,
      sourceFieldId: item.id,
      factKey,
      scope: 'show',
      targetUid: showUid,
      rawValue: content[item.id],
      reason: readReasonSidecar(content, item.id),
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
    if (!definition)
      continue;
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
      reason: readReasonSidecar(content, contentKey),
    });
  }

  return facts;
}

function readReasonSidecar(
  content: Record<string, unknown>,
  contentKey: string,
): string | undefined {
  const reason = content[getTaskContentReasonKey(contentKey)];
  return typeof reason === 'string' ? reason.trim() || undefined : undefined;
}

function outcomeFromDecision(decision: ExtractionDecision): ExtractionResultEntry['outcome'] {
  switch (decision.kind) {
    case 'write':
      return 'written';
    case 'skip':
      return 'skipped_lower_priority';
    case 'noop':
      // Extractor-level stale-target guard is defence-in-depth; the service
      // pre-filter usually catches these first, but if an extractor is
      // invoked directly the outcome should still surface as
      // `skipped_stale_target` (not generic `noop`) so the review queue can
      // segment it correctly.
      return decision.reason === 'target_stale' ? 'skipped_stale_target' : 'noop';
  }
}

/**
 * Deduplicates target UIDs for a given scope across all extracted facts.
 * Used by the bulk platform-target lookup so we read each ShowPlatform at
 * most once per `extractFromTask` call.
 */
function uniqueTargetUids(
  facts: ExtractedFact[],
  scope: 'platform' | 'creator',
): string[] {
  const seen = new Set<string>();
  for (const fact of facts) {
    if (fact.scope === scope) {
      seen.add(fact.targetUid);
    }
  }
  return Array.from(seen);
}
