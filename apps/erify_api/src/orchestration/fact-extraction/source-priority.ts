import type { ActualsSource } from '@eridu/api-types/audits';

/**
 * Priority hierarchy enforced by the extraction pipeline (PR 12.0.5).
 *
 * Active tiers (Phase 4):
 *   MANAGER (4) > PLATFORM (3) > OPERATOR (1) > PLANNED (0)
 *
 * `CREATOR_INPUT` (2) is a reserved tier — no Phase 4 writer emits it, but
 * the resolver tolerates it for forward compatibility so a future creator-
 * attributed source can land between PLATFORM and OPERATOR without a
 * schema change.
 *
 * The numeric weights are an implementation detail; callers should use
 * `canResolverOverwrite` rather than comparing ranks directly.
 */
const SOURCE_PRIORITY: Record<ActualsSource, number> = {
  MANAGER: 4,
  PLATFORM: 3,
  CREATOR_INPUT: 2,
  OPERATOR: 1,
  PLANNED: 0,
};

export function getSourceRank(source: ActualsSource): number {
  return SOURCE_PRIORITY[source];
}

/**
 * Returns true if `incoming` is allowed to overwrite a row whose currently
 * recorded source for the fact key is `recorded`. Equal-priority writes are
 * permitted so an OPERATOR re-submission can correct an earlier OPERATOR
 * value, and a manager edit can replace a prior manager edit.
 *
 * Pass `recorded = undefined` when the row's `metadata.actuals_source` map
 * has no entry for the fact key — the resolver treats that as PLANNED so
 * any active-tier source can write.
 */
export function canResolverOverwrite(
  incoming: ActualsSource,
  recorded: ActualsSource | undefined,
): boolean {
  const recordedRank = recorded ? SOURCE_PRIORITY[recorded] : SOURCE_PRIORITY.PLANNED;
  return SOURCE_PRIORITY[incoming] >= recordedRank;
}
