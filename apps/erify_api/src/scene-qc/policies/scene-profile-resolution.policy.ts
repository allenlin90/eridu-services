// Pure policies, no Nest DI. See SCENE_QC_IMPLEMENTATION_PLAN.md §5.2 and
// "Decisions Locked for Stage 1" (profile resolution).

export type SceneProfileResolutionSource = 'SHOW_ASSIGNMENT' | 'CLIENT_DEFAULT' | 'NONE';

export type SceneProfileResolutionInput<TProfile> = {
  /** Active, non-deleted explicit Show assignment target, if any. */
  assignedProfile: TProfile | null;
  /** The owning Client's active, non-deleted default profile, if any. */
  clientDefaultProfile: TProfile | null;
};

export type SceneProfileResolution<TProfile> = {
  source: SceneProfileResolutionSource;
  profile: TProfile | null;
};

/**
 * Deterministic Show -> Scene Profile resolution: an explicit Show
 * assignment always wins over the Client default. Generic over the caller's
 * profile read shape so this policy owns only the resolution order, not the
 * persisted profile projection.
 */
export function resolveSceneProfile<TProfile>(
  input: SceneProfileResolutionInput<TProfile>,
): SceneProfileResolution<TProfile> {
  if (input.assignedProfile !== null) {
    return { source: 'SHOW_ASSIGNMENT', profile: input.assignedProfile };
  }

  if (input.clientDefaultProfile !== null) {
    return { source: 'CLIENT_DEFAULT', profile: input.clientDefaultProfile };
  }

  return { source: 'NONE', profile: null };
}

export type MaterialLinkApplicabilityContext = {
  studioId: bigint;
  platformIds: bigint[];
};

export type ApplicabilityScopedLink = {
  studioId: bigint | null;
  platformId: bigint | null;
};

/**
 * Read-time applicability of one ordered gallery link. An unscoped
 * (`null`) studio or platform applies everywhere within the owning Client;
 * a scoped value must match the Show's studio / one of the Show's platforms.
 */
export function isMaterialLinkApplicable(
  link: ApplicabilityScopedLink,
  context: MaterialLinkApplicabilityContext,
): boolean {
  if (link.studioId !== null && link.studioId !== context.studioId) {
    return false;
  }

  if (link.platformId !== null && !context.platformIds.includes(link.platformId)) {
    return false;
  }

  return true;
}

/**
 * Filters an ordered gallery of material links to those applicable to the
 * given Show context, preserving the pinned `sortOrder`.
 */
export function selectApplicableMaterials<
  TLink extends ApplicabilityScopedLink & { sortOrder: number },
>(links: TLink[], context: MaterialLinkApplicabilityContext): TLink[] {
  return links
    .filter((link) => isMaterialLinkApplicable(link, context))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
