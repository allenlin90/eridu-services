import { describe, expect, it } from 'vitest';

import { showRunReviewSearchSchema } from '../show-run-review-search-schema';

describe('showRunReviewSearchSchema', () => {
  it('accepts a valid issues_severity value', () => {
    const result = showRunReviewSearchSchema.parse({ issues_severity: 'HIGH' });
    expect(result.issues_severity).toBe('HIGH');
  });

  it('falls back to undefined for an invalid issues_severity value (hand-edited or shared URL)', () => {
    const result = showRunReviewSearchSchema.parse({ issues_severity: 'URGENT' });
    expect(result.issues_severity).toBeUndefined();
  });

  it('leaves issues_severity undefined when omitted', () => {
    const result = showRunReviewSearchSchema.parse({});
    expect(result.issues_severity).toBeUndefined();
  });
});
