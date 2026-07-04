import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Route } from '@/routes/studios/$studioId/client-mechanics/index';

// The route's page component is intentionally not a named export (so
// TanStack Router's autoCodeSplitting wraps it in `lazyRouteComponent` and
// splits it into its own lazy chunk instead of bundling it into the app's
// eager entry) — access it via the route's own `component` option, the
// same lazy reference the real router renders, wrapped in `Suspense` below
// like the real `<Outlet>` does.
const ClientMechanicsPage = (Route as any).component;

// --- Mocks ---

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseStudioAccess = vi.fn(() => ({ role: 'admin', hasAccess: () => true }));
vi.mock('@/lib/hooks/use-studio-access', () => ({
  useStudioAccess: () => mockUseStudioAccess(),
}));

const mockNavigate = vi.fn();
const mockParams = { studioId: 'studio_123' };
const mockSearch = { client_id: 'client_abc' };

vi.mock('@tanstack/react-router', async () => {
  const React = await import('react');
  return {
    createFileRoute: () => (options: any) => ({
      ...options,
      useParams: () => mockParams,
      useSearch: () => mockSearch,
      useNavigate: () => mockNavigate,
    }),
    useParams: () => mockParams,
    useSearch: () => mockSearch,
    useNavigate: () => mockNavigate,
    getRouteApi: () => ({
      useParams: () => mockParams,
      useSearch: () => mockSearch,
      useNavigate: () => mockNavigate,
    }),
    // Real autoCodeSplitting wraps the route's component in this exact
    // helper; mirror it with `React.lazy` so the component under test
    // exercises the same lazy/Suspense path the real router uses instead
    // of a stubbed no-op that would render `undefined`.
    lazyRouteComponent: (importer: () => Promise<any>, exportName = 'default') =>
      React.lazy(async () => ({ default: (await importer())[exportName] })),
    Outlet: () => null,
  };
});

const mockClients = [
  { id: 'client_abc', name: 'Client ABC' },
  { id: 'client_xyz', name: 'Client XYZ' },
];

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { data: mockClients },
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

const mockMechanics = [
  {
    id: 'cmech_1',
    client_id: 'client_abc',
    title: 'Speaking Rule 1',
    instruction_label: 'Product Promo A',
    instruction_body: 'Talk about product A for 5 minutes.',
    status: 'active',
    version: 1,
    content_revision: 2,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cmech_2',
    client_id: 'client_abc',
    title: 'Speaking Rule 2',
    instruction_label: 'Product Promo B',
    instruction_body: 'Do not mention product B.',
    status: 'retired',
    version: 3,
    content_revision: 1,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockRefresh = vi.fn();

vi.mock('@/features/client-mechanics/hooks/use-client-mechanics', () => ({
  useClientMechanics: () => ({
    data: mockMechanics,
    isLoading: false,
    isFetching: false,
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      total: 2,
      pageCount: 1,
    },
    onPaginationChange: vi.fn(),
    columnFilters: [],
    onColumnFiltersChange: vi.fn(),
    createMutation: {
      mutateAsync: mockCreateMutate,
      isPending: false,
    },
    updateMutation: {
      mutateAsync: mockUpdateMutate,
      isPending: false,
    },
    deleteMutation: {
      mutateAsync: mockDeleteMutate,
      isPending: false,
    },
    handleRefresh: mockRefresh,
  }),
}));

async function openRowMenu(user: ReturnType<typeof userEvent.setup>, rowIndex: number) {
  const triggers = await screen.findAllByRole('button', { name: /open menu/i }, { timeout: 5000 });
  await user.click(triggers[rowIndex]);
}

describe('clientMechanicsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders client select options and page headers', async () => {
    render(<Suspense fallback={null}><ClientMechanicsPage /></Suspense>);

    expect(await screen.findByText('Client Mechanics', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Select Client')).toBeInTheDocument();
    expect(screen.getByText('Client ABC')).toBeInTheDocument();
  });

  it('renders mechanics data in table', async () => {
    render(<Suspense fallback={null}><ClientMechanicsPage /></Suspense>);

    // Table rows
    expect(await screen.findByText('Speaking Rule 1', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Speaking Rule 2')).toBeInTheDocument();
    expect(screen.getByText('Product Promo A')).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Retired')).toBeInTheDocument();

    // Check revision badges
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('opens create dialog on button click and submits new mechanic', async () => {
    const user = userEvent.setup();
    render(<Suspense fallback={null}><ClientMechanicsPage /></Suspense>);

    const createBtn = await screen.findByRole('button', { name: /create mechanic/i }, { timeout: 5000 });
    await user.click(createBtn);

    // Dialog is visible, with the active client named in the title so it
    // can't be created against the wrong client without noticing
    expect(screen.getByText('Create Client Mechanic for Client ABC')).toBeInTheDocument();

    // Enter values
    const titleInput = screen.getByLabelText(/^title/i);
    const labelInput = screen.getByLabelText(/^instruction label/i);
    const bodyInput = screen.getByLabelText(/^instruction body/i);

    await user.type(titleInput, 'New Speak Rule');
    await user.type(labelInput, 'New Promo C');
    await user.type(bodyInput, 'Do C details.');

    // Save
    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);

    expect(mockCreateMutate).toHaveBeenCalledWith({
      title: 'New Speak Rule',
      instruction_label: 'New Promo C',
      instruction_body: 'Do C details.',
    });
  });

  it('opens update dialog on edit action and submits changes', async () => {
    const user = userEvent.setup();
    render(<Suspense fallback={null}><ClientMechanicsPage /></Suspense>);

    // Edit action on row 1
    await openRowMenu(user, 0);
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));

    // Dialog is visible, with the active client named in the title
    expect(screen.getByText('Edit Client Mechanic for Client ABC')).toBeInTheDocument();

    // Prepopulated values
    const titleInput = screen.getByLabelText(/^title/i);
    expect(titleInput).toHaveValue('Speaking Rule 1');

    await user.clear(titleInput);
    await user.type(titleInput, 'Speaking Rule 1 Updated');

    // Save
    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      mechanicId: 'cmech_1',
      data: {
        title: 'Speaking Rule 1 Updated',
        instruction_label: 'Product Promo A',
        instruction_body: 'Talk about product A for 5 minutes.',
        version: 1,
      },
    });
  });

  it('opens retire dialog on archive action and confirms', async () => {
    const user = userEvent.setup();
    render(<Suspense fallback={null}><ClientMechanicsPage /></Suspense>);

    // Retire active row
    await openRowMenu(user, 0);
    await user.click(screen.getByRole('menuitem', { name: /retire/i }));

    expect(screen.getByText('Retire Client Mechanic')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to retire "Speaking Rule 1"/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Retire' });
    await user.click(confirmBtn);

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      mechanicId: 'cmech_1',
      data: {
        status: 'retired',
        version: 1,
      },
    });
  });

  it('hides the delete action for non-admin roles since the backend rejects it', async () => {
    mockUseStudioAccess.mockReturnValueOnce({ role: 'account_manager', hasAccess: () => true });
    const user = userEvent.setup();

    render(<Suspense fallback={null}><ClientMechanicsPage /></Suspense>);
    await openRowMenu(user, 0);

    expect(screen.queryByRole('menuitem', { name: /delete/i })).not.toBeInTheDocument();
    // Retire/edit/reactivate stay available — only hard-delete is ADMIN-only.
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
  });

  it('opens delete dialog on trash action and confirms', async () => {
    const user = userEvent.setup();
    render(<Suspense fallback={null}><ClientMechanicsPage /></Suspense>);

    // Delete row
    await openRowMenu(user, 0);
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));

    expect(screen.getByText('Delete Client Mechanic')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "Speaking Rule 1"/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmBtn);

    expect(mockDeleteMutate).toHaveBeenCalledWith('cmech_1');
  });

  it('calls update mutation to reactivate retired mechanic', async () => {
    const user = userEvent.setup();
    render(<Suspense fallback={null}><ClientMechanicsPage /></Suspense>);

    // Reactivate retired row (row 1 is the retired mechanic)
    await openRowMenu(user, 1);
    await user.click(screen.getByRole('menuitem', { name: /reactivate/i }));

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      mechanicId: 'cmech_2',
      data: {
        status: 'active',
        version: 3,
      },
    });
  });
});
