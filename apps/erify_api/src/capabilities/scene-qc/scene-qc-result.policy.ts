import type { SceneQcResult } from '@eridu/api-types/scene-qc';
import { SCENE_QC_RESULT } from '@eridu/api-types/scene-qc';

/** Pure Scene QC result rules shared by transport and workflow validation. */
export function validateResultFindings(result: SceneQcResult, findingCount: number): boolean {
  if (result === SCENE_QC_RESULT.PASS) {
    return findingCount === 0;
  }
  return findingCount > 0;
}

/**
 * Feedback is an optional note for every result. Structured findings carry
 * the required Minor/Fail classification.
 */
export function normalizeFeedback(feedback: string | null | undefined): string | null {
  const trimmed = (feedback ?? '').trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Whether a review may still be edited by the normal create/update command.
 * Once `confirmedAt` is set the review is immutable to normal edits -- Stage 2
 * introduces explicit amendment records rather than weakening this command.
 */
export function isReviewEditable(review: { confirmedAt: Date | null }): boolean {
  return review.confirmedAt === null;
}
