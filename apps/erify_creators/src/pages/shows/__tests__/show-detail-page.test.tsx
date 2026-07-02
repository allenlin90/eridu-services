import type { UseQueryResult } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Show } from '@eridu/api-types/shows';

import { useMyShow } from '../../../features/shows/api/shows.api';
import { ShowDetailPage } from '../show-detail-page';

// Mock the router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/paraglide/messages.js', () => ({
  'pages.error': () => 'An error occurred',
  'pages.failedToLoadShowDetails': () => 'Failed to load show details. Please try again.',
  'pages.showNotFound': () => 'Show Not Found',
  'pages.showNotFoundMessage': ({ showId }: { showId: string }) =>
    `The show with ID "${showId}" could not be found.`,
  'shows.title': () => 'Shows',
  'shows.basicInformation': () => 'Basic Information',
  'shows.typeLabel': () => 'Type:',
  'shows.statusLabel': () => 'Status:',
  'shows.standard': () => 'Standard',
  'shows.clientAndStudio': () => 'Client & Studio',
  'shows.client': () => 'Client',
  'shows.studioRoom': () => 'Studio Room',
  'shows.schedule': () => 'Schedule',
  'shows.startLabel': () => 'Start:',
  'shows.endLabel': () => 'End:',
  'shows.metadata': () => 'Metadata',
  'shows.createdLabel': () => 'Created:',
  'shows.updatedLabel': () => 'Updated:',
}));

// Mock the useMyShow hook
vi.mock('../../../features/shows/api/shows.api', () => ({
  useMyShow: vi.fn(),
}));

// Create a query client for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Helper functions to create properly typed mock results
function createMockShowResult(overrides: Partial<UseQueryResult<Show, Error>> = {}): UseQueryResult<Show, Error> {
  return {
    data: undefined,
    isLoading: false,
    error: null,
    isError: false,
    isPending: true,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: false,
    status: 'pending',
    fetchStatus: 'idle',
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isRefetching: false,
    isStale: false,
    isPlaceholderData: false,
    isInitialLoading: false,
    isEnabled: true,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isPaused: false,
    refetch: vi.fn(),
    promise: Promise.resolve(undefined),
    ...overrides,
  } as UseQueryResult<Show, Error>;
}

// Wrapper component with QueryClient
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('showDetailPage', () => {
  beforeEach(() => {
    // Reset mock to default state
    vi.mocked(useMyShow).mockReturnValue(createMockShowResult());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders show not found message when show is null', () => {
    render(<ShowDetailPage showId="test-id" />, { wrapper: TestWrapper });

    expect(screen.getByText('Show Not Found')).toBeInTheDocument();
    expect(
      screen.getByText(/The show with ID "test-id" could not be found./),
    ).toBeInTheDocument();
  });

  it('displays the show ID in not found message', () => {
    const showId = 'abc-123';
    render(<ShowDetailPage showId={showId} />, { wrapper: TestWrapper });

    expect(
      screen.getByText(new RegExp(`The show with ID "${showId}" could not be found.`)),
    ).toBeInTheDocument();
  });

  it('renders show detail view when show is available', () => {
    // Mock show data
    vi.mocked(useMyShow).mockReturnValue(createMockShowResult({
      data: {
        id: 'test-id',
        name: 'Test Show',
        client_id: 'client-1',
        client_name: 'Test Client',
        studio_id: 'studio-1',
        studio_name: 'Test Studio',
        studio_room_id: 'studio-1',
        studio_room_name: 'Studio A',
        show_type_id: 'type-1',
        show_type_name: 'Live',
        show_status_id: 'status-1',
        show_status_name: 'Scheduled',
        show_standard_id: 'standard-1',
        show_standard_name: 'HD',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        metadata: {},
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      },
      isLoading: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
    }));

    render(<ShowDetailPage showId="test-id" />, { wrapper: TestWrapper });

    // Show name appears twice: once in breadcrumb, once as title
    const showNames = screen.getAllByText('Test Show');
    expect(showNames).toHaveLength(2);
  });

  it('renders loading page when loading', () => {
    vi.mocked(useMyShow).mockReturnValue(createMockShowResult({
      data: undefined,
      isLoading: true,
      isPending: true,
      isSuccess: false,
      status: 'pending',
      fetchStatus: 'fetching',
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: true,
    }));

    render(<ShowDetailPage showId="test-id" />, { wrapper: TestWrapper });

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});
