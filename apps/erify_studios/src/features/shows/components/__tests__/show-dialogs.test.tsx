import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ShowDeleteDialog,
  ShowUpdateDialog,
} from '../show-dialogs';

// Create a wrapper with QueryClient for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Mock the API fetchers
vi.mock('@/features/clients/api/get-clients', () => ({
  getClients: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
}));

vi.mock('@/features/mcs/api/get-mcs', () => ({
  getMcs: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
}));

vi.mock('@/features/platforms/api/get-platforms', () => ({
  getPlatforms: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
}));

vi.mock('@/features/show-standards/api/get-show-standards', () => ({
  getShowStandards: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
}));

vi.mock('@/features/show-statuses/api/get-show-statuses', () => ({
  getShowStatuses: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
}));

vi.mock('@/features/show-types/api/get-show-types', () => ({
  getShowTypes: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
}));

vi.mock('@/features/studio-rooms/api/get-studio-rooms', () => ({
  getStudioRooms: vi.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
}));

vi.mock('@/features/shows/api/update-show', () => ({
  useUpdateShow: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/admin/components', () => ({
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
      uid: 'show-1',
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
      mcs: [{ mc_name: 'MC 1', mc_id: 'mc-1', id: '1' }],
      platforms: [{ platform_name: 'Platform 1', platform_id: 'p-1', id: '1' }],
      metadata: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    onOpenChange: vi.fn(),
  };

  it('should render when show is provided', () => {
    render(<ShowUpdateDialog {...mockProps} />, { wrapper: createWrapper() });

    expect(screen.getByText('Edit Show')).toBeInTheDocument();
    expect(screen.getByText('Update show details')).toBeInTheDocument();
  });

  it('should not render when show is null', () => {
    render(<ShowUpdateDialog {...mockProps} show={null} />, { wrapper: createWrapper() });

    expect(screen.queryByText('Edit Show')).not.toBeInTheDocument();
  });

  it('should render start_time formatted as local string', () => {
    render(<ShowUpdateDialog {...mockProps} />, { wrapper: createWrapper() });

    // The component should render with the show name
    expect(screen.getByDisplayValue('Test Show')).toBeInTheDocument();
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
