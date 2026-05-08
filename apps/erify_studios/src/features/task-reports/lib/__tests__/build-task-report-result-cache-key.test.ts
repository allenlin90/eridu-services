import { describe, expect, it } from 'vitest';

import type { TaskReportSelectedColumn } from '@eridu/api-types/task-management';

import { buildTaskReportResultCacheKey } from '../build-task-report-result-cache-key';

const baseColumn: TaskReportSelectedColumn = {
  key: 'fld_question_one',
  label: 'Question one',
  type: 'select',
};

describe('buildTaskReportResultCacheKey', () => {
  it('produces a different key when include_extra changes on a column', () => {
    const without = buildTaskReportResultCacheKey({
      definitionId: null,
      scope: null,
      columns: [baseColumn],
    });

    const withExtra = buildTaskReportResultCacheKey({
      definitionId: null,
      scope: null,
      columns: [{ ...baseColumn, include_extra: true }],
    });

    expect(without).not.toEqual(withExtra);
  });

  it('treats include_extra: false the same as omitted', () => {
    const omitted = buildTaskReportResultCacheKey({
      definitionId: null,
      scope: null,
      columns: [baseColumn],
    });

    const explicitlyFalse = buildTaskReportResultCacheKey({
      definitionId: null,
      scope: null,
      columns: [{ ...baseColumn, include_extra: false }],
    });

    expect(omitted).toEqual(explicitlyFalse);
  });
});
