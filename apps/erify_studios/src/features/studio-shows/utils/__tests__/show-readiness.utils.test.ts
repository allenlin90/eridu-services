import { describe, expect, it } from 'vitest';

import { buildShowReadinessViewModel, getWarningIssueTags, type TaskReadinessWarning } from '../show-readiness.utils';

function createWarning(overrides: Partial<TaskReadinessWarning>): TaskReadinessWarning {
  return {
    show_id: 'show-1',
    show_name: 'Show A',
    show_start: '2026-03-10T08:00:00.000Z',
    show_end: '2026-03-10T09:00:00.000Z',
    operational_day: '2026-03-10',
    show_standard: 'standard',
    has_no_tasks: false,
    unassigned_task_count: 0,
    missing_required_task_types: [],
    missing_moderation_task: false,
    ...overrides,
  };
}

describe('showReadinessUtils', () => {
  it('prioritizes no task plan over other issue types', () => {
    const warnings: TaskReadinessWarning[] = [
      createWarning({ show_id: 'show-1', has_no_tasks: true }),
      createWarning({ show_id: 'show-2', unassigned_task_count: 2 }),
      createWarning({ show_id: 'show-3', missing_required_task_types: ['SETUP'] }),
    ];

    const model = buildShowReadinessViewModel(warnings, 6);

    expect(model.primaryAction).toBe('no_task_plan');
    expect(model.showsNeedingAttentionCount).toBe(3);
    expect(model.readyShowsCount).toBe(3);
    expect(model.readyPercent).toBe(50);
  });

  it('builds grouped bucket counts and supporting stats', () => {
    const warnings: TaskReadinessWarning[] = [
      createWarning({ show_id: 'show-1', unassigned_task_count: 2 }),
      createWarning({
        show_id: 'show-2',
        missing_required_task_types: ['SETUP', 'CLOSURE'],
        show_standard: 'premium',
        missing_moderation_task: true,
      }),
    ];

    const model = buildShowReadinessViewModel(warnings, 4);
    const unassigned = model.buckets.find((bucket) => bucket.key === 'unassigned_workload');
    const missingCoverage = model.buckets.find((bucket) => bucket.key === 'missing_required_coverage');

    expect(model.primaryAction).toBe('unassigned_workload');
    expect(unassigned?.count).toBe(2);
    expect(unassigned?.supportingStats).toContain('1 affected shows');
    expect(missingCoverage?.count).toBe(1);
    expect(missingCoverage?.supportingStats).toContain('1 missing SETUP');
    expect(missingCoverage?.supportingStats).toContain('1 missing CLOSURE');
    expect(missingCoverage?.supportingStats).toContain('1 missing moderation');
  });

  it('handles no-show scopes without healthy wording', () => {
    const model = buildShowReadinessViewModel([], 0);
    expect(model.supportText).toBe('No shows found in the selected scope.');
    expect(model.readyPercent).toBe(0);
  });

  it('builds issue tags for drill-down labels', () => {
    const tags = getWarningIssueTags(
      createWarning({
        has_no_tasks: true,
        unassigned_task_count: 1,
        missing_required_task_types: ['SETUP'],
        missing_moderation_task: true,
      }),
    );

    expect(tags).toEqual([
      'No task plan',
      '1 unassigned task',
      'Missing SETUP',
      'Missing moderation',
    ]);
  });
});
