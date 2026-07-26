import { isShowEligibleForSceneQc } from './scene-qc-eligibility.policy';

describe('isShowEligibleForSceneQc', () => {
  it('excludes a terminally CANCELLED show', () => {
    expect(
      isShowEligibleForSceneQc({ showStatusSystemKey: 'CANCELLED', deletedAt: null }),
    ).toBe(false);
  });

  it('includes a CANCELLED_PENDING_RESOLUTION show', () => {
    expect(
      isShowEligibleForSceneQc({
        showStatusSystemKey: 'CANCELLED_PENDING_RESOLUTION',
        deletedAt: null,
      }),
    ).toBe(true);
  });

  it.each(['DRAFT', 'CONFIRMED', 'LIVE', 'COMPLETED'])(
    'includes a %s show',
    (systemKey) => {
      expect(
        isShowEligibleForSceneQc({ showStatusSystemKey: systemKey, deletedAt: null }),
      ).toBe(true);
    },
  );

  it('includes a show with no system key mapped', () => {
    expect(
      isShowEligibleForSceneQc({ showStatusSystemKey: null, deletedAt: null }),
    ).toBe(true);
  });

  it('excludes a soft-deleted show', () => {
    expect(
      isShowEligibleForSceneQc({ showStatusSystemKey: 'CONFIRMED', deletedAt: new Date() }),
    ).toBe(false);
  });

  it('excludes a soft-deleted CANCELLED show (both reasons apply)', () => {
    expect(
      isShowEligibleForSceneQc({ showStatusSystemKey: 'CANCELLED', deletedAt: new Date() }),
    ).toBe(false);
  });
});
