import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

export function getMissingCreatorGuidance(canManageRoster: boolean): string {
  return canManageRoster
    ? 'Can’t find the right creator? Add them to the studio roster first.'
    : 'Can’t find the right creator? Ask a studio admin or talent manager to add them to the studio roster.';
}

export function getRosterAssignmentFailureMessage(reason: string, canManageRoster: boolean): string {
  if (reason === STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER) {
    return canManageRoster
      ? 'Creator is not in this studio roster. Add them to the roster first.'
      : 'Creator is not in this studio roster. Ask a studio admin or talent manager to onboard them.';
  }

  if (reason === STUDIO_CREATOR_ROSTER_ERROR.CREATOR_INACTIVE_IN_ROSTER) {
    return canManageRoster
      ? 'Creator is inactive in this studio roster. Reactivate them in roster first.'
      : 'Creator is inactive in this studio roster. Ask a studio admin or talent manager to reactivate them.';
  }

  return reason;
}
