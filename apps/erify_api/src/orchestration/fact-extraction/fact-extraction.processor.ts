import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import type { AuditMetadata, AuditTargetType } from '@eridu/api-types/audits';

import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractors/extractor.types';

import { AuditService } from '@/models/audit/audit.service';

export type ProcessedFact = {
  decision: ExtractionDecision;
  auditUid?: string;
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
  constructor(private readonly auditService: AuditService) {}

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
}
