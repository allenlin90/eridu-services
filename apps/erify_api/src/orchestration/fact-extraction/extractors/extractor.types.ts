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
  /** Optional reason sidecar from `task.content[`${contentKey}__reason`]`. */
  reason?: string;
  /**
   * Fact keys co-submitted for the SAME target in the current task
   * submission (excludes this fact's own key). Lets an extractor reason
   * about sibling writes that share a column with this fact — e.g. the
   * attendance-missing extractor needs to know whether the start-time
   * extractor is ALSO writing in this run before it decides to clear
   * the shared `attendanceReason`. The service populates this during
   * fact collection; left optional so call sites that build minimal
   * fact fixtures (tests, direct processor invocations) don't need to
   * stitch the set themselves. Consumers should treat `undefined` as
   * "no siblings known."
   */
  coSubmittedFactKeysForTarget?: ReadonlySet<SystemFactKey>;
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
    /**
     * `value_absent`     — operator left the field blank.
     * `value_unchanged`  — resubmission of the recorded value by the same source.
     * `target_stale`     — hydrated target is no longer assigned / has been
     *                      soft-deleted between submission and extraction.
     *                      No write, no audit; the value stays in
     *                      `task.content` for the PR 12.4 review queue.
     */
    reason: 'value_absent' | 'value_unchanged' | 'target_stale';
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
