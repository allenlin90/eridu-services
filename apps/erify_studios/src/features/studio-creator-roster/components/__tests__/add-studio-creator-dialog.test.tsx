import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STUDIO_CREATOR_ROSTER_STATE } from '@eridu/api-types/studio-creators';

import { AddStudioCreatorDialog } from '../add-studio-creator-dialog';

const mockUseCreatorCatalogQuery = vi.fn();
const mockUseAddStudioCreatorToRoster = vi.fn();
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
      <ul data-testid="creator-options">
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

vi.mock('@/components/responsive-dialog', () => ({
  ResponsiveDialog: ({
    open,
    title,
    description,
    children,
    footer,
  }: {
    open: boolean;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
  }) => (open
    ? (
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
          {children}
          {footer ? <div>{footer}</div> : null}
        </div>
      )
    : null),
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

vi.mock('@/features/studio-creator-roster/api/studio-creator-roster', () => ({
  useAddStudioCreatorToRoster: (...args: unknown[]) => mockUseAddStudioCreatorToRoster(...args),
  useOnboardStudioCreator: (...args: unknown[]) => mockUseOnboardStudioCreator(...args),
}));

vi.mock('@/features/studio-creator-roster/api/get-onboarding-users', () => ({
  useStudioCreatorOnboardingUsersQuery: (...args: unknown[]) =>
    mockUseStudioCreatorOnboardingUsersQuery(...args),
}));

describe('addStudioCreatorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCreatorCatalogQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseAddStudioCreatorToRoster.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    });

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

  it('renders the search description on open', () => {
    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Search first to reuse an existing creator identity when possible.')).toBeInTheDocument();
  });

  it('queries the catalog with active rostered creators excluded', () => {
    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(mockUseCreatorCatalogQuery).toHaveBeenCalledWith(
      'std_1',
      expect.objectContaining({
        include_rostered: true,
        exclude_active_rostered: true,
      }),
      true,
    );
  });

  it('does not render creator name or alias fields', () => {
    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Alias')).not.toBeInTheDocument();
  });

  it('does not render create CTA before catalog search', () => {
    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Create new creator and add to this studio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to search' })).not.toBeInTheDocument();
  });

  it('renders create CTA after catalog search', async () => {
    const user = userEvent.setup();

    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Search creators by name or alias...'), 'new creator');

    expect(screen.getByRole('button', { name: 'Create new creator and add to this studio' })).toBeInTheDocument();
  });

  it('switches to create mode from catalog search and preserves the searched name', async () => {
    const user = userEvent.setup();

    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Search creators by name or alias...'), 'New Creator');
    await user.click(screen.getByRole('button', { name: 'Create new creator and add to this studio' }));

    expect(screen.getByLabelText('Name')).toHaveValue('New Creator');
    expect(screen.getByText('Create a global creator identity and add it to this studio roster.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to search' })).toBeInTheDocument();
  });

  it('filters active roster matches out of add creator results', async () => {
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

    expect(screen.queryByText('Already active in this studio')).not.toBeInTheDocument();
    expect(screen.queryByText('Alice (Ali)')).not.toBeInTheDocument();

    const creatorOptions = screen.getByTestId('creator-options');
    expect(within(creatorOptions).getByText('Add existing creator: Bob (B)')).toBeInTheDocument();
    expect(within(creatorOptions).queryByText('Alice (Ali)')).not.toBeInTheDocument();
  });

  it('shows reactivation hint when an inactive creator is selected', async () => {
    const user = userEvent.setup();

    mockUseCreatorCatalogQuery.mockReturnValue({
      data: [
        {
          id: 'creator_3',
          name: 'Carol',
          alias_name: null,
          roster_state: STUDIO_CREATOR_ROSTER_STATE.INACTIVE,
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

    await user.type(screen.getByPlaceholderText('Search creators by name or alias...'), 'carol');
    await user.click(screen.getByRole('button', { name: 'Reactivate inactive creator: Carol' }));

    expect(
      screen.getByText('This creator already has an inactive studio roster row and will be reactivated.'),
    ).toBeInTheDocument();
  });

  it('calls addMutation.mutateAsync with correct payload on submit', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});

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

    mockUseAddStudioCreatorToRoster.mockReturnValue({
      mutateAsync,
      isPending: false,
      reset: vi.fn(),
    });

    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Search creators by name or alias...'), 'bob');
    await user.click(screen.getByRole('button', { name: 'Add existing creator: Bob (B)' }));
    await user.click(screen.getByRole('button', { name: 'Add selected creator to roster' }));

    expect(mutateAsync).toHaveBeenCalledWith({ creator_id: 'creator_2' });
  });

  it('calls onboardMutation.mutateAsync from create mode', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({});

    mockUseOnboardStudioCreator.mockReturnValue({
      mutateAsync,
      isPending: false,
      reset: vi.fn(),
    });

    render(
      <AddStudioCreatorDialog
        studioId="std_1"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Search creators by name or alias...'), 'Test Creator');
    await user.click(screen.getByRole('button', { name: 'Create new creator and add to this studio' }));
    await user.type(screen.getByLabelText('Alias'), 'TC');
    await user.click(screen.getByRole('button', { name: 'Create creator and add to studio' }));

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
});
