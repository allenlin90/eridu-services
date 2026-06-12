import type { ListMyTasksQueryTransformed } from '@eridu/api-types/task-management';

import { buildReviewStatsTabCriteria, type ReviewStatsTab } from './task-list-query';

/**
 * Direct characterization of the review-stats tab criteria builder extracted
 * from TaskRepository.findTaskReviewStats (WI-23). Pins the per-tab where shape
 * the repository counts against, so the extraction is provably behavior-
 * preserving and a future change to the tab matrix fails loudly here.
 */
describe('buildReviewStatsTabCriteria', () => {
  const baseQuery = {
    page: 1,
    limit: 10,
    sort: 'due_date:asc',
    due_date_from: '2026-05-12T00:00:00.000Z',
    due_date_to: '2026-05-13T00:00:00.000Z',
  } as unknown as ListMyTasksQueryTransformed;

  const ALL_TABS: ReviewStatsTab[] = [
    'total',
    'ready',
    'attention',
    'done',
    'preProdAttentionCount',
    'preProdReadyCount',
    'preProdDoneCount',
    'onAirAttentionCount',
    'onAirReadyCount',
    'onAirDoneCount',
    'postProdAttentionCount',
    'postProdReadyCount',
    'postProdDoneCount',
  ];

  function andClauses(where: { AND?: unknown }): any[] {
    return Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  }

  it('returns exactly one where-criteria per review-stats tab', () => {
    const criteria = buildReviewStatsTabCriteria(baseQuery);
    expect(Object.keys(criteria).sort()).toEqual([...ALL_TABS].sort());
  });

  it('scopes every tab by "dated-in-range OR undated-show-in-range"', () => {
    const criteria = buildReviewStatsTabCriteria(baseQuery);
    for (const where of Object.values(criteria)) {
      const scope = andClauses(where).find(
        (c) => Array.isArray(c?.OR) && c.OR.some((b: any) => b?.dueDate === null),
      );
      expect(scope).toBeDefined();
      expect(scope.OR).toContainEqual(
        expect.objectContaining({ dueDate: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }) }),
      );
      expect(scope.OR).toContainEqual(
        expect.objectContaining({
          dueDate: null,
          targets: expect.objectContaining({
            some: expect.objectContaining({ show: expect.objectContaining({ startTime: expect.anything() }) }),
          }),
        }),
      );
    }
  });

  it('ready tabs require REVIEW status with an assignee', () => {
    const c = buildReviewStatsTabCriteria(baseQuery);
    for (const key of ['ready', 'preProdReadyCount', 'onAirReadyCount', 'postProdReadyCount'] as ReviewStatsTab[]) {
      expect(c[key]).toMatchObject({ status: 'REVIEW', assigneeId: { not: null } });
    }
  });

  it('done tabs match terminal statuses', () => {
    const c = buildReviewStatsTabCriteria(baseQuery);
    for (const key of ['done', 'preProdDoneCount', 'onAirDoneCount', 'postProdDoneCount'] as ReviewStatsTab[]) {
      expect(c[key]).toMatchObject({ status: { in: ['COMPLETED', 'CLOSED'] } });
    }
  });

  it('attention tabs are not-terminal AND (unassigned OR overdue-not-in-review)', () => {
    const c = buildReviewStatsTabCriteria(baseQuery);
    for (const key of ['attention', 'preProdAttentionCount', 'onAirAttentionCount', 'postProdAttentionCount'] as ReviewStatsTab[]) {
      expect(c[key]).toMatchObject({ status: { notIn: ['COMPLETED', 'CLOSED'] } });
      const attentionClause = andClauses(c[key]).find(
        (x) => Array.isArray(x?.OR) && x.OR.some((b: any) => b?.assigneeId === null),
      );
      expect(attentionClause).toBeDefined();
      expect(attentionClause.OR).toContainEqual(
        expect.objectContaining({ AND: [{ status: { not: 'REVIEW' } }, { dueDate: { lt: expect.any(Date) } }] }),
      );
    }
  });

  it('maps each phase tab to its task type(s)', () => {
    const c = buildReviewStatsTabCriteria(baseQuery);
    expect(c.preProdReadyCount).toMatchObject({ type: 'SETUP' });
    expect(c.postProdReadyCount).toMatchObject({ type: 'CLOSURE' });
    expect(c.onAirReadyCount).toMatchObject({ type: { in: ['ACTIVE', 'ADMIN', 'ROUTINE', 'OTHER'] } });
    // `total` carries no phase type filter.
    expect(c.total.type).toBeUndefined();
  });

  it('omits the date-scope when no due-date range is provided', () => {
    const c = buildReviewStatsTabCriteria({ page: 1, limit: 10, sort: 'due_date:asc' } as unknown as ListMyTasksQueryTransformed);
    const scope = andClauses(c.total).find(
      (x) => Array.isArray(x?.OR) && x.OR.some((b: any) => b?.dueDate === null),
    );
    expect(scope).toBeUndefined();
  });
});
