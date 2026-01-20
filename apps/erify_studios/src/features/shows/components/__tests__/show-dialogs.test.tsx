import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ShowDeleteDialog,
  ShowUpdateDialog,
} from '../show-dialogs';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Input: ({ value, ...props }: any) => <input value={value} {...props} />,
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

describe('showUpdateDialog', () => {
  const mockProps = {
    show: {
      id: 'show-1',
      name: 'Test Show',
      client_id: 'client-1',
      client_name: 'Test Client',
      studio_room_id: 'room-1',
      studio_room_name: 'Room 1',
      show_type_id: 'type-1',
      show_type_name: 'live',
      show_status_id: 'status-1',
      show_status_name: 'scheduled',
      show_standard_id: null,
      show_standard_name: null,
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T12:00:00Z',
      mcs: [{ mc_name: 'MC 1' }],
      platforms: [{ platform_name: 'Platform 1' }],
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when show is provided', () => {
    render(<ShowUpdateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Show')).toBeInTheDocument();
  });

  it('should not render when show is null', () => {
    render(<ShowUpdateDialog {...mockProps} show={null} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('showDeleteDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<ShowDeleteDialog {...mockProps} />);

    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Show')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ShowDeleteDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
  });
});
