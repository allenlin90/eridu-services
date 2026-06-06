import { describe, expect, it } from 'vitest';

import { resolvePaginationAction } from '../pagination-action';

describe('resolvePaginationAction', () => {
  it('returns a page action when only the page index changes', () => {
    expect(
      resolvePaginationAction({ page: 1, limit: 10 }, { pageIndex: 1, pageSize: 10 }),
    ).toEqual({ type: 'page', page: 2 });
  });

  it('does not reset the page when navigating to a later page (regression)', () => {
    // Bug: the table previously called both onPageChange and onLimitChange, and
    // the limit handler reset page to 1 — snapping back to page 1 on every next/prev.
    const action = resolvePaginationAction({ page: 3, limit: 10 }, { pageIndex: 4, pageSize: 10 });

    expect(action).toEqual({ type: 'page', page: 5 });
    expect(action?.type).not.toBe('limit');
  });

  it('returns a limit action when the page size changes', () => {
    expect(
      resolvePaginationAction({ page: 4, limit: 10 }, { pageIndex: 0, pageSize: 25 }),
    ).toEqual({ type: 'limit', limit: 25 });
  });

  it('prefers the limit action when both page and size change in the same update', () => {
    // The page-size <Select> resets pageIndex to 0 while changing pageSize; the
    // route's onLimitChange already resets page to 1, so a single limit action is correct.
    expect(
      resolvePaginationAction({ page: 4, limit: 10 }, { pageIndex: 0, pageSize: 50 }),
    ).toEqual({ type: 'limit', limit: 50 });
  });

  it('returns null when nothing changed', () => {
    expect(
      resolvePaginationAction({ page: 2, limit: 10 }, { pageIndex: 1, pageSize: 10 }),
    ).toBeNull();
  });
});
