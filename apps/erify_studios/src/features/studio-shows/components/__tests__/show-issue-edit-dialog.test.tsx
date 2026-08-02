import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';

import { ShowIssueEditDialog } from '../show-issue-edit-dialog';

const mockMutateAsync = vi.fn();
const mockUseStudioMembers = vi.fn();

vi.mock('@/features/studio-shows/api/update-show-issue', () => ({
  useUpdateShowIssue: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

vi.mock('@/features/studio-members/api/members', () => ({
  useStudioMembers: (...args: unknown[]) => mockUseStudioMembers(...args),
}));

// Keep AsyncCombobox/Popover/Command/Select real so the owner field's
// rendered label is genuinely asserted, not mocked away — only the
// Dialog/Drawer shell needs stubbing (matches show-issue-create-dialog.test.tsx).
vi.mock('@eridu/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@eridu/ui')>();
  return {
    ...actual,
    Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
    DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    Drawer: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
    DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
    DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    DrawerFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});

vi.mock('@eridu/ui/hooks/use-is-mobile', () => ({
  useIsMobile: () => false,
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
    owner: { uid: 'user_offpage', name: 'Off-page Owner' },
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
    ...overrides,
  };
}

describe('showIssueEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Member search never returns the currently-assigned owner — simulates
    // the owner sitting outside the first 20-member search page.
    mockUseStudioMembers.mockReturnValue({
      data: { data: [{ user_id: 'user_other', user_name: 'Someone Else', user_email: 'else@example.com' }] },
      isLoading: false,
    });
  });

  it('shows the assigned owner name when reopening an edit form, even though they are outside the member search page', () => {
    const issue = makeIssue();

    render(
      <ShowIssueEditDialog issue={issue} onOpenChange={vi.fn()} studioId="stu_1" showId="show_1" mode="full" />,
    );

    // The owner AsyncCombobox has role="combobox", which per the accname
    // spec does not take its name from content (unlike the Category/Severity
    // Selects, whose names resolve via their `<label for>` association) — so
    // this asserts on the rendered text directly rather than an accessible
    // name query.
    expect(screen.getByText('Off-page Owner')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned — search studio members...')).not.toBeInTheDocument();
  });
});
