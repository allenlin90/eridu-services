import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STUDIO_ROLE, type StudioMemberResponse } from '@eridu/api-types/memberships';

import { EditMemberDialog } from '../edit-member-dialog';

const mockUseUpdateStudioMember = vi.fn();

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../../api/members', () => ({
  useUpdateStudioMember: (...args: unknown[]) => mockUseUpdateStudioMember(...args),
}));

function createMember(overrides: Partial<StudioMemberResponse> = {}): StudioMemberResponse {
  return {
    membership_id: 'smb_123',
    user_id: 'user_123',
    user_name: 'Jane Doe',
    user_email: 'jane@example.com',
    role: STUDIO_ROLE.MEMBER,
    base_hourly_rate: '25.00',
    created_at: '2026-03-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('editMemberDialog copy', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseUpdateStudioMember.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('warns that member roster rate edits do not rewrite shift snapshots', () => {
    render(
      <EditMemberDialog
        studioId="std_1"
        member={createMember()}
        isSelf={false}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        'Roster edits update the default for future shifts only. Existing shift snapshots keep their saved hourly rate; edit shift compensation to change a scheduled shift.',
      ),
    ).toBeInTheDocument();
  });
});
