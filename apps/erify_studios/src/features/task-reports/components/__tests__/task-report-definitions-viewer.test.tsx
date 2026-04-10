import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TaskReportDefinitionsViewer } from '../task-report-definitions-viewer';

const mockMutateAsync = vi.fn();

vi.mock('../../hooks/use-delete-task-report-definition', () => ({
  useDeleteTaskReportDefinition: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

vi.mock('@/features/admin/components', () => ({
  DeleteConfirmDialog: () => null,
}));

describe('taskReportDefinitionsViewer', () => {
  it('invokes create and open callbacks from viewer actions', async () => {
    const user = userEvent.setup();
    const onCreateNew = vi.fn();
    const onOpenBuilder = vi.fn();

    render(
      <TaskReportDefinitionsViewer
        studioId="std_1"
        definitions={[
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
            version: 1,
            created_at: '2026-03-10T00:00:00.000Z',
            updated_at: '2026-03-10T00:00:00.000Z',
          },
        ]}
        pagination={{ pageIndex: 0, pageSize: 10, total: 1, pageCount: 1 }}
        onPaginationChange={vi.fn()}
        search={undefined}
        onSearchChange={vi.fn()}
        isLoading={false}
        isFetching={false}
        isError={false}
        onRefresh={vi.fn()}
        onCreateNew={onCreateNew}
        onOpenBuilder={onOpenBuilder}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Build New Report/i }));
    expect(onCreateNew).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Mar 1, 2026 - Mar 7, 2026')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open & Run/i }));
    expect(onOpenBuilder).toHaveBeenCalledWith('trdef_1');
  });
});
