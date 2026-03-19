import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TaskReportDefinitionsViewer } from '../task-report-definitions-viewer';

const mockRefetch = vi.fn();
const mockMutateAsync = vi.fn();
const mockUseTaskReportDefinitions = vi.fn();

vi.mock('../../hooks/use-task-report-definitions', () => ({
  useTaskReportDefinitions: (args: unknown) => mockUseTaskReportDefinitions(args),
}));

vi.mock('../../hooks/use-delete-task-report-definition', () => ({
  useDeleteTaskReportDefinition: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

describe('taskReportDefinitionsViewer', () => {
  it('invokes create and open callbacks from viewer actions', async () => {
    const user = userEvent.setup();
    const onCreateNew = vi.fn();
    const onOpenBuilder = vi.fn();

    mockUseTaskReportDefinitions.mockReturnValue({
      data: {
        data: [
          {
            id: 'trdef_1',
            name: 'Weekly Summary',
            description: 'Weekly report',
            definition: {
              scope: {
                date_from: '2026-03-01',
                date_to: '2026-03-07',
                submitted_statuses: ['REVIEW', 'COMPLETED', 'CLOSED'],
              },
              columns: [{ key: 'gmv', label: 'GMV', type: 'number' }],
            },
            created_at: '2026-03-10T00:00:00.000Z',
            updated_at: '2026-03-10T00:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(
      <TaskReportDefinitionsViewer
        studioId="std_1"
        page={1}
        limit={10}
        search={undefined}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onCreateNew={onCreateNew}
        onOpenBuilder={onOpenBuilder}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Build New Report/i }));
    expect(onCreateNew).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Open Builder/i }));
    expect(onOpenBuilder).toHaveBeenCalledWith('trdef_1');
  });
});
