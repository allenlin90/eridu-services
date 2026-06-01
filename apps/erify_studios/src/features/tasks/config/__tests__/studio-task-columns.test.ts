import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';

import {
  getBulkApprovalBlockers,
  getTaskIssues,
  getTaskPhase,
} from '@/features/tasks/config/studio-task-columns';

const NOW = new Date('2026-05-28T12:00:00Z');
const PAST = '2026-05-20T00:00:00Z';
const FUTURE = '2026-06-10T00:00:00Z';

function createTask(overrides: Partial<TaskWithRelationsDto> = {}): TaskWithRelationsDto {
  return {
    id: 'task-1',
    status: 'PENDING',
    assignee: { id: 'user-1' },
    due_date: null,
    type: 'SETUP',
    ...overrides,
  } as unknown as TaskWithRelationsDto;
}

describe('getTaskIssues', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns no issues for COMPLETED tasks even when unassigned and overdue', () => {
    const task = createTask({ status: 'COMPLETED', assignee: null, due_date: PAST });
    expect(getTaskIssues(task)).toEqual([]);
  });

  it('returns no issues for CLOSED tasks even when unassigned and overdue', () => {
    const task = createTask({ status: 'CLOSED', assignee: null, due_date: PAST });
    expect(getTaskIssues(task)).toEqual([]);
  });

  it('never flags an overdue REVIEW task as Overdue (operator submitted on time)', () => {
    const task = createTask({ status: 'REVIEW', due_date: PAST });
    expect(getTaskIssues(task)).toEqual([]);
  });

  it('flags an unassigned REVIEW task as Unassigned only', () => {
    const task = createTask({ status: 'REVIEW', assignee: null, due_date: PAST });
    expect(getTaskIssues(task)).toEqual(['Unassigned']);
  });

  it('flags an unsubmitted overdue task as Overdue + Pending Submission', () => {
    const task = createTask({ status: 'PENDING', due_date: PAST });
    expect(getTaskIssues(task)).toEqual(['Overdue', 'Pending Submission']);
  });

  it('combines Unassigned with overdue submission issues', () => {
    const task = createTask({ status: 'IN_PROGRESS', assignee: null, due_date: PAST });
    expect(getTaskIssues(task)).toEqual(['Unassigned', 'Overdue', 'Pending Submission']);
  });

  it('does not flag an unsubmitted task that is not yet overdue', () => {
    const task = createTask({ status: 'BLOCKED', due_date: FUTURE });
    expect(getTaskIssues(task)).toEqual([]);
  });

  it('does not flag an unsubmitted task with no due date', () => {
    const task = createTask({ status: 'IN_PROGRESS', due_date: null });
    expect(getTaskIssues(task)).toEqual([]);
  });

  it('flags Binding Drift for a REVIEW task whose snapshot is behind the template', () => {
    const task = createTask({
      status: 'REVIEW',
      has_binding_drift: true,
      template: { id: 'tpl-1', name: 'T' },
      snapshot: { schema: { items: [{ id: 'f1', system_fact_key: 'show_actual_start_time' }] }, version: 1 },
      content: { f1: '2026-05-20T00:00:00Z' },
    });
    expect(getTaskIssues(task)).toEqual(['Binding Drift']);
  });

  it('flags No Fact Bindings for a REVIEW task whose snapshot has no bound fields', () => {
    const task = createTask({
      status: 'REVIEW',
      template: { id: 'tpl-1', name: 'T' },
      snapshot: { schema: { items: [{ id: 'f1', label: 'Field 1' }] }, version: 1 },
      content: { f1: 'value' },
    });
    expect(getTaskIssues(task)).toEqual(['No Fact Bindings']);
  });

  it('does not infer No Fact Bindings when the list payload omits snapshot schema', () => {
    const task = createTask({
      status: 'REVIEW',
      template: { id: 'tpl-1', name: 'T' },
      snapshot: { version: 1 } as TaskWithRelationsDto['snapshot'],
      content: { f1: 'value' },
    });
    expect(getTaskIssues(task)).toEqual([]);
  });

  it('flags Zero Facts for a REVIEW task with bindings but no values', () => {
    const task = createTask({
      status: 'REVIEW',
      template: { id: 'tpl-1', name: 'T' },
      snapshot: { schema: { items: [{ id: 'f1', system_fact_key: 'show_actual_start_time' }] }, version: 1 },
      content: {},
    });
    expect(getTaskIssues(task)).toEqual(['Zero Facts']);
  });

  it('flags no extraction issues for a REVIEW task with bindings and values', () => {
    const task = createTask({
      status: 'REVIEW',
      template: { id: 'tpl-1', name: 'T' },
      snapshot: { schema: { items: [{ id: 'f1', system_fact_key: 'show_actual_start_time' }] }, version: 1 },
      content: { f1: '2026-05-20T00:00:00Z' },
    });
    expect(getTaskIssues(task)).toEqual([]);
  });

  it('does not run extraction checks for non-REVIEW tasks', () => {
    const task = createTask({
      status: 'IN_PROGRESS',
      due_date: FUTURE,
      template: { id: 'tpl-1', name: 'T' },
      snapshot: { schema: { items: [] }, version: 1 },
      content: {},
    });
    expect(getTaskIssues(task)).toEqual([]);
  });
});

describe('getBulkApprovalBlockers', () => {
  it('does not block bulk approval for advisory extraction warnings', () => {
    const task = createTask({
      status: 'REVIEW',
      has_binding_drift: true,
      template: { id: 'tpl-1', name: 'T' },
      snapshot: { schema: { items: [{ id: 'f1', label: 'Field 1' }] }, version: 1 },
      content: { f1: 'value' },
    });

    expect(getTaskIssues(task)).toEqual(['Binding Drift', 'No Fact Bindings']);
    expect(getBulkApprovalBlockers(task)).toEqual([]);
  });

  it('blocks bulk approval when a review task is unassigned', () => {
    const task = createTask({ status: 'REVIEW', assignee: null });

    expect(getBulkApprovalBlockers(task)).toEqual(['Unassigned']);
  });
});

describe('getTaskPhase', () => {
  it('maps SETUP to pre-production', () => {
    expect(getTaskPhase('SETUP')).toBe('pre-production');
  });

  it('maps CLOSURE to post-production', () => {
    expect(getTaskPhase('CLOSURE')).toBe('post-production');
  });

  it('maps everything else to on-air', () => {
    expect(getTaskPhase('ROUTINE')).toBe('on-air');
  });
});
