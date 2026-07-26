// Pure policy, no Nest DI. Terminal cancellation is the only exclusion.
// `CANCELLED_PENDING_RESOLUTION` stays eligible because production may have
// occurred and the cancellation is not final (docs/prd/scene-qc.md "Daily
// Completion"). Matches the `ShowStatus.systemKey` spelling used across the
// show-orchestration cancellation gate (see
// `show-orchestration/show-status-write-policy.ts`).
export const SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS = ['CANCELLED'] as const;

export type SceneQcEligibilityShow = {
  showStatusSystemKey: string | null;
  deletedAt: Date | null;
};

/**
 * A Show is eligible for the daily Scene QC queue unless it is terminally
 * cancelled or soft-deleted. `cancelled_pending_resolution` remains eligible.
 */
export function isShowEligibleForSceneQc(show: SceneQcEligibilityShow): boolean {
  if (show.deletedAt !== null) {
    return false;
  }

  if (
    show.showStatusSystemKey !== null
    && (SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS as readonly string[]).includes(
      show.showStatusSystemKey,
    )
  ) {
    return false;
  }

  return true;
}
