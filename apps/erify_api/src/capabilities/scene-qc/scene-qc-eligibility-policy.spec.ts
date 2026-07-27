import {
  isSceneQcEligibleShowStatus,
  isShowEligibleForSceneQc,
  SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS,
} from './scene-qc-eligibility-policy';

import { CANCELLATION_GATE_OWNED_SHOW_STATUS_SYSTEM_KEYS } from '@/show-orchestration/show-status-write-policy';

const WINDOW = {
  windowStart: new Date('2026-06-01T23:00:00.000Z'),
  windowEnd: new Date('2026-06-02T23:00:00.000Z'),
};

function buildShow(overrides: Partial<Parameters<typeof isShowEligibleForSceneQc>[0]> = {}) {
  return {
    deletedAt: null,
    statusSystemKey: 'CONFIRMED',
    startTime: WINDOW.windowStart,
    ...overrides,
  };
}

describe('scene-qc eligibility policy', () => {
  describe('isSceneQcEligibleShowStatus', () => {
    it('excludes terminal CANCELLED', () => {
      expect(isSceneQcEligibleShowStatus('CANCELLED')).toBe(false);
    });

    it('includes CANCELLED_PENDING_RESOLUTION — production may have occurred and cancellation is not final', () => {
      expect(isSceneQcEligibleShowStatus('CANCELLED_PENDING_RESOLUTION')).toBe(true);
    });

    it('does not collide with the cancellation-gate-owned status set, which includes both CANCELLED keys', () => {
      // The cancellation gate's status set intentionally contains BOTH keys
      // (it owns writes into and out of both states). Scene QC's exclusion
      // list is a narrower, differently-scoped constant that only excludes
      // the terminal state — this asserts the two lists are not accidentally
      // the same constant or kept in sync.
      expect(CANCELLATION_GATE_OWNED_SHOW_STATUS_SYSTEM_KEYS).toContain('CANCELLED');
      expect(CANCELLATION_GATE_OWNED_SHOW_STATUS_SYSTEM_KEYS).toContain('CANCELLED_PENDING_RESOLUTION');
      expect(SCENE_QC_EXCLUDED_SHOW_STATUS_SYSTEM_KEYS).toEqual(['CANCELLED']);
    });

    it.each(['DRAFT', 'CONFIRMED', 'LIVE', 'COMPLETED', 'SOME_FUTURE_UNKNOWN_KEY'])(
      'includes %s — deny-list, not allow-list',
      (systemKey) => {
        expect(isSceneQcEligibleShowStatus(systemKey)).toBe(true);
      },
    );

    it('includes a null status key', () => {
      expect(isSceneQcEligibleShowStatus(null)).toBe(true);
    });

    it('includes an undefined status key', () => {
      expect(isSceneQcEligibleShowStatus(undefined)).toBe(true);
    });
  });

  describe('isShowEligibleForSceneQc', () => {
    it('excludes a soft-deleted Show regardless of status', () => {
      const show = buildShow({ deletedAt: new Date(), statusSystemKey: 'CONFIRMED' });
      expect(isShowEligibleForSceneQc(show, WINDOW)).toBe(false);
    });

    it('includes a Show whose startTime equals windowStart (inclusive lower bound)', () => {
      const show = buildShow({ startTime: WINDOW.windowStart });
      expect(isShowEligibleForSceneQc(show, WINDOW)).toBe(true);
    });

    it('excludes a Show whose startTime equals windowEnd (exclusive upper bound)', () => {
      const show = buildShow({ startTime: WINDOW.windowEnd });
      expect(isShowEligibleForSceneQc(show, WINDOW)).toBe(false);
    });

    it('includes a Show whose startTime is windowEnd minus 1ms', () => {
      const show = buildShow({ startTime: new Date(WINDOW.windowEnd.getTime() - 1) });
      expect(isShowEligibleForSceneQc(show, WINDOW)).toBe(true);
    });

    it('excludes a Show with a null startTime', () => {
      const show = buildShow({ startTime: null });
      expect(isShowEligibleForSceneQc(show, WINDOW)).toBe(false);
    });

    it('excludes a Show with terminal CANCELLED status inside the window', () => {
      const show = buildShow({ statusSystemKey: 'CANCELLED' });
      expect(isShowEligibleForSceneQc(show, WINDOW)).toBe(false);
    });

    it('includes a Show with CANCELLED_PENDING_RESOLUTION status inside the window', () => {
      const show = buildShow({ statusSystemKey: 'CANCELLED_PENDING_RESOLUTION' });
      expect(isShowEligibleForSceneQc(show, WINDOW)).toBe(true);
    });
  });
});
