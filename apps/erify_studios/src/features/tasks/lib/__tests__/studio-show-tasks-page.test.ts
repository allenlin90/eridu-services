import { describe, expect, it } from 'vitest';

import { TASK_ACTION, type TaskWithRelationsDto } from '@eridu/api-types/task-management';

import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import type { TaskActionDraft } from '@/features/tasks/hooks/use-studio-show-tasks-page-state';
import {
  buildCurrentShowSelection,
  buildShowMetaItems,
  buildShowSubtitle,
  getTaskActionSheetKey,
} from '@/features/tasks/lib/studio-show-tasks-page';

function createTask(overrides: Partial<TaskWithRelationsDto> = {}): TaskWithRelationsDto {
  return {
    id: 'task-1',
    version: 1,
    status: 'PENDING',
    assignee: null,
    show: { name: 'Fallback Show' },
    ...overrides,
  } as unknown as TaskWithRelationsDto;
}

function createShow(overrides: Partial<StudioShowDetail> = {}): StudioShowDetail {
  return {
    id: 'show-1',
    client_name: 'Acme',
    start_time: '2026-01-02T10:00:00.000Z',
    end_time: '2026-01-02T12:00:00.000Z',
    studio_name: 'Studio A',
    studio_room_name: 'Room 1',
    show_type_name: 'Podcast',
    show_standard_name: 'HD',
    ...overrides,
  } as unknown as StudioShowDetail;
}

describe('studio-show-tasks-page helpers', () => {
  it('buildCurrentShowSelection computes summary and keeps provided show name', () => {
    const tasks = [
      createTask({ id: 'task-1', assignee: { id: 'user-1' } as unknown as TaskWithRelationsDto['assignee'] }),
      createTask({ id: 'task-2', status: 'COMPLETED' }),
      createTask({ id: 'task-3' }),
    ];

    const result = buildCurrentShowSelection('show-1', 'Main Show', tasks);

    expect(result.id).toBe('show-1');
    expect(result.name).toBe('Main Show');
    expect(result.task_summary).toEqual({
      total: 3,
      assigned: 1,
      unassigned: 2,
      completed: 1,
    });
  });

  it('buildCurrentShowSelection falls back to first task show name', () => {
    const result = buildCurrentShowSelection('show-42', undefined, [createTask({ show: { name: 'Show From Task' } as TaskWithRelationsDto['show'] })]);
    expect(result.name).toBe('Show From Task');
  });

  it('buildShowSubtitle returns default when show is missing', () => {
    expect(buildShowSubtitle(undefined)).toBe('Manage and assign specific tasks for this show.');
  });

  it('buildShowSubtitle includes client name and schedule range', () => {
    const result = buildShowSubtitle(createShow());
    expect(result).toContain('Acme');
    expect(result).toContain(' - ');
  });

  it('buildShowMetaItems maps show fields and fallback placeholders', () => {
    const result = buildShowMetaItems(createShow({
      studio_room_name: null as unknown as StudioShowDetail['studio_room_name'],
      show_standard_name: null as unknown as StudioShowDetail['show_standard_name'],
    }));

    expect(result).toEqual([
      { label: 'Show ID', value: 'show-1' },
      { label: 'Studio', value: 'Studio A' },
      { label: 'Room', value: '—' },
      { label: 'Type', value: 'Podcast' },
      { label: 'Standard', value: '—' },
    ]);
  });

  it('getTaskActionSheetKey returns stable fallback and draft-based key', () => {
    const draft: TaskActionDraft = {
      task: createTask({ id: 'task-99', version: 7 }),
      action: TASK_ACTION.SUBMIT_FOR_REVIEW,
    };

    expect(getTaskActionSheetKey(null)).toBe('studio-task-action-sheet');
    expect(getTaskActionSheetKey(draft)).toBe('task-99:7:SUBMIT_FOR_REVIEW');
  });
});
