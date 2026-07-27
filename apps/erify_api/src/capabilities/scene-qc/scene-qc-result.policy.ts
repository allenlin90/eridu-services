import type { SceneQcResult } from '@eridu/api-types/scene-qc';
import { SCENE_QC_RESULT } from '@eridu/api-types/scene-qc';

/**
 * Pure Scene QC review result/feedback rules (PRD/plan section 5.3: "`feedback`
 * ... Null for Pass; required non-empty text for Minor and Fail"). Plain
 * functions, not an injectable provider -- no runtime configuration or
 * replaceable infrastructure is involved. Mirrors the shape of
 * `scene-qc-eligibility-policy.ts`.
 *
 * This is belt-and-braces with the shared Zod `superRefine` rule in
 * `@eridu/api-types/scene-qc` (`createSceneQcReviewInputSchema` /
 * `updateSceneQcReviewInputSchema`) -- the transport boundary already rejects
 * a malformed request; this defends the same invariant at the service layer.
 */

export function isFeedbackRequired(result: SceneQcResult): boolean {
  return result === SCENE_QC_RESULT.MINOR || result === SCENE_QC_RESULT.FAIL;
}

/**
 * Whether `feedback` satisfies the result's requirement. Pass: feedback is
 * always valid, present or not. Minor/Fail: feedback must be non-empty after
 * trimming.
 */
export function validateResultFeedback(result: SceneQcResult, feedback: string | null | undefined): boolean {
  if (!isFeedbackRequired(result)) {
    return true;
  }
  return (feedback ?? '').trim().length > 0;
}

/**
 * Normalizes feedback for persistence: trims, and collapses an empty string
 * (or a Pass result's feedback, per plan section 5.3 -- "Null for Pass") to
 * `null`. Minor/Fail feedback is trimmed but never forced to null here --
 * `validateResultFeedback` already guarantees it is non-empty by the time
 * this runs on an accepted save.
 */
export function normalizeFeedback(result: SceneQcResult, feedback: string | null | undefined): string | null {
  const trimmed = (feedback ?? '').trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (result === SCENE_QC_RESULT.PASS) {
    return null;
  }
  return trimmed;
}

/**
 * Whether a review may still be edited by the normal create/update command.
 * Once `confirmedAt` is set the review is immutable to normal edits -- Stage 2
 * introduces explicit amendment records rather than weakening this command.
 */
export function isReviewEditable(review: { confirmedAt: Date | null }): boolean {
  return review.confirmedAt === null;
}
