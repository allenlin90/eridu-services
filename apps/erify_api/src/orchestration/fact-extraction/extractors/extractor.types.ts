import type { ActualsSource, AuditAction } from '@eridu/api-types/audits';
import type {
  HydrationScope,
  SystemFactKey,
} from '@eridu/api-types/task-management';

/**
 * One bound field surfaced by an operator task submission. Built from the
 * task's stored `content` against the template's `system_fact_key` markers;
 * stale-target rows are filtered out before reaching the extractor.
 */
export type ExtractedFact = {
  /** Hydrated content key: `<fieldId>:<scope>:<targetUid>` (or the bare fieldId for show-scoped facts). */
  contentKey: string;
  /** Un-hydrated template field id, copied into audit metadata as `task_field_id`. */
  sourceFieldId: string;
  factKey: SystemFactKey;
  /** `creator` / `platform` / `show` — `show` is inferred from the fact-key definition rather than the key. */
  scope: HydrationScope | 'show';
  /** UID of the target the fact is attributed to (`Show.uid`, `ShowCreator.uid`, or `ShowPlatform.uid`). */
  targetUid: string;
  /** Raw value from `task.content[contentKey]` — null / undefined are treated as "not recorded". */
  rawValue: unknown;
};

/**
 * Per-task input handed to an extractor.
 */
export type ExtractionContext = {
  taskId: bigint;
  taskUid: string;
  studioId: bigint | null;
  showId: bigint;
  showUid: string;
  /**
   * Source tier the engine is writing as. Phase 4 task submissions always
   * write as `OPERATOR`; manager and platform writers use their own paths.
   */
  source: ActualsSource;
};

/**
 * Outcome an extractor reports back to the orchestrator. The orchestrator
 * persists the indexed write (if any) and the audit envelope as a single
 * decision so the audit table never disagrees with the indexed column.
 */
export type ExtractionDecision =
  | {
    kind: 'write';
    action: Extract<AuditAction, 'CREATE' | 'UPDATE' | 'OVERRIDE'>;
    /** Old indexed value, projected to JSON for the audit row. */
    oldValue: unknown;
    /** New indexed value, projected to JSON for the audit row. */
    newValue: unknown;
  }
  | {
    kind: 'skip';
    action: Extract<AuditAction, 'SKIPPED_LOWER_PRIORITY'>;
    /** Source that currently owns the field — copied into `metadata.skipped_by_source`. */
    skippedBy: ActualsSource;
    attemptedValue: unknown;
  }
  | {
    kind: 'noop';
    /** Set when the operator left the field blank — no write, no audit. */
    reason: 'value_absent' | 'value_unchanged';
  };

/**
 * Strategy interface implemented per `SystemFactKey`. Each extractor owns its
 * target resolution, value parsing, priority comparison, and persistence.
 * The registry routes facts by key; the orchestrator handles audit envelope
 * creation and cross-task collision routing around each call.
 */
export type IngestionExtractor = {
  readonly factKey: SystemFactKey;
  apply: (fact: ExtractedFact, ctx: ExtractionContext) => Promise<ExtractionDecision>;
};
