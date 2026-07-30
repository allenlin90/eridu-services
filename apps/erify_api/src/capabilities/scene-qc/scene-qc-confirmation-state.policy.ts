import type { SceneQcConfirmationState, SceneQcReportStatus } from '@eridu/api-types/scene-qc';
import { SCENE_QC_CONFIRMATION_STATE, SCENE_QC_REPORT_STATUS } from '@eridu/api-types/scene-qc';

/**
 * Pure decision function for the three-way daily confirmation state. No Nest
 * provider, no I/O -- the correctness core of the whole capability, proven
 * before anything (the confirmation workflow, the summary read model)
 * depends on it.
 *
 * `CURRENT` requires both an equal `showId` set AND a matching
 * `(reviewId, reviewVersion)` per Show. Comparing `reviewVersion` is only
 * sound because confirmation does NOT bump `SceneQcReview.version` --
 * the two decisions are coupled and must be changed together if either is
 * revisited.
 */

export type PinnedScopeEntry = { showId: bigint; reviewId: bigint; reviewVersion: number };
export type CurrentScopeEntry = { showId: bigint; reviewId: bigint | null; reviewVersion: number | null };

export type ConfirmationScopeDiff = {
  /** Eligible now, not pinned. */
  addedShowCount: number;
  /** Pinned, not eligible now (rescheduled out, cancelled, soft-deleted). */
  removedShowCount: number;
  /** Pinned and still eligible, but a different review id/version. */
  changedReviewCount: number;
};

export function diffConfirmationScope(
  pinned: PinnedScopeEntry[],
  current: CurrentScopeEntry[],
): ConfirmationScopeDiff {
  const pinnedByShow = new Map(pinned.map((entry) => [entry.showId.toString(), entry]));
  const currentByShow = new Map(current.map((entry) => [entry.showId.toString(), entry]));

  let addedShowCount = 0;
  let removedShowCount = 0;
  let changedReviewCount = 0;

  for (const [showKey, currentEntry] of currentByShow) {
    const pinnedEntry = pinnedByShow.get(showKey);
    if (!pinnedEntry) {
      addedShowCount += 1;
      continue;
    }
    const reviewIdChanged = currentEntry.reviewId === null || currentEntry.reviewId !== pinnedEntry.reviewId;
    const versionChanged = currentEntry.reviewVersion === null || currentEntry.reviewVersion !== pinnedEntry.reviewVersion;
    if (reviewIdChanged || versionChanged) {
      changedReviewCount += 1;
    }
  }

  for (const showKey of pinnedByShow.keys()) {
    if (!currentByShow.has(showKey)) {
      removedShowCount += 1;
    }
  }

  return { addedShowCount, removedShowCount, changedReviewCount };
}

export function resolveSceneQcConfirmationState(input: {
  pinned: PinnedScopeEntry[] | null;
  current: CurrentScopeEntry[];
}): { state: SceneQcConfirmationState; diff: ConfirmationScopeDiff | null } {
  if (input.pinned === null) {
    return { state: SCENE_QC_CONFIRMATION_STATE.UNCONFIRMED, diff: null };
  }

  const diff = diffConfirmationScope(input.pinned, input.current);
  const isCurrent = diff.addedShowCount === 0 && diff.removedShowCount === 0 && diff.changedReviewCount === 0;

  return isCurrent
    ? { state: SCENE_QC_CONFIRMATION_STATE.CURRENT, diff: null }
    : { state: SCENE_QC_CONFIRMATION_STATE.STALE, diff };
}

/**
 * The report/record-detail analogue of {@link resolveSceneQcConfirmationState},
 * for a single REVISION rather than a DAY (OQ-41 -- the two are deliberately
 * separate enums). `hasLaterRevision` short-circuits to `SUPERSEDED` (OQ-42's
 * cheap path); otherwise the revision's own pinned scope is diffed against
 * the day's current eligible scope exactly like the daily summary does,
 * because a revision that is still the day's latest can itself be CURRENT or
 * STALE. Shared by `SceneQcReportService` and
 * `SceneQcRecordsQueryService.getRecordDetail` so the logic exists once.
 */
export function resolveSceneQcRevisionStatus(input: {
  hasLaterRevision: boolean;
  pinned: PinnedScopeEntry[];
  current: CurrentScopeEntry[];
}): SceneQcReportStatus {
  if (input.hasLaterRevision) {
    return SCENE_QC_REPORT_STATUS.SUPERSEDED;
  }
  const { state } = resolveSceneQcConfirmationState({ pinned: input.pinned, current: input.current });
  return state === SCENE_QC_CONFIRMATION_STATE.CURRENT ? SCENE_QC_REPORT_STATUS.CURRENT : SCENE_QC_REPORT_STATUS.STALE;
}
