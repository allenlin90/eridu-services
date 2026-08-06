import type { ColumnDef } from '@tanstack/react-table';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ShowPlanningReadiness } from '@eridu/api-types/shows';

import type { StudioShow } from '../../../api/get-studio-shows';
import { getStudioShowOperationsColumns } from '../columns';

// Render the router-aware badges as plain anchors so the cell can be exercised
// without a RouterProvider (the global setup keeps the real Link/useParams).
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => <a {...props}>{children}</a>,
  useParams: () => ({ studioId: 'std_test' }),
}));

type TaskSummary = StudioShow['task_summary'];

function makeShow(
  taskSummary: TaskSummary,
  hasProperTaskAssignment: boolean,
): StudioShow {
  return {
    id: 'show_1',
    studio_id: 'std_1',
    task_summary: taskSummary,
    has_proper_task_assignment: hasProperTaskAssignment,
  } as unknown as StudioShow;
}

function renderTaskStatusCell(show: StudioShow) {
  const columns = getStudioShowOperationsColumns({ onEditActuals: vi.fn() });
  const column = columns.find((col) => col.id === 'task_status') as ColumnDef<StudioShow>;
  const cell = column.cell as (ctx: { row: { original: StudioShow } }) => ReactNode;
  return render(<>{cell({ row: { original: show } })}</>);
}

describe('studio shows table — task_status cell', () => {
  it('shows "No Tasks Generated" when no tasks exist, even if assignment flag is false', () => {
    const show = makeShow({ total: 0, assigned: 0, unassigned: 0, completed: 0 }, false);

    const { container } = renderTaskStatusCell(show);

    expect(container.textContent).toContain('No Tasks Generated');
    expect(container.textContent).not.toContain('No Assignee');
  });

  it('shows "No Assignee" when tasks exist but none are properly assigned', () => {
    const show = makeShow({ total: 2, assigned: 0, unassigned: 2, completed: 0 }, false);

    const { container } = renderTaskStatusCell(show);

    expect(container.textContent).toContain('No Assignee');
    expect(container.textContent).not.toContain('No Tasks Generated');
  });

  it('shows the completed badge when every task is completed', () => {
    const show = makeShow({ total: 2, assigned: 2, unassigned: 0, completed: 2 }, true);

    const { container } = renderTaskStatusCell(show);

    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('tasks');
    expect(container.textContent).not.toContain('No Tasks Generated');
    expect(container.textContent).not.toContain('No Assignee');
  });

  it('surfaces the unassigned count when some tasks are still unassigned', () => {
    const show = makeShow({ total: 3, assigned: 2, unassigned: 1, completed: 1 }, true);

    const { container } = renderTaskStatusCell(show);

    expect(container.textContent).toContain('1 unassigned');
    expect(container.textContent).not.toContain('No Assignee');
  });
});

function renderPlanningReadinessCell(
  show: StudioShow,
  readinessByShowId?: Map<string, ShowPlanningReadiness>,
) {
  const columns = getStudioShowOperationsColumns({ onEditActuals: vi.fn(), readinessByShowId });
  const column = columns.find((col) => col.id === 'planning_readiness') as ColumnDef<StudioShow>;
  const cell = column.cell as (ctx: { row: { original: StudioShow } }) => ReactNode;
  return render(<>{cell({ row: { original: show } })}</>);
}

function makeReadiness(overrides: Partial<ShowPlanningReadiness> = {}): ShowPlanningReadiness {
  return {
    phase: 'planning_readiness',
    show_id: 'show_1',
    show_name: 'Show 1',
    conditions: [
      { key: 'room_assigned', label: 'Room assigned', status: 'met' },
      { key: 'creators_assigned', label: 'Creators assigned', status: 'not_met' },
    ],
    met_count: 1,
    total_count: 2,
    is_ready: false,
    ...overrides,
  };
}

describe('studio shows table — planning_readiness cell', () => {
  const show = makeShow({ total: 0, assigned: 0, unassigned: 0, completed: 0 }, false);

  it('renders a placeholder when no readiness result exists for the row', () => {
    const { container } = renderPlanningReadinessCell(show);

    expect(container.textContent).toContain('—');
  });

  it('renders the met/total ratio for a partially ready show', () => {
    const readinessByShowId = new Map([['show_1', makeReadiness()]]);

    const { container } = renderPlanningReadinessCell(show, readinessByShowId);

    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
    expect(container.textContent).not.toContain('—');
  });

  it('renders the full ratio for a fully ready show', () => {
    const readinessByShowId = new Map([
      ['show_1', makeReadiness({ met_count: 2, is_ready: true })],
    ]);

    const { container } = renderPlanningReadinessCell(show, readinessByShowId);

    expect(container.textContent).toContain('2 / 2');
  });
});
