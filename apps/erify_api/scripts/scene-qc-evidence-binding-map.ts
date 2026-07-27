/**
 * Reviewed Scene QC evidence cutover mapping (plan sections 5.2 / 5.7 / 13 step 2).
 *
 * NOT a heuristic. An operator runs
 *   pnpm --filter erify_api exec tsx scripts/backfill-scene-qc-evidence-refs.ts --report
 * reviews the candidate image fields it prints, and records the decision here.
 * Every active template that feeds Scene QC must appear in exactly one of the
 * two lists below; verify-scene-qc-evidence-bindings.ts fails otherwise.
 */

export type SceneQcEvidenceBinding = {
  templateUid: string;
  /** Content keys: v1 -> item.key, v2 -> item.id (fld_...). */
  fieldKeys: readonly string[];
  /** Who reviewed this and why these fields. Required. */
  note: string;
};

export const SCENE_QC_EVIDENCE_BINDINGS: readonly SceneQcEvidenceBinding[] = [
  // TODO(scene-qc-cutover): populate from the --report output before rollout
  // step 2. Leaving this empty makes verification fail closed for every
  // in-scope snapshot, which is the intended pre-review state.
];

/**
 * Active templates an operator reviewed and deliberately decided do NOT feed
 * Scene QC. An explicit reason is required.
 */
export const SCENE_QC_INTENTIONALLY_UNBOUND: readonly { templateUid: string; reason: string }[] = [
  // TODO(scene-qc-cutover): populate alongside SCENE_QC_EVIDENCE_BINDINGS.
];
