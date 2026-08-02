import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';

import { ShowIssuesTable } from '../show-issues-table';

const mockUseStudioMembers = vi.fn();

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  DataTable: ({
    data,
    renderToolbar,
  }: {
    data: ShowIssueApiResponse[];
    renderToolbar?: (table: unknown) => ReactNode;
  }) => (
    <div>
      {renderToolbar?.({})}
      <ul>
        {data.map((issue) => <li key={issue.id}>{issue.title}</li>)}
      </ul>
    </div>
  ),
  DataTablePagination: () => null,
  DataTableToolbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../show-issue-create-dialog', () => ({
  ShowIssueCreateDialog: ({ open }: { open: boolean }) => (open ? <div>Create Issue Dialog</div> : null),
}));

vi.mock('../../config/show-issue-columns', () => ({
  getShowIssueColumns: () => [],
  showIssueStaticSearchableColumns: [],
}));

vi.mock('@/features/studio-members/api/members', () => ({
  useStudioMembers: (...args: unknown[]) => mockUseStudioMembers(...args),
}));

function renderTable(props: Partial<React.ComponentProps<typeof ShowIssuesTable>> = {}) {
  const issue: ShowIssueApiResponse = {
    id: 'issue_1',
    show_id: 'show_1',
    category: 'EQUIPMENT',
    origin: 'MANUAL',
    severity: 'HIGH',
    status: 'OPEN',
    title: 'Camera not working',
    evidence: null,
    owner: null,
    due_at: null,
    created_by: null,
    escalation_level: 0,
    escalated_at: null,
    escalated_by: null,
    escalation_note: null,
    resolved_at: null,
    resolved_by: null,
    resolution_code: null,
    resolution_note: null,
    show_creator_id: null,
    show_platform_violation_id: null,
    version: 1,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  };

  return render(
    <ShowIssuesTable
      studioId="stu_1"
      showId="show_1"
      issues={[issue]}
      isLoading={false}
      isFetching={false}
      canManageIssues
      currentUserUid="user_1"
      pagination={{ pageIndex: 0, pageSize: 25, total: 1, pageCount: 1 }}
      onPaginationChange={vi.fn()}
      columnFilters={[]}
      onColumnFiltersChange={vi.fn()}
      onRefresh={vi.fn()}
      {...props}
    />,
  );
}

describe('showIssuesTable', () => {
  beforeEach(() => {
    mockUseStudioMembers.mockReturnValue({ data: { data: [] }, isLoading: false });
  });

  it('renders issues from the server response', () => {
    renderTable();

    expect(screen.getByText('Camera not working')).toBeInTheDocument();
  });

  it('opens the create dialog for Admin/Manager', async () => {
    const user = userEvent.setup();
    renderTable({ canManageIssues: true });

    await user.click(screen.getByRole('button', { name: /report issue/i }));

    expect(screen.getByText('Create Issue Dialog')).toBeInTheDocument();
  });

  it('hides Report Issue for non-privileged members', () => {
    renderTable({ canManageIssues: false });

    expect(screen.queryByRole('button', { name: /report issue/i })).not.toBeInTheDocument();
  });
});
