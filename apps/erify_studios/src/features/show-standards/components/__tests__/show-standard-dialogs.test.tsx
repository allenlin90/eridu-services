import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ShowStandardCreateDialog,
  ShowStandardDeleteDialog,
  ShowStandardUpdateDialog,
} from '../show-standard-dialogs';

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

describe('showStandardCreateDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<ShowStandardCreateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Show Standard')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ShowStandardCreateDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('showStandardUpdateDialog', () => {
  const mockProps = {
    showStandard: {
      id: 'show-standard-1',
      name: 'Test Show Standard',
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when showStandard is provided', () => {
    render(<ShowStandardUpdateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Show Standard')).toBeInTheDocument();
  });

  it('should not render when showStandard is null', () => {
    render(<ShowStandardUpdateDialog {...mockProps} showStandard={null} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('showStandardDeleteDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<ShowStandardDeleteDialog {...mockProps} />);

    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Show Standard')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ShowStandardDeleteDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
  });
});
