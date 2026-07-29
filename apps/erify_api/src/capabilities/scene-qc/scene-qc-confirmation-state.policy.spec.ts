import { diffConfirmationScope, resolveSceneQcConfirmationState, resolveSceneQcRevisionStatus } from './scene-qc-confirmation-state.policy';

const SHOW_A = 1n;
const SHOW_B = 2n;
const SHOW_C = 3n;
const REVIEW_A = 10n;
const REVIEW_B = 20n;
const REVIEW_C = 30n;

describe('resolveSceneQcConfirmationState', () => {
  it('resolves UNCONFIRMED with a null diff when there is no pinned confirmation', () => {
    const result = resolveSceneQcConfirmationState({
      pinned: null,
      current: [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }],
    });

    expect(result).toEqual({ state: 'UNCONFIRMED', diff: null });
  });

  it('resolves CURRENT when the pinned and current scopes are identical', () => {
    const pinned = [
      { showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 },
      { showId: SHOW_B, reviewId: REVIEW_B, reviewVersion: 2 },
    ];
    const current = [
      { showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 },
      { showId: SHOW_B, reviewId: REVIEW_B, reviewVersion: 2 },
    ];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({ state: 'CURRENT', diff: null });
  });

  it('resolves STALE with addedShowCount when a Show is added to the day', () => {
    const pinned = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];
    const current = [
      { showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 },
      { showId: SHOW_B, reviewId: REVIEW_B, reviewVersion: 1 },
    ];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 1, removedShowCount: 0, changedReviewCount: 0 },
    });
  });

  it('resolves STALE with addedShowCount when a cancelled Show is reactivated back into scope', () => {
    // Same mechanism as "added" -- reactivation re-enters the eligibility
    // deny-list filter upstream and reappears in `current` exactly like a
    // brand-new Show would (breakdown section 1.10 table).
    const pinned: { showId: bigint; reviewId: bigint; reviewVersion: number }[] = [];
    const current = [{ showId: SHOW_C, reviewId: REVIEW_C, reviewVersion: 1 }];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 1, removedShowCount: 0, changedReviewCount: 0 },
    });
  });

  it('resolves STALE with addedShowCount when a Show is rescheduled into the operational day', () => {
    // Same mechanism as "added" -- the Show's startTime now falls inside the
    // window and it appears in `current` for the first time.
    const pinned = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];
    const current = [
      { showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 },
      { showId: SHOW_C, reviewId: REVIEW_C, reviewVersion: 1 },
    ];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 1, removedShowCount: 0, changedReviewCount: 0 },
    });
  });

  it('resolves STALE with removedShowCount when a Show is rescheduled out of the operational day', () => {
    const pinned = [
      { showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 },
      { showId: SHOW_B, reviewId: REVIEW_B, reviewVersion: 1 },
    ];
    const current = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 0, removedShowCount: 1, changedReviewCount: 0 },
    });
  });

  it('resolves STALE with removedShowCount when a Show is terminally cancelled', () => {
    // Same mechanism as "removed" -- excluded by
    // SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS upstream and simply absent
    // from `current`.
    const pinned = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];
    const current: { showId: bigint; reviewId: bigint | null; reviewVersion: number | null }[] = [];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 0, removedShowCount: 1, changedReviewCount: 0 },
    });
  });

  it('resolves STALE with removedShowCount when a Show is soft-deleted', () => {
    // Same mechanism as "removed" -- the `deletedAt: null` predicate drops it
    // upstream and it is simply absent from `current`.
    const pinned = [{ showId: SHOW_B, reviewId: REVIEW_B, reviewVersion: 1 }];
    const current: { showId: bigint; reviewId: bigint | null; reviewVersion: number | null }[] = [];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 0, removedShowCount: 1, changedReviewCount: 0 },
    });
  });

  it('resolves STALE with changedReviewCount when the effective review is replaced/amended', () => {
    const pinned = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];
    const current = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 2 }];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 0, removedShowCount: 0, changedReviewCount: 1 },
    });
  });

  it('resolves STALE with changedReviewCount when a different review id is now effective for the same Show', () => {
    const pinned = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];
    const current = [{ showId: SHOW_A, reviewId: REVIEW_B, reviewVersion: 1 }];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 0, removedShowCount: 0, changedReviewCount: 1 },
    });
  });

  it('treats a null current review (no review head at all) as a changed review, not a removal', () => {
    const pinned = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];
    const current = [{ showId: SHOW_A, reviewId: null, reviewVersion: null }];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 0, removedShowCount: 0, changedReviewCount: 1 },
    });
  });

  it('combines multiple change kinds in one diff', () => {
    const pinned = [
      { showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 },
      { showId: SHOW_B, reviewId: REVIEW_B, reviewVersion: 1 },
    ];
    const current = [
      { showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 2 },
      { showId: SHOW_C, reviewId: REVIEW_C, reviewVersion: 1 },
    ];

    expect(resolveSceneQcConfirmationState({ pinned, current })).toEqual({
      state: 'STALE',
      diff: { addedShowCount: 1, removedShowCount: 1, changedReviewCount: 1 },
    });
  });
});

describe('resolveSceneQcRevisionStatus', () => {
  it('returns SUPERSEDED when a later revision exists, regardless of scope', () => {
    const pinned = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];
    const current = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];

    expect(resolveSceneQcRevisionStatus({ hasLaterRevision: true, pinned, current })).toBe('SUPERSEDED');
  });

  it('returns CURRENT when it is the latest revision and the scope is unchanged', () => {
    const pinned = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];
    const current = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];

    expect(resolveSceneQcRevisionStatus({ hasLaterRevision: false, pinned, current })).toBe('CURRENT');
  });

  it('returns STALE when it is the latest revision but the scope has drifted', () => {
    const pinned = [{ showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 }];
    const current = [
      { showId: SHOW_A, reviewId: REVIEW_A, reviewVersion: 1 },
      { showId: SHOW_B, reviewId: REVIEW_B, reviewVersion: 1 },
    ];

    expect(resolveSceneQcRevisionStatus({ hasLaterRevision: false, pinned, current })).toBe('STALE');
  });
});

describe('diffConfirmationScope', () => {
  it('normalizes bigint keys to strings so equal-value bigints from different sources still compare equal', () => {
    const pinned = [{ showId: BigInt('1'), reviewId: REVIEW_A, reviewVersion: 1 }];
    const current = [{ showId: BigInt(1), reviewId: REVIEW_A, reviewVersion: 1 }];

    expect(diffConfirmationScope(pinned, current)).toEqual({
      addedShowCount: 0,
      removedShowCount: 0,
      changedReviewCount: 0,
    });
  });
});
