import {
  isReviewEditable,
  normalizeFeedback,
  validateResultFindings,
} from './scene-qc-result.policy';

describe('scene-qc result policy', () => {
  describe('validateResultFindings', () => {
    it('accepts PASS only without findings', () => {
      expect(validateResultFindings('PASS', 0)).toBe(true);
      expect(validateResultFindings('PASS', 1)).toBe(false);
    });

    it.each(['MINOR', 'FAIL'] as const)('requires findings for %s', (result) => {
      expect(validateResultFindings(result, 0)).toBe(false);
      expect(validateResultFindings(result, 1)).toBe(true);
    });
  });

  describe('normalizeFeedback', () => {
    it('preserves and trims an optional note for any result', () => {
      expect(normalizeFeedback('  looks good  ')).toBe('looks good');
      expect(normalizeFeedback(null)).toBeNull();
      expect(normalizeFeedback(undefined)).toBeNull();
    });

    it('normalizes a whitespace-only note to null', () => {
      expect(normalizeFeedback('   ')).toBeNull();
    });
  });

  describe('isReviewEditable', () => {
    it('is editable when confirmedAt is null', () => {
      expect(isReviewEditable({ confirmedAt: null })).toBe(true);
    });

    it('is not editable once confirmedAt is set', () => {
      expect(isReviewEditable({ confirmedAt: new Date('2026-01-01T00:00:00.000Z') })).toBe(false);
    });
  });
});
