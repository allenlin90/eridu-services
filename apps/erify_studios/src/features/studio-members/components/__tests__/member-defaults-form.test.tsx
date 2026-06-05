import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STUDIO_ROLE, type StudioMemberResponse } from '@eridu/api-types/memberships';

import { MemberDefaultsForm } from '../member-defaults-form';

const mockUseUpdateStudioMember = vi.fn();

vi.mock('@eridu/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={props.type ?? 'button'} {...props}>{children}</button>
  ),
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

describe('memberDefaultsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseUpdateStudioMember.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('warns that member roster edits do not rewrite shift snapshots', () => {
    render(<MemberDefaultsForm studioId="std_1" member={createMember()} isSelf={false} canEdit />);

    expect(
      screen.getByText(
        'Roster edits update the default for future shifts only. Existing shift snapshots keep their saved hourly rate; edit shift compensation to change a scheduled shift.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the Save action for editors', () => {
    render(<MemberDefaultsForm studioId="std_1" member={createMember()} isSelf={false} canEdit />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders read-only without a Save action for non-editors', () => {
    render(<MemberDefaultsForm studioId="std_1" member={createMember()} isSelf={false} canEdit={false} />);

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByText('You have read-only access to member defaults.')).toBeInTheDocument();
  });
});
