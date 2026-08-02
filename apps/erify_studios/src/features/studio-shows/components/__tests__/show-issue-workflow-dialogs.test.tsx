import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';

import { ShowIssueEscalateDialog } from '../show-issue-escalate-dialog';
import { ShowIssueReopenDialog } from '../show-issue-reopen-dialog';
import { ShowIssueResolveDialog } from '../show-issue-resolve-dialog';

const mockResolveMutateAsync = vi.fn();
const mockReopenMutateAsync = vi.fn();
const mockEscalateMutateAsync = vi.fn();

vi.mock('@/features/studio-shows/api/resolve-show-issue', () => ({
  useResolveShowIssue: () => ({ mutateAsync: mockResolveMutateAsync, isPending: false }),
}));
vi.mock('@/features/studio-shows/api/reopen-show-issue', () => ({
  useReopenShowIssue: () => ({ mutateAsync: mockReopenMutateAsync, isPending: false }),
}));
vi.mock('@/features/studio-shows/api/escalate-show-issue', () => ({
  useEscalateShowIssue: () => ({ mutateAsync: mockEscalateMutateAsync, isPending: false }),
}));

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => <label htmlFor={htmlFor}>{children}</label>,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <select aria-label="resolution-code" value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DrawerFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => false,
}));

function makeIssue(): ShowIssueApiResponse {
  return {
    id: 'issue_1',
    show_id: 'show_1',
    show_name: 'Morning Show',
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
    version: 3,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  };
}

describe('show issue workflow dialogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolve dialog calls the resolve endpoint with version, code, and note', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ShowIssueResolveDialog issue={makeIssue()} onOpenChange={onOpenChange} studioId="stu_1" showId="show_1" />,
    );

    await user.type(screen.getByLabelText('Resolution Note'), 'Replaced the camera.');
    await user.click(screen.getByRole('button', { name: 'Resolve' }));

    expect(mockResolveMutateAsync).toHaveBeenCalledWith({
      issueId: 'issue_1',
      data: { version: 3, resolution_code: 'FIXED', resolution_note: 'Replaced the camera.' },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reopen dialog requires a reason and calls the reopen endpoint with version and reason', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ShowIssueReopenDialog issue={makeIssue()} onOpenChange={onOpenChange} studioId="stu_1" showId="show_1" />,
    );

    expect(screen.getByRole('button', { name: 'Reopen' })).toBeDisabled();

    await user.type(screen.getByLabelText('Reason'), 'Not actually fixed.');
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Reopen' }));

    expect(mockReopenMutateAsync).toHaveBeenCalledWith({
      issueId: 'issue_1',
      data: { version: 3, reason: 'Not actually fixed.' },
    });
  });

  it('escalate dialog calls the escalate endpoint with version and optional note', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ShowIssueEscalateDialog issue={makeIssue()} onOpenChange={onOpenChange} studioId="stu_1" showId="show_1" />,
    );

    await user.click(screen.getByRole('button', { name: 'Escalate' }));

    expect(mockEscalateMutateAsync).toHaveBeenCalledWith({
      issueId: 'issue_1',
      data: { version: 3, escalation_note: undefined },
    });
  });
});
