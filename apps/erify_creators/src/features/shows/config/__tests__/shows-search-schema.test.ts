import { describe, expect, it } from 'vitest';

import {
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
    expect(shouldNormalizeShowsSearch(parsed)).toBe(false);
  });

  it('defaults to limit=10 when limit is not provided', () => {
    const parsed = showsSearchSchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBeUndefined();
    expect(shouldNormalizeShowsSearch(parsed)).toBe(true);
    expect(toCanonicalShowsSearch(parsed)).toMatchObject({
      page: 1,
      limit: 10,
    });
  });

  it('normalizes missing limit to default via toCanonicalShowsSearch', () => {
    const parsed = showsSearchSchema.parse({ page: '3' });

    expect(shouldNormalizeShowsSearch(parsed)).toBe(true);
    expect(toCanonicalShowsSearch(parsed)).toMatchObject({
      page: 3,
      limit: 10,
    });
  });

  it('does not normalize when limit is already present', () => {
    const parsed = showsSearchSchema.parse({ page: '2', limit: '50' });

    expect(shouldNormalizeShowsSearch(parsed)).toBe(false);
    expect(toCanonicalShowsSearch(parsed)).toMatchObject({
      page: 2,
      limit: 50,
    });
  });
});
