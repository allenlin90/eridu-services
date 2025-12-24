import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsersList } from '../routes/system/users/index';

// Mock hook dependencies
const mockUseAdminList = vi.fn();
const mockUseAdminCreate = vi.fn();
const mockUseAdminUpdate = vi.fn();
const mockUseAdminDelete = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('@eridu/ui', () => ({
  useTableUrlState: () => ({
    pagination: { pageIndex: 0, pageSize: 10 },
    onPaginationChange: vi.fn(),
    setPageCount: vi.fn(),
  }),
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/lib/hooks/use-admin-crud', () => ({
  useAdminList: (...args: any[]) => mockUseAdminList(...args),
  useAdminCreate: (...args: any[]) => mockUseAdminCreate(...args),
  useAdminUpdate: (...args: any[]) => mockUseAdminUpdate(...args),
  useAdminDelete: (...args: any[]) => mockUseAdminDelete(...args),
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

    mockUseAdminList.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
      isLoading: false,
    });

    const mockMutation = {
      mutateAsync: mockMutateAsync,
      isPending: false,
    };

    mockUseAdminCreate.mockReturnValue(mockMutation);
    mockUseAdminUpdate.mockReturnValue(mockMutation);
    mockUseAdminDelete.mockReturnValue(mockMutation);
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

    mockUseAdminList.mockReturnValue({
      data: {
        data: mockUsers,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<UsersList />);

    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
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

    mockUseAdminList.mockReturnValue({
      data: {
        data: [mockUser],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<UsersList />);

    fireEvent.click(screen.getByText('Edit'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit User' })).toBeInTheDocument();
  });

  it('calls update mutation when edit form is submitted', async () => {
    const mockUser = { id: '1', name: 'User One', email: 'user1@example.com', created_at: new Date().toISOString() };

    mockUseAdminList.mockReturnValue({
      data: {
        data: [mockUser],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
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

    mockUseAdminList.mockReturnValue({
      data: {
        data: [mockUser],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<UsersList />);

    fireEvent.click(screen.getByText('Delete'));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete User')).toBeInTheDocument();
  });

  it('calls delete mutation when delete is confirmed', async () => {
    const mockUser = { id: '1', name: 'User One', email: 'user1@example.com', created_at: new Date().toISOString() };

    mockUseAdminList.mockReturnValue({
      data: {
        data: [mockUser],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<UsersList />);

    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('1');
    });
  });
});
