import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE_OPTIONS } from '@eridu/ui';

import { SHOW_ISSUES_DEFAULT_PAGE_SIZE, showIssuesSearchSchema } from '../show-issue-search-schema';

describe('showIssuesSearchSchema', () => {
  it('defaults limit to a page size DataTablePagination actually renders', () => {
    expect(DEFAULT_PAGE_SIZE_OPTIONS).toContain(SHOW_ISSUES_DEFAULT_PAGE_SIZE);
  });

  it('falls back to the shared default when limit is omitted', () => {
    const result = showIssuesSearchSchema.parse({});
    expect(result.limit).toBe(SHOW_ISSUES_DEFAULT_PAGE_SIZE);
    expect(DEFAULT_PAGE_SIZE_OPTIONS).toContain(result.limit);
  });

  it('falls back to the shared default when limit is invalid', () => {
    const result = showIssuesSearchSchema.parse({ limit: 'not-a-number' });
    expect(result.limit).toBe(SHOW_ISSUES_DEFAULT_PAGE_SIZE);
  });
});
