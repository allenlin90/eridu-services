import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';

import { ShowIssueActionsCell } from '../show-issue-actions-cell';

vi.mock('@eridu/ui', () => ({
  DataTableActions: ({
    onEdit,
    renderExtraActions,
  }: {
    onEdit?: () => void;
    renderExtraActions?: () => ReactNode;
  }) => (
    <div>
      {onEdit && <button type="button" onClick={onEdit}>Edit</button>}
      {renderExtraActions?.()}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

vi.mock('../show-issue-edit-dialog', () => ({
  ShowIssueEditDialog: ({ issue, mode }: { issue: ShowIssueApiResponse | null; mode: string }) =>
    (issue ? <div>{`Edit Dialog (${mode})`}</div> : null),
}));

vi.mock('../show-issue-resolve-dialog', () => ({
  ShowIssueResolveDialog: ({ issue }: { issue: ShowIssueApiResponse | null }) =>
    (issue ? <div>Resolve Dialog</div> : null),
}));

vi.mock('../show-issue-reopen-dialog', () => ({
  ShowIssueReopenDialog: ({ issue }: { issue: ShowIssueApiResponse | null }) =>
    (issue ? <div>Reopen Dialog</div> : null),
}));

vi.mock('../show-issue-escalate-dialog', () => ({
  ShowIssueEscalateDialog: ({ issue }: { issue: ShowIssueApiResponse | null }) =>
    (issue ? <div>Escalate Dialog</div> : null),
}));

function makeIssue(overrides: Partial<ShowIssueApiResponse> = {}): ShowIssueApiResponse {
  return {
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
    ...overrides,
  };
}

describe('showIssueActionsCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows full edit, resolve, and escalate for Admin/Manager on an open issue', async () => {
    const user = userEvent.setup();
    render(
      <ShowIssueActionsCell
        studioId="stu_1"
        showId="show_1"
        issue={makeIssue()}
        currentUserUid="user_admin"
        canManageIssues
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Edit Dialog (full)')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument();
  });

  it('shows Reopen only for Admin/Manager on a resolved issue', () => {
    render(
      <ShowIssueActionsCell
        studioId="stu_1"
        showId="show_1"
        issue={makeIssue({ status: 'RESOLVED' })}
        currentUserUid="user_admin"
        canManageIssues
      />,
    );

    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Escalate' })).not.toBeInTheDocument();
  });

  it('lets the assigned member start and resolve their own open issue, but nothing else', async () => {
    const user = userEvent.setup();
    render(
      <ShowIssueActionsCell
        studioId="stu_1"
        showId="show_1"
        issue={makeIssue({ owner: { uid: 'user_member', name: 'Member' } })}
        currentUserUid="user_member"
        canManageIssues={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Edit Dialog (start-only)')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Escalate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument();
  });

  it('renders no actions for a non-privileged member who does not own the issue', () => {
    const { container } = render(
      <ShowIssueActionsCell
        studioId="stu_1"
        showId="show_1"
        issue={makeIssue({ owner: { uid: 'user_other', name: 'Other' } })}
        currentUserUid="user_member"
        canManageIssues={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
