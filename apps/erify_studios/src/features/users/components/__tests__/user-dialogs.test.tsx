import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  UserCreateDialog,
  UserDeleteDialog,
  UserUpdateDialog,
} from '../user-dialogs';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/features/admin/components', () => ({
  AdminFormDialog: ({ title, description, open }: any) => (
    open
      ? (
          <div data-testid="admin-form-dialog">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        )
      : null
  ),
  DeleteConfirmDialog: ({ title, description, open }: any) => (
    open
      ? (
          <div data-testid="delete-confirm-dialog">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        )
      : null
  ),
}));

describe('userCreateDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<UserCreateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Create User')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<UserCreateDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('userUpdateDialog', () => {
  const mockProps = {
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      ext_id: 'ext-123',
      profile_url: 'https://example.com/profile.jpg',
      email_verified: true,
      image: null,
      role: 'user' as const,
      banned: false,
      ban_reason: null,
      ban_expires: null,
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when user is provided', () => {
    render(<UserUpdateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit User')).toBeInTheDocument();
  });

  it('should not render when user is null', () => {
    render(<UserUpdateDialog {...mockProps} user={null} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('userDeleteDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<UserDeleteDialog {...mockProps} />);

    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete User')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<UserDeleteDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
  });
});
