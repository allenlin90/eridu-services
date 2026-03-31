import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

export function getMissingCreatorGuidance(isAdmin: boolean): string {
  return isAdmin
    ? 'Can’t find the right creator? Add them to the studio roster first.'
    : 'Can’t find the right creator? Ask a studio admin to add them to the studio roster.';
}

export function getRosterAssignmentFailureMessage(reason: string, isAdmin: boolean): string {
  if (reason === STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER) {
    return isAdmin
      ? 'Creator is not in this studio roster. Add them to the roster first.'
      : 'Creator is not in this studio roster. Ask a studio admin to onboard them.';
  }

  if (reason === STUDIO_CREATOR_ROSTER_ERROR.CREATOR_INACTIVE_IN_ROSTER) {
    return isAdmin
      ? 'Creator is inactive in this studio roster. Reactivate them in roster first.'
      : 'Creator is inactive in this studio roster. Ask a studio admin to reactivate them.';
  }

  return reason;
}
