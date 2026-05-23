import { Injectable, Logger } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

import type { ActualsSource, AuditMetadata, AuditTargetType } from '@eridu/api-types/audits';
import {
  type FieldItemV2,
  parseHydratedContentKey,
  SYSTEM_FACT_KEY_DEFINITIONS,
  type SystemFactKey,
  type UiSchemaV2,
} from '@eridu/api-types/task-management';

import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
} from './extractors/extractor.types';
import { ExtractorRegistry } from './extractors/extractor-registry';

import { AuditService } from '@/models/audit/audit.service';
import { TaskService } from '@/models/task/task.service';

/**
 * Outcome the orchestrator returns to the caller (typically `TaskService` on
 * a `COMPLETED` transition). Each entry summarizes one bound field, regardless
 * of whether it produced an indexed write, was skipped on priority, was
 * blocked by a cross-task collision, or was a no-op (blank value, no
 * registered extractor, etc.).
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

@Injectable()
export class FactExtractionService {
  private readonly logger = new Logger(FactExtractionService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly auditService: AuditService,
    private readonly extractorRegistry: ExtractorRegistry,
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

    const ctx: ExtractionContext = {
      taskId: input.taskId,
      taskUid: input.taskUid,
      studioId: input.studioId,
      showId: input.showId,
      showUid: input.showUid,
      source: input.source,
    };

    const facts = collectBoundFacts(schema, content, input.showUid);
    if (facts.length === 0) {
      return { taskId: input.taskId, taskUid: input.taskUid, entries: [] };
    }

    const collidingFactKeys = await this.findCollidingFactKeys({
      currentTaskId: input.taskId,
      showId: input.showId,
      factKeys: facts.map((fact) => fact.factKey),
    });

    const entries: ExtractionResultEntry[] = [];

    for (const fact of facts) {
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

      let decision: ExtractionDecision;
      try {
        decision = await extractor.apply(fact, ctx);
      } catch (err) {
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

      const auditUid = await this.persistDecisionAudit(fact, ctx, decision);
      entries.push({
        factKey: fact.factKey,
        sourceFieldId: fact.sourceFieldId,
        contentKey: fact.contentKey,
        targetUid: fact.targetUid,
        outcome: outcomeFromDecision(decision),
        auditUid,
        reason: decision.kind === 'noop' ? decision.reason : undefined,
      });
    }

    return { taskId: input.taskId, taskUid: input.taskUid, entries };
  }

  /**
   * Returns the set of fact keys that already have *another active* task
   * targeting the same show. Active = `PENDING` or `REVIEW`, not soft-
   * deleted. Routing colliding writes to a SKIPPED audit avoids silently
   * picking a winner when two operator surfaces are in flight on the same
   * fact key.
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
      [TaskStatus.PENDING, TaskStatus.REVIEW],
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

  private async persistDecisionAudit(
    fact: ExtractedFact,
    ctx: ExtractionContext,
    decision: ExtractionDecision,
  ): Promise<string | undefined> {
    if (decision.kind === 'noop') {
      return undefined;
    }

    const targetIds = await this.resolveAuditTargetIds(fact, ctx);
    if (targetIds.length === 0) {
      return undefined;
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
      return audit.uid;
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
    return audit.uid;
  }

  private async writeCollisionSkipAudit(
    fact: ExtractedFact,
    ctx: ExtractionContext,
  ): Promise<{ uid: string } | undefined> {
    const targetIds = await this.resolveAuditTargetIds(fact, ctx);
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
   * Resolves the polymorphic audit target row(s) for a fact. Only `show`
   * scope is wired in PR 12.0.5; the other branches are placeholders for
   * 12.1/12.2/12.3 so the orchestrator doesn't need to grow when those
   * extractors land.
   */
  private async resolveAuditTargetIds(
    fact: ExtractedFact,
    ctx: ExtractionContext,
  ): Promise<{ targetType: AuditTargetType; targetId: bigint }[]> {
    if (fact.scope === 'show') {
      return [{ targetType: 'SHOW', targetId: ctx.showId }];
    }
    // 12.1.x and 12.2 register extractors for show_creator / show_platform
    // scopes; until they do, we have no resolved DB id to anchor the audit.
    return [];
  }
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
