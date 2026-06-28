import { describe, expect, it } from 'vitest';

import { mayHaveCancellationHistory } from '../dashboard-show-cancellation';

describe('dashboard show sections', () => {
  it('fetches cancellation history for completed shows', () => {
    expect(mayHaveCancellationHistory('COMPLETED')).toBe(true);
  });

  it('does not fetch cancellation history for ordinary active statuses', () => {
    expect(mayHaveCancellationHistory('CONFIRMED')).toBe(false);
    expect(mayHaveCancellationHistory(null)).toBe(false);
  });
});
