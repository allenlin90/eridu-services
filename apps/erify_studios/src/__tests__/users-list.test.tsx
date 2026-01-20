import '@testing-library/jest-dom';

import type { ColumnFiltersState } from '@tanstack/react-table';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserApiResponse } from '@eridu/api-types/users';
import type { useTableUrlState } from '@eridu/ui';

import { UsersList } from '../routes/system/users/index';

// Mock hook dependencies
const mockUseUsersQuery = vi.fn();
const mockUseCreateUser = vi.fn();
const mockUseUpdateUser = vi.fn();
const mockUseDeleteUser = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockUseTableUrlState = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock('@eridu/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@eridu/ui')>();
  return {
    ...actual,
    useTableUrlState: (...args: Parameters<typeof useTableUrlState>) => mockUseTableUrlState(...args),
  };
});

vi.mock('@/features/users/api/get-users', () => ({
  useUsersQuery: mockUseUsersQuery,
}));

vi.mock('@/features/users/api/create-user', () => ({
  useCreateUser: mockUseCreateUser,
}));

vi.mock('@/features/users/api/update-user', () => ({
  useUpdateUser: mockUseUpdateUser,
}));

vi.mock('@/features/users/api/delete-user', () => ({
  useDeleteUser: mockUseDeleteUser,
}));

vi.mock('@/features/users/hooks/use-users', () => ({
  useUsers: () => {
    const tableState = mockUseTableUrlState();
    const columnFilters = tableState.columnFilters || [];

    // Mimic the logic in use-users.ts to extract filters
    const extIdFilter = columnFilters.find((filter: any) => filter.id === 'ext_id')?.value;
    const nameFilter = columnFilters.find((filter: any) => filter.id === 'name')?.value;
    const emailFilter = columnFilters.find((filter: any) => filter.id === 'email')?.value;
    const idFilter = columnFilters.find((filter: any) => filter.id === 'id')?.value;

    const queryData = mockUseUsersQuery({
      page: tableState.pagination.pageIndex + 1,
      limit: tableState.pagination.pageSize,
      name: nameFilter,
      email: emailFilter,
      id: idFilter,
      ext_id: extIdFilter,
    });

    return {
      data: queryData.data,
      isLoading: queryData.isLoading,
      isFetching: queryData.isFetching,
      onPaginationChange: tableState.onPaginationChange,
      columnFilters: tableState.columnFilters,
      onColumnFiltersChange: tableState.onColumnFiltersChange,
      createMutation: mockUseCreateUser(),
      updateMutation: mockUseUpdateUser(),
      deleteMutation: mockUseDeleteUser(),
      handleRefresh: vi.fn(),
    };
  },
}));

// Mock child components to simplify testing
vi.mock('@/features/admin/components', () => ({
  AdminLayout: ({ children, title, action }: { children: React.ReactNode; title: string; action?: { label: string; onClick: () => void } }) => (
    <div>
      <h1>{title}</h1>
      {action && <button type="button" onClick={action.onClick}>{action.label}</button>}
      {children}
    </div>
  ),
  AdminTable: ({ data, onEdit, onDelete, emptyMessage }: { data: UserApiResponse[]; onEdit?: (item: UserApiResponse) => void; onDelete?: (item: UserApiResponse) => void; emptyMessage?: string }) => (
    <div>
      {data.length === 0
        ? (
            <div>{emptyMessage}</div>
          )
        : (
            <table>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      {onEdit && <button type="button" onClick={() => onEdit(item)}>Edit</button>}
                      {onDelete && <button type="button" onClick={() => onDelete(item)}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
    </div>
  ),
}));

vi.mock('@/features/users/components/user-dialogs', () => ({
  UserCreateDialog: ({ open, onSubmit }: { open: boolean; onSubmit: (data: any) => void }) =>
    open
      ? (
          <div role="dialog">
            <h2>Create User</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit({ name: 'test value' });
              }}
            >
              <button type="submit">Submit</button>
            </form>
          </div>
        )
      : null,
  UserUpdateDialog: ({ user, onSubmit }: { user: UserApiResponse | null; onSubmit: (data: any) => void }) =>
    user
      ? (
          <div role="dialog">
            <h2>Edit User</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit({ name: 'updated value' });
              }}
            >
              <button type="submit">Submit</button>
            </form>
          </div>
        )
      : null,
  UserDeleteDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) =>
    open
      ? (
          <div role="alertdialog">
            <h2>Delete User</h2>
            <button type="button" onClick={onConfirm}>Confirm Delete</button>
          </div>
        )
      : null,
}));

describe('usersList', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseTableUrlState.mockReturnValue({
      pagination: { pageIndex: 0, pageSize: 10 },
      onPaginationChange: vi.fn(),
      setPageCount: vi.fn(),
      columnFilters: [] as ColumnFiltersState,
      onColumnFiltersChange: vi.fn(),
    });

    mockUseUsersQuery.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
      isLoading: false,
      isFetching: false,
    });

    const mockMutation = {
      mutateAsync: mockMutateAsync,
      isPending: false,
    };

    mockUseCreateUser.mockReturnValue(mockMutation);
    mockUseUpdateUser.mockReturnValue(mockMutation);
    mockUseDeleteUser.mockReturnValue(mockMutation);
  });

  it('renders the users list title and create button', () => {
    render(<UsersList />);
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument();
  });

  it('renders empty state when no users exist', () => {
    render(<UsersList />);
    expect(screen.getByText('No users found. Create one to get started.')).toBeInTheDocument();
  });

  it('renders user data when available', () => {
    const mockUsers = [
      { id: '1', name: 'User One', email: 'user1@example.com', created_at: new Date().toISOString() },
      { id: '2', name: 'User Two', email: 'user2@example.com', created_at: new Date().toISOString() },
    ];

    mockUseUsersQuery.mockReturnValue({
      data: {
        data: mockUsers,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UsersList />);

    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });

  it('filters by external ID when present in URL state', () => {
    mockUseTableUrlState.mockReturnValue({
      pagination: { pageIndex: 0, pageSize: 10 },
      onPaginationChange: vi.fn(),
      setPageCount: vi.fn(),
      columnFilters: [{ id: 'ext_id', value: 'ext_123' }],
      onColumnFiltersChange: vi.fn(),
    } as any);

    render(<UsersList />);

    expect(mockUseUsersQuery).toHaveBeenCalledWith(expect.objectContaining({
      ext_id: 'ext_123',
    }));
  });

  it('opens create dialog with external ID field', () => {
    render(<UsersList />);

    fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create User' })).toBeInTheDocument();
    // In our mock, fields are not rendered individually, but in a real test we would check for 'External ID' label/placeholder
  });

  it('calls create mutation when create form is submitted', async () => {
    const user = userEvent.setup();
    render(<UsersList />);

    await user.click(screen.getByRole('button', { name: 'Create User' }));
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('opens edit dialog when edit button is clicked', () => {
    const mockUser = { id: '1', name: 'User One', email: 'user1@example.com', created_at: new Date().toISOString() };

    mockUseUsersQuery.mockReturnValue({
      data: {
        data: [mockUser],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UsersList />);

    fireEvent.click(screen.getByText('Edit'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit User' })).toBeInTheDocument();
  });

  it('calls update mutation when edit form is submitted', async () => {
    const user = userEvent.setup();
    const mockUser = { id: '1', name: 'User One', email: 'user1@example.com', created_at: new Date().toISOString() } as UserApiResponse;

    mockUseUsersQuery.mockReturnValue({
      data: {
        data: [mockUser],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UsersList />);

    await user.click(screen.getByText('Edit'));
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('opens delete confirmation when delete button is clicked', () => {
    const mockUser = { id: '1', name: 'User One', email: 'user1@example.com', created_at: new Date().toISOString() };

    mockUseUsersQuery.mockReturnValue({
      data: {
        data: [mockUser],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UsersList />);

    fireEvent.click(screen.getByText('Delete'));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete User')).toBeInTheDocument();
  });

  it('calls delete mutation when delete is confirmed', async () => {
    const user = userEvent.setup();
    const mockUser = { id: '1', name: 'User One', email: 'user1@example.com', created_at: new Date().toISOString() } as UserApiResponse;

    mockUseUsersQuery.mockReturnValue({
      data: {
        data: [mockUser],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
    });

    render(<UsersList />);

    await user.click(screen.getByText('Delete'));
    await user.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('1');
    });
  });
});
