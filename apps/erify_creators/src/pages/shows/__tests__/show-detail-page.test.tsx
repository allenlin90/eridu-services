import type { UseQueryResult } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Show } from '@eridu/api-types/shows';

import { useShow } from '../../../features/shows/api';
import { ShowDetailPage } from '../show-detail-page';

// Mock the router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock the useShow hook
vi.mock('../../../features/shows/api', () => ({
  useShow: vi.fn(),
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
    vi.mocked(useShow).mockReturnValue(createMockShowResult());
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
    vi.mocked(useShow).mockReturnValue(createMockShowResult({
      data: {
        id: 'test-id',
        name: 'Test Show',
        clientId: 'client-1',
        clientName: 'Test Client',
        studioRoomId: 'studio-1',
        studioRoomName: 'Studio A',
        showTypeId: 'type-1',
        showTypeName: 'Live',
        showStatusId: 'status-1',
        showStatusName: 'Scheduled',
        showStandardId: 'standard-1',
        showStandardName: 'HD',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        metadata: {},
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T09:00:00Z',
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
    vi.mocked(useShow).mockReturnValue(createMockShowResult({
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
