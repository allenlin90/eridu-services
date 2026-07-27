import {
  isFeedbackRequired,
  isReviewEditable,
  normalizeFeedback,
  validateResultFeedback,
} from './scene-qc-result.policy';

describe('scene-qc result policy', () => {
  describe('isFeedbackRequired', () => {
    it('is false for PASS', () => {
      expect(isFeedbackRequired('PASS')).toBe(false);
    });

    it('is true for MINOR and FAIL', () => {
      expect(isFeedbackRequired('MINOR')).toBe(true);
      expect(isFeedbackRequired('FAIL')).toBe(true);
    });
  });

  describe('validateResultFeedback', () => {
    it('accepts PASS with empty, whitespace-only, null, or undefined feedback', () => {
      expect(validateResultFeedback('PASS', '')).toBe(true);
      expect(validateResultFeedback('PASS', '   ')).toBe(true);
      expect(validateResultFeedback('PASS', null)).toBe(true);
      expect(validateResultFeedback('PASS', undefined)).toBe(true);
    });

    it('accepts PASS with non-empty feedback too', () => {
      expect(validateResultFeedback('PASS', 'looks fine')).toBe(true);
    });

    it.each(['MINOR', 'FAIL'] as const)('rejects %s with empty, whitespace-only, null, or undefined feedback', (result) => {
      expect(validateResultFeedback(result, '')).toBe(false);
      expect(validateResultFeedback(result, '   ')).toBe(false);
      expect(validateResultFeedback(result, null)).toBe(false);
      expect(validateResultFeedback(result, undefined)).toBe(false);
    });

    it.each(['MINOR', 'FAIL'] as const)('accepts %s with non-empty feedback', (result) => {
      expect(validateResultFeedback(result, 'watermark visible')).toBe(true);
    });
  });

  describe('normalizeFeedback', () => {
    it('normalizes PASS feedback to null even when text was provided', () => {
      expect(normalizeFeedback('PASS', 'looks good')).toBeNull();
      expect(normalizeFeedback('PASS', null)).toBeNull();
      expect(normalizeFeedback('PASS', undefined)).toBeNull();
    });

    it('trims MINOR/FAIL feedback', () => {
      expect(normalizeFeedback('MINOR', '  watermark visible  ')).toBe('watermark visible');
      expect(normalizeFeedback('FAIL', '  blank image  ')).toBe('blank image');
    });

    it('normalizes whitespace-only MINOR/FAIL feedback to null', () => {
      expect(normalizeFeedback('MINOR', '   ')).toBeNull();
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
