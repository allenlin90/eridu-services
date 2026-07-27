import { describe, expect, it } from 'vitest';

import { sceneQcDailySearchSchema } from '../scene-qc-daily-search-schema';

describe('sceneQcDailySearchSchema', () => {
  it('uses stable defaults, leaving date undefined (current operational day)', () => {
    expect(sceneQcDailySearchSchema.parse({})).toEqual({
      tab: 'daily',
      review_state: 'all',
      page: 1,
      limit: 20,
    });
  });

  it('keeps valid shareable filters and selection', () => {
    expect(sceneQcDailySearchSchema.parse({
      tab: 'records',
      date: '2026-07-01',
      client_id: 'client_abc123',
      platform_id: 'plt_abc123',
      review_state: 'blocked',
      search: 'foo',
      show_id: 'show_abc123',
      page: '2',
      limit: '10',
    })).toEqual({
      tab: 'records',
      date: '2026-07-01',
      client_id: 'client_abc123',
      platform_id: 'plt_abc123',
      review_state: 'blocked',
      search: 'foo',
      show_id: 'show_abc123',
      page: 2,
      limit: 10,
    });
  });

  it('drops malformed optional values instead of throwing', () => {
    expect(sceneQcDailySearchSchema.parse({
      date: '07/01/2026',
      client_id: '123',
      platform_id: '456',
      show_id: '789',
      review_state: 'not-a-state',
      tab: 'bogus',
    })).toEqual({
      tab: 'daily',
      review_state: 'all',
      page: 1,
      limit: 20,
    });
  });

  it('caps limit at 50', () => {
    expect(sceneQcDailySearchSchema.parse({ limit: '999' }).limit).toBe(20);
  });
});
