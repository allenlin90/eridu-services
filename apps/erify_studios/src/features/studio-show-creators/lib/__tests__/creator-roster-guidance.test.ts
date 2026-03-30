import { describe, expect, it } from 'vitest';

import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

import {
  getMissingCreatorGuidance,
  getRosterAssignmentFailureMessage,
} from '../creator-roster-guidance';

describe('creator roster guidance', () => {
  it('returns role-aware missing creator guidance', () => {
    expect(getMissingCreatorGuidance(true)).toContain('Add them to the studio roster first');
    expect(getMissingCreatorGuidance(false)).toContain('Ask a studio admin');
  });

  it('maps roster-not-in-studio errors to readable admin/operator copy', () => {
    expect(
      getRosterAssignmentFailureMessage(STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER, true),
    ).toContain('Add them to the roster first');

    expect(
      getRosterAssignmentFailureMessage(STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER, false),
    ).toContain('Ask a studio admin');
  });

  it('maps inactive-roster errors to readable admin/operator copy', () => {
    expect(
      getRosterAssignmentFailureMessage(STUDIO_CREATOR_ROSTER_ERROR.CREATOR_INACTIVE_IN_ROSTER, true),
    ).toContain('Reactivate');

    expect(
      getRosterAssignmentFailureMessage(STUDIO_CREATOR_ROSTER_ERROR.CREATOR_INACTIVE_IN_ROSTER, false),
    ).toContain('Ask a studio admin');
  });
});
