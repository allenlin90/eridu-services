import { BadRequestException } from '@nestjs/common';

import { GATE_CONFIG, getGateConfig, isGateKind } from './show-state-gate.config';

describe('show-state-gate.config', () => {
  it('exposes show_cancellation with CANCELLED and COMPLETED outcomes', () => {
    expect(GATE_CONFIG.show_cancellation.allowedOutcomes).toEqual([
      'CANCELLED',
      'COMPLETED',
    ]);
    expect(GATE_CONFIG.show_cancellation.outcomesRequiringNoActiveTasks).toEqual([
      'CANCELLED',
    ]);
    expect(GATE_CONFIG.show_cancellation.requiresOwner).toBe(true);
  });

  it('exposes schedule_publish_removal with CANCELLED and RESTORE_PREVIOUS outcomes, unassigned by default', () => {
    expect(GATE_CONFIG.schedule_publish_removal.allowedOutcomes).toEqual([
      'CANCELLED',
      'RESTORE_PREVIOUS',
    ]);
    expect(
      GATE_CONFIG.schedule_publish_removal.outcomesRequiringNoActiveTasks,
    ).toEqual(['CANCELLED']);
    expect(GATE_CONFIG.schedule_publish_removal.requiresOwner).toBe(false);
  });

  describe('getGateConfig', () => {
    it('returns the config entry for a known gate kind', () => {
      expect(getGateConfig('show_cancellation')).toBe(
        GATE_CONFIG.show_cancellation,
      );
    });

    it('throws BadRequestException for an unknown gate kind', () => {
      expect(() => getGateConfig('not_a_real_kind' as any)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('isGateKind', () => {
    it('returns true for known gate kinds', () => {
      expect(isGateKind('show_cancellation')).toBe(true);
      expect(isGateKind('schedule_publish_removal')).toBe(true);
    });

    it('returns false for unknown strings, non-strings, and null/undefined', () => {
      expect(isGateKind('not_a_real_kind')).toBe(false);
      expect(isGateKind(undefined)).toBe(false);
      expect(isGateKind(null)).toBe(false);
      expect(isGateKind(42)).toBe(false);
    });
  });
});
