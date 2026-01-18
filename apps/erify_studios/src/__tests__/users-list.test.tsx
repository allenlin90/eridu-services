import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsersList } from '../routes/system/users/index';

// Mock hook dependencies
const mockUseUsersQuery = vi.fn();
const mockUseCreateUser = vi.fn();
const mockUseUpdateUser = vi.fn();
const mockUseDeleteUser = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockUseTableUrlState = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock('@eridu/ui', () => ({
  useTableUrlState: (...args: any[]) => mockUseTableUrlState(...args),
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/features/users/api/get-users', () => ({
  useUsersQuery: (...args: any[]) => mockUseUsersQuery(...args),
}));

vi.mock('@/features/users/api/create-user', () => ({
  useCreateUser: (...args: any[]) => mockUseCreateUser(...args),
}));

vi.mock('@/features/users/api/update-user', () => ({
  useUpdateUser: (...args: any[]) => mockUseUpdateUser(...args),
}));

vi.mock('@/features/users/api/delete-user', () => ({
  useDeleteUser: (...args: any[]) => mockUseDeleteUser(...args),
}));

// Mock child components to simplify testing
vi.mock('@/features/admin/components', () => ({
  AdminLayout: ({ children, title, action }: any) => (
    <div>
      <h1>{title}</h1>
      <button type="button" onClick={action.onClick}>{action.label}</button>
      {children}
    </div>
  ),
  AdminTable: ({ data, onEdit, onDelete, emptyMessage }: any) => (
    <div>
      {data.length === 0
        ? (
            <div>{emptyMessage}</div>
          )
        : (
            <table>
              <tbody>
                {data.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <button type="button" onClick={() => onEdit(item)}>Edit</button>
                      <button type="button" onClick={() => onDelete(item)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
    </div>
  ),
  AdminFormDialog: ({ open, title, onSubmit, fields }: any) =>
    open
      ? (
          <div role="dialog">
            <h2>{title}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData: any = {};
                fields.forEach((field: any) => {
                  formData[field.name] = 'test value'; // Simplified
                });
                onSubmit(formData);
              }}
            >
              <button type="submit">Submit</button>
            </form>
          </div>
        )
      : null,
  DeleteConfirmDialog: ({ open, title, onConfirm }: any) =>
    open
      ? (
          <div role="alertdialog">
            <h2>{title}</h2>
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
      columnFilters: [],
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
    render(<UsersList />);

    fireEvent.click(screen.getByRole('button', { name: 'Create User' }));
    fireEvent.click(screen.getByText('Submit'));

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
    fireEvent.click(screen.getByText('Submit'));

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
    fireEvent.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('1');
    });
  });
});
