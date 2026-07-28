import { describe, expect, it } from 'vitest';

import { sceneQcSearchSchema } from '../scene-qc-search-schema';

describe('sceneQcSearchSchema', () => {
  it('composes the daily fields with the records-exclusive fields, defaulting to daily', () => {
    expect(sceneQcSearchSchema.parse({})).toEqual({
      tab: 'daily',
      review_state: 'all',
      page: 1,
      limit: 20,
    });
  });

  it('parses records-exclusive fields alongside the shared daily fields', () => {
    expect(sceneQcSearchSchema.parse({
      tab: 'records',
      client_id: 'client_abc123',
      platform_id: 'plt_abc123',
      date_from: '2026-07-01',
      date_to: '2026-07-07',
      result: 'FAIL',
      record_id: 'scqcr_abc123',
      page: '2',
      limit: '10',
    })).toEqual({
      tab: 'records',
      review_state: 'all',
      client_id: 'client_abc123',
      platform_id: 'plt_abc123',
      date_from: '2026-07-01',
      date_to: '2026-07-07',
      result: 'FAIL',
      record_id: 'scqcr_abc123',
      page: 2,
      limit: 10,
    });
  });

  it('drops malformed records-exclusive values instead of throwing', () => {
    const parsed = sceneQcSearchSchema.parse({
      date_from: '07/01/2026',
      result: 'BOGUS',
      record_id: 'show_abc123',
    });
    expect(parsed.date_from).toBeUndefined();
    expect(parsed.result).toBeUndefined();
    expect(parsed.record_id).toBeUndefined();
  });

  it('still keeps the daily-exclusive fields intact and unaffected by the records extension', () => {
    const parsed = sceneQcSearchSchema.parse({
      date: '2026-07-01',
      show_id: 'show_abc123',
      review_state: 'blocked',
      search: 'foo',
    });
    expect(parsed.date).toBe('2026-07-01');
    expect(parsed.show_id).toBe('show_abc123');
    expect(parsed.review_state).toBe('blocked');
    expect(parsed.search).toBe('foo');
  });
});
