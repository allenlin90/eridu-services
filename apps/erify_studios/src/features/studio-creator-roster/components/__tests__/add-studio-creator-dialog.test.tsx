import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STUDIO_CREATOR_ROSTER_STATE } from '@eridu/api-types/studio-creators';

import { AddStudioCreatorDialog } from '../add-studio-creator-dialog';

const mockUseCreatorCatalogQuery = vi.fn();
const mockUseStudioCreatorOnboardingUsersQuery = vi.fn();
const mockUseAddStudioCreatorToRoster = vi.fn();
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
  }) => {
    const testId = placeholder?.includes('users') ? 'onboarding-user-options' : 'creator-options';

    return (
      <div>
        <input
          placeholder={placeholder}
          onChange={(event) => onSearch(event.target.value)}
        />
        <ul data-testid={testId}>
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
    );
  },
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

vi.mock('@/features/studio-show-creators/api/get-creator-catalog', () => ({
  useCreatorCatalogQuery: (...args: unknown[]) => mockUseCreatorCatalogQuery(...args),
}));

vi.mock('@/features/studio-creator-roster/api/get-onboarding-users', () => ({
  useStudioCreatorOnboardingUsersQuery: (...args: unknown[]) =>
    mockUseStudioCreatorOnboardingUsersQuery(...args),
}));

vi.mock('@/features/studio-creator-roster/api/studio-creator-roster', () => ({
  useAddStudioCreatorToRoster: (...args: unknown[]) => mockUseAddStudioCreatorToRoster(...args),
  useOnboardStudioCreator: (...args: unknown[]) => mockUseOnboardStudioCreator(...args),
}));

describe('addStudioCreatorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCreatorCatalogQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseStudioCreatorOnboardingUsersQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseAddStudioCreatorToRoster.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    });

    mockUseOnboardStudioCreator.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    });
  });

  it('defaults to search mode when opened', () => {
    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Search first to reuse an existing creator identity when possible.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByText('New creators are global identities shared across studios.')).not.toBeInTheDocument();
  });

  it('shows create CTA after catalog search even when results exist', async () => {
    const user = userEvent.setup();

    mockUseCreatorCatalogQuery.mockReturnValue({
      data: [
        {
          id: 'creator_1',
          name: 'Alice',
          alias_name: 'Ali',
          roster_state: STUDIO_CREATOR_ROSTER_STATE.ACTIVE,
        },
        {
          id: 'creator_2',
          name: 'Bob',
          alias_name: 'B',
          roster_state: STUDIO_CREATOR_ROSTER_STATE.NONE,
        },
      ],
      isLoading: false,
    });

    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Search creators by name or alias...'), 'alice');

    expect(screen.getByRole('button', { name: 'Create and onboard new creator' })).toBeInTheDocument();
  });

  it('keeps active roster matches visible but outside actionable options', async () => {
    const user = userEvent.setup();

    mockUseCreatorCatalogQuery.mockReturnValue({
      data: [
        {
          id: 'creator_1',
          name: 'Alice',
          alias_name: 'Ali',
          roster_state: STUDIO_CREATOR_ROSTER_STATE.ACTIVE,
        },
        {
          id: 'creator_2',
          name: 'Bob',
          alias_name: 'B',
          roster_state: STUDIO_CREATOR_ROSTER_STATE.NONE,
        },
      ],
      isLoading: false,
    });

    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Search creators by name or alias...'), 'a');

    expect(screen.getByText('Already active in this studio')).toBeInTheDocument();
    expect(screen.getByText('Alice (Ali)')).toBeInTheDocument();

    const creatorOptions = screen.getByTestId('creator-options');
    expect(within(creatorOptions).getByText('Bob (B)')).toBeInTheDocument();
    expect(within(creatorOptions).queryByText('Alice (Ali)')).not.toBeInTheDocument();
  });

  it('enables studio onboarding-user lookup only after switching to create mode', async () => {
    const user = userEvent.setup();

    mockUseCreatorCatalogQuery.mockReturnValue({
      data: [
        {
          id: 'creator_2',
          name: 'Bob',
          alias_name: 'B',
          roster_state: STUDIO_CREATOR_ROSTER_STATE.NONE,
        },
      ],
      isLoading: false,
    });

    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(mockUseStudioCreatorOnboardingUsersQuery).toHaveBeenCalledWith(
      'std_1',
      { search: '', limit: 20 },
      false,
    );

    await user.type(screen.getByPlaceholderText('Search creators by name or alias...'), 'bob');
    await user.click(screen.getByRole('button', { name: 'Create and onboard new creator' }));

    await waitFor(() => {
      expect(mockUseStudioCreatorOnboardingUsersQuery).toHaveBeenLastCalledWith(
        'std_1',
        { search: '', limit: 20 },
        true,
      );
    });
  });
});
