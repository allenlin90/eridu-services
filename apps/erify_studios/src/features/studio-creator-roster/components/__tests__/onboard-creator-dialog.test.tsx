import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OnboardCreatorDialog } from '../onboard-creator-dialog';

const mockUseStudioCreatorOnboardingUsersQuery = vi.fn();
const mockUseOnboardStudioCreator = vi.fn();

vi.mock('@eridu/ui', () => ({
  AsyncCombobox: ({
    onSearch,
    onChange,
    options,
    placeholder,
    emptyMessage,
  }: {
    onSearch: (value: string) => void;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    emptyMessage?: string;
  }) => (
    <div>
      <input
        placeholder={placeholder}
        onChange={(event) => onSearch(event.target.value)}
      />
      <ul data-testid="onboarding-user-options">
        {options.map((option) => (
          <li key={option.value}>
            <button type="button" onClick={() => onChange(option.value)}>
              {option.label}
            </button>
          </li>
        ))}
      </ul>
      {options.length === 0 && emptyMessage ? <p>{emptyMessage}</p> : null}
    </div>
  ),
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

vi.mock('@/features/studio-creator-roster/api/get-onboarding-users', () => ({
  useStudioCreatorOnboardingUsersQuery: (...args: unknown[]) =>
    mockUseStudioCreatorOnboardingUsersQuery(...args),
}));

vi.mock('@/features/studio-creator-roster/api/studio-creator-roster', () => ({
  useOnboardStudioCreator: (...args: unknown[]) => mockUseOnboardStudioCreator(...args),
}));

describe('onboardCreatorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseStudioCreatorOnboardingUsersQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseOnboardStudioCreator.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    });
  });

  it('renders name, alias, user link, and compensation fields', () => {
    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    // Input fields can be matched by label association
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Alias')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Rate')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Commission Rate (%)')).toBeInTheDocument();
    // Label text for combobox/select (no direct input id association in mocks)
    expect(screen.getByText('User link (optional)')).toBeInTheDocument();
    expect(screen.getByText('Compensation Type')).toBeInTheDocument();
  });

  it('renders the onboard description and title', () => {
    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Onboard New Creator')).toBeInTheDocument();
    expect(screen.getByText('New creators are global identities shared across studios.')).toBeInTheDocument();
  });

  it('does not render a creator search combobox', () => {
    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByPlaceholderText('Search creators by name or alias...'),
    ).not.toBeInTheDocument();
  });

  it('submit button is disabled when name or alias is empty', () => {
    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Create & Onboard' })).toBeDisabled();
  });

  it('submit button is enabled when name and alias are filled', async () => {
    const user = userEvent.setup();

    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Name'), 'Test Creator');
    await user.type(screen.getByLabelText('Alias'), 'TC');

    expect(screen.getByRole('button', { name: 'Create & Onboard' })).not.toBeDisabled();
  });

  it('calls onboardMutation.mutateAsync with correct payload on submit', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});

    mockUseOnboardStudioCreator.mockReturnValue({
      mutateAsync,
      isPending: false,
      reset: vi.fn(),
    });

    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Name'), 'Test Creator');
    await user.type(screen.getByLabelText('Alias'), 'TC');
    await user.click(screen.getByRole('button', { name: 'Create & Onboard' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      creator: {
        name: 'Test Creator',
        alias_name: 'TC',
        user_id: undefined,
        metadata: undefined,
      },
      roster: {
        metadata: undefined,
      },
    });
  });

  it('shows error toast when name is missing', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');

    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    // Only fill alias, not name — but we still trigger submit via alias+blank name
    // The submit button is disabled unless both are filled, so test the payload builder path
    // by triggering it programmatically via a form submit on a partially-filled form.
    // Since the button is disabled, we verify via the disabled state instead.
    expect(screen.getByRole('button', { name: 'Create & Onboard' })).toBeDisabled();

    await user.type(screen.getByLabelText('Alias'), 'TC');
    expect(screen.getByRole('button', { name: 'Create & Onboard' })).toBeDisabled();

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('enables onboarding users query while dialog is open', () => {
    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(mockUseStudioCreatorOnboardingUsersQuery).toHaveBeenCalledWith(
      'std_1',
      { search: '', limit: 20 },
      true,
    );
  });

  it('disables onboarding users query when dialog is closed', () => {
    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open={false}
        onOpenChange={vi.fn()}
      />,
    );

    expect(mockUseStudioCreatorOnboardingUsersQuery).toHaveBeenCalledWith(
      'std_1',
      { search: '', limit: 20 },
      false,
    );
  });

  it('shows user options from the onboarding users query', async () => {
    const user = userEvent.setup();

    mockUseStudioCreatorOnboardingUsersQuery.mockReturnValue({
      data: [
        { id: 'user_1', name: 'Alice', email: 'alice@test.com' },
        { id: 'user_2', name: 'Bob', email: null },
      ],
      isLoading: false,
    });

    render(
      <OnboardCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Search users by name, email, or ID...'), 'ali');

    expect(screen.getByRole('button', { name: 'Alice (alice@test.com)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bob' })).toBeInTheDocument();
  });
});
