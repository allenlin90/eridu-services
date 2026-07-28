import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentOperationalDate, shiftOperationalDate } from '../scene-qc-operational-date';

describe('scene-qc-operational-date', () => {
  describe('getCurrentOperationalDate', () => {
    it('returns the current Bangkok calendar date once past the 06:00 start hour', () => {
      // 2026-06-01T23:30:00Z = 2026-06-02 06:30 Asia/Bangkok (UTC+7)
      expect(getCurrentOperationalDate(new Date('2026-06-01T23:30:00.000Z'))).toBe('2026-06-02');
    });

    it('rolls back to the previous calendar date before 06:00 local time', () => {
      // 2026-06-01T22:00:00Z = 2026-06-02 05:00 Asia/Bangkok -- before 06:00, so belongs to 06-01
      expect(getCurrentOperationalDate(new Date('2026-06-01T22:00:00.000Z'))).toBe('2026-06-01');
    });

    it('is exactly the boundary-inclusive: 06:00:00 local belongs to that date', () => {
      // 2026-06-01T23:00:00Z = 2026-06-02 06:00:00 Asia/Bangkok exactly
      expect(getCurrentOperationalDate(new Date('2026-06-01T23:00:00.000Z'))).toBe('2026-06-02');
    });

    describe('uses the server-authoritative operational timezone, not the browser/process timezone', () => {
      beforeEach(() => {
        // Simulate a browser/runtime local timezone far from Asia/Bangkok.
        vi.stubEnv('TZ', 'America/New_York');
      });

      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it('still resolves the Bangkok-anchored operational date regardless of the local runtime timezone', () => {
        expect(getCurrentOperationalDate(new Date('2026-06-01T23:30:00.000Z'))).toBe('2026-06-02');
      });
    });
  });

  describe('shiftOperationalDate', () => {
    it('shifts forward by one calendar day', () => {
      expect(shiftOperationalDate('2026-06-01', 1)).toBe('2026-06-02');
    });

    it('shifts backward by one calendar day', () => {
      expect(shiftOperationalDate('2026-06-01', -1)).toBe('2026-05-31');
    });

    it('crosses a month/year boundary correctly', () => {
      expect(shiftOperationalDate('2026-12-31', 1)).toBe('2027-01-01');
      expect(shiftOperationalDate('2026-01-01', -1)).toBe('2025-12-31');
    });

    it('throws on a malformed date string rather than silently producing garbage', () => {
      expect(() => shiftOperationalDate('not-a-date', 1)).toThrow();
    });
  });
});
