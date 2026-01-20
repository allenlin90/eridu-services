import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  MembershipCreateDialog,
  MembershipDeleteDialog,
  MembershipUpdateDialog,
} from '../membership-dialogs';

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

describe('membershipCreateDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
    studios: [
      {
        id: 'studio-1',
        name: 'Studio 1',
        address: '123 Main St',
        metadata: {},
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: 'studio-2',
        name: 'Studio 2',
        address: '456 Oak Ave',
        metadata: {},
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ],
    isLoadingStudios: false,
  };

  it('should render when open', () => {
    render(<MembershipCreateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Membership')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<MembershipCreateDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('membershipUpdateDialog', () => {
  const mockProps = {
    membership: {
      id: 'membership-1',
      user_id: 'user-1',
      studio_id: 'studio-1',
      role: 'owner' as const,
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
    studios: [
      {
        id: 'studio-1',
        name: 'Studio 1',
        address: '123 Main St',
        metadata: {},
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ],
    isLoadingStudios: false,
  };

  it('should render when membership is provided', () => {
    render(<MembershipUpdateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Membership')).toBeInTheDocument();
  });

  it('should not render when membership is null', () => {
    render(<MembershipUpdateDialog {...mockProps} membership={null} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('membershipDeleteDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<MembershipDeleteDialog {...mockProps} />);

    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Membership')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<MembershipDeleteDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
  });
});
