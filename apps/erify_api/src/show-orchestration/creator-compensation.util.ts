import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';

/**
 * Pure creator-compensation helpers shared by both the write path
 * (`ShowOrchestrationService.resolveCreatorSnapshot`) and the read path
 * (`CreatorCompensationService`). Kept as standalone functions so neither
 * service has to depend on the other for this stateless logic.
 */

/** Formats a Decimal-like value to its string form, preserving `null`/`undefined` as `null`. */
export function decimalLikeToString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toString();
}

/**
 * Whether a creator's compensation snapshot is missing the data its
 * compensation type requires (an agreed rate for FIXED/HYBRID, a commission
 * rate for COMMISSION/HYBRID, or any type at all).
 */
export function isCreatorSnapshotMissing(
  compensationType: string | null,
  agreedRate: string | null,
  commissionRate: string | null,
): boolean {
  if (!compensationType) {
    return true;
  }

  if (
    (compensationType === CREATOR_COMPENSATION_TYPE.FIXED
      || compensationType === CREATOR_COMPENSATION_TYPE.HYBRID)
    && !agreedRate
  ) {
    return true;
  }

  return (
    (compensationType === CREATOR_COMPENSATION_TYPE.COMMISSION
      || compensationType === CREATOR_COMPENSATION_TYPE.HYBRID)
    && !commissionRate
  );
}
