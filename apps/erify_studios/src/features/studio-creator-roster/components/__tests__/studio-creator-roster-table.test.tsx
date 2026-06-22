import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { StudioCreatorRosterTable } from '../studio-creator-roster-table';

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  DataTable: ({
    renderToolbar,
  }: {
    renderToolbar?: (table: unknown) => ReactNode;
  }) => <div>{renderToolbar?.({})}</div>,
  DataTablePagination: () => null,
  DataTableToolbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../add-studio-creator-dialog', () => ({
  AddStudioCreatorDialog: ({ open }: { open: boolean }) => (
    open ? <div>Add Creator Dialog</div> : null
  ),
}));

vi.mock('../../config/studio-creator-roster-columns', () => ({
  getStudioCreatorRosterColumns: () => [],
  studioCreatorRosterSearchableColumns: [],
}));

function renderTable(props: Partial<React.ComponentProps<typeof StudioCreatorRosterTable>> = {}) {
  return render(
    <StudioCreatorRosterTable
      studioId="std_1"
      creators={[]}
      isLoading={false}
      isFetching={false}
      canManageRoster
      canReviewCompensation
      pagination={{ pageIndex: 0, pageSize: 20, total: 0, pageCount: 0 }}
      onPaginationChange={vi.fn()}
      columnFilters={[]}
      onColumnFiltersChange={vi.fn()}
      onRefresh={vi.fn()}
      {...props}
    />,
  );
}

describe('studioCreatorRosterTable', () => {
  it('opens Add Creator for roster managers such as talent managers', async () => {
    const user = userEvent.setup();

    renderTable({
      canManageRoster: true,
      canReviewCompensation: false,
    });

    await user.click(screen.getByRole('button', { name: 'Add Creator' }));

    expect(screen.getByText('Add Creator Dialog')).toBeInTheDocument();
  });

  it('hides Add Creator when the role cannot manage the roster', () => {
    renderTable({
      canManageRoster: false,
      canReviewCompensation: false,
    });

    expect(screen.queryByRole('button', { name: 'Add Creator' })).not.toBeInTheDocument();
  });
});
