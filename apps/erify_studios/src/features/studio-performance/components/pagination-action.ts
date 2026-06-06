/**
 * Decide which pagination change actually occurred. Page navigation and page-size
 * changes are mutually exclusive per interaction, so we emit at most one action.
 * Emitting both would let a page-size reset (which sends the user back to page 1)
 * clobber a page navigation, snapping the table to page 1 on every next/prev click.
 */
export function resolvePaginationAction(
  current: { page: number; limit: number },
  next: { pageIndex: number; pageSize: number },
): { type: 'limit'; limit: number } | { type: 'page'; page: number } | null {
  if (next.pageSize !== current.limit) {
    return { type: 'limit', limit: next.pageSize };
  }
  if (next.pageIndex + 1 !== current.page) {
    return { type: 'page', page: next.pageIndex + 1 };
  }
  return null;
}
