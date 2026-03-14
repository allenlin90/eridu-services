import { describe, expect, it } from 'vitest';

import {
  resolveShowsLimit,
  shouldNormalizeShowsSearch,
  showsSearchSchema,
  toCanonicalShowsSearch,
} from '../shows-search-schema';

describe('showsSearchSchema', () => {
  it('parses canonical limit query params', () => {
    const parsed = showsSearchSchema.parse({
      page: '2',
      limit: '20',
      sortBy: 'start_time',
      sortOrder: 'desc',
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(20);
    expect(resolveShowsLimit(parsed)).toBe(20);
    expect(shouldNormalizeShowsSearch(parsed)).toBe(false);
  });

  it('accepts legacy pageSize and normalizes to limit', () => {
    const legacy = showsSearchSchema.parse({
      page: '3',
      pageSize: '30',
      sortBy: 'start_time',
      sortOrder: 'asc',
    });

    expect(resolveShowsLimit(legacy)).toBe(30);
    expect(shouldNormalizeShowsSearch(legacy)).toBe(true);

    expect(toCanonicalShowsSearch(legacy)).toMatchObject({
      page: 3,
      limit: 30,
      pageSize: undefined,
      sortBy: 'start_time',
      sortOrder: 'asc',
    });
  });

  it('defaults to limit=10 when neither limit nor pageSize is provided', () => {
    const parsed = showsSearchSchema.parse({});

    expect(parsed.page).toBe(1);
    expect(resolveShowsLimit(parsed)).toBe(10);
    expect(shouldNormalizeShowsSearch(parsed)).toBe(true);
    expect(toCanonicalShowsSearch(parsed)).toMatchObject({
      page: 1,
      limit: 10,
      pageSize: undefined,
    });
  });
});
