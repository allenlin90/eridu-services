/**
 * Pure Scene QC eligibility rules (PRD "Daily Completion" section). Plain
 * functions, not an injectable provider — no runtime configuration or
 * replaceable infrastructure is involved.
 */

// A scheduled Show is eligible for Scene QC unless it is in terminal
// `CANCELLED` state. `CANCELLED_PENDING_RESOLUTION` is deliberately excluded
// from this list — production may have occurred and cancellation isn't final,
// so it stays ELIGIBLE. This is a deny-list, not an allow-list: any other or
// unknown `systemKey` (including `null`/`undefined`) stays eligible.
export const SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS = ['CANCELLED'] as const;

export type SceneQcShowEligibilityInput = {
  deletedAt: Date | null;
  statusSystemKey: string | null | undefined;
  startTime: Date | null;
};

/**
 * Whether a Show's current status keeps it in the Scene QC daily completion
 * denominator. Deny-list semantics: only terminal `CANCELLED` is excluded.
 */
export function isSceneQcEligibleShowStatus(statusSystemKey: string | null | undefined): boolean {
  if (statusSystemKey === null || statusSystemKey === undefined) {
    return true;
  }
  return !(SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS as readonly string[]).includes(statusSystemKey);
}

/**
 * Whether a Show belongs in a resolved operational-day window. Half-open
 * membership: `windowStart <= startTime < windowEnd`. A soft-deleted Show, an
 * excluded status, or a missing `startTime` is never eligible.
 */
export function isShowEligibleForSceneQc(
  show: SceneQcShowEligibilityInput,
  window: { windowStart: Date; windowEnd: Date },
): boolean {
  if (show.deletedAt !== null) {
    return false;
  }
  if (!isSceneQcEligibleShowStatus(show.statusSystemKey)) {
    return false;
  }
  if (show.startTime === null) {
    return false;
  }

  const startTimeMs = show.startTime.getTime();
  return startTimeMs >= window.windowStart.getTime() && startTimeMs < window.windowEnd.getTime();
}
