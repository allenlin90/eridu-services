import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  StudioRoomCreateDialog,
  StudioRoomDeleteDialog,
  StudioRoomUpdateDialog,
} from '../studio-room-dialogs';

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

describe('studioRoomCreateDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<StudioRoomCreateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Create Room')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<StudioRoomCreateDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('studioRoomUpdateDialog', () => {
  const mockProps = {
    room: {
      id: 'room-1',
      name: 'Test Room',
      capacity: 10,
      studio_id: 'studio-123',
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };

  it('should render when room is provided', () => {
    render(<StudioRoomUpdateDialog {...mockProps} />);

    expect(screen.getByTestId('admin-form-dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Room')).toBeInTheDocument();
  });

  it('should not render when room is null', () => {
    render(<StudioRoomUpdateDialog {...mockProps} room={null} />);

    expect(screen.queryByTestId('admin-form-dialog')).not.toBeInTheDocument();
  });
});

describe('studioRoomDeleteDialog', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('should render when open', () => {
    render(<StudioRoomDeleteDialog {...mockProps} />);

    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Room')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<StudioRoomDeleteDialog {...mockProps} open={false} />);

    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
  });
});
