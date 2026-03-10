import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CreatorCreateDialog,
  CreatorDeleteDialog,
  CreatorUpdateDialog,
} from '../creator-dialogs';

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

describe('creatorCreateDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<CreatorCreateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Creator')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<CreatorCreateDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('creatorUpdateDialog', () => {
  const mockProps = {
    creator: {
      id: 'mc-1',
      name: 'Test MC',
      alias_name: 'TestAlias',
      user_id: 'user-123',
      is_banned: false,
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when creator is provided', () => {
    render(<CreatorUpdateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Creator')).toBeInTheDocument();
  });

  it('should not render when creator is null', () => {
    render(<CreatorUpdateDialog {...mockProps} creator={null} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('creatorDeleteDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<CreatorDeleteDialog {...mockProps} />);

    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Creator')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<CreatorDeleteDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
  });
});
