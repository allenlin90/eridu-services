import type { UseQueryResult } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ShowApiResponse, ShowListResponse } from '@eridu/api-types/shows';

import { useMyShows } from '../../../features/shows/api/shows.api';
import { useShowsTableState } from '../../../features/shows/hooks/use-shows-table-state';
import { renderWithQueryClient } from '../../../test/test-utils';
import { ShowsListPage } from '../shows-list-page';

function createMockShowsResult(
  overrides: Partial<UseQueryResult<ShowListResponse, Error>> = {},
): UseQueryResult<ShowListResponse, Error> {
  return {
    data: undefined,
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: true,
    status: 'success',
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
  } as UseQueryResult<ShowListResponse, Error>;
}

// Mock the hooks
vi.mock('../../../features/shows/api/shows.api', () => ({
  useMyShows: vi.fn(),
}));

vi.mock('../../../features/shows/hooks/use-shows-table-state', () => ({
  useShowsTableState: vi.fn(),
}));

vi.mock('@/paraglide/messages.js', () => ({
  'shows.title': () => 'Shows',
  'shows.noResults': () => 'No results.',
  'pages.error': () => 'An error occurred',
  'pages.failedToLoadShows': () => 'Failed to load shows. Please try again.',
  'table.name': () => 'Name',
  'table.client': () => 'Client',
  'table.studioRoom': () => 'Studio Room',
  'table.date': () => 'Date',
  'table.startTime': () => 'Start Time',
  'table.endTime': () => 'End Time',
}));

// Mock UI components
vi.mock('@eridu/ui', () => ({
  LoadingPage: () => <div aria-label="Loading">Loading</div>,
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  Input: ({ placeholder, value, onChange }: any) => (
    <input placeholder={placeholder} value={value || ''} onChange={onChange} />
  ),
  DatePickerWithRange: () => <div>Date Picker</div>,
  Button: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DataTable: ({ emptyMessage }: any) => <div>{emptyMessage || 'DataTable Component'}</div>,
}));

// Mock TanStack Table
vi.mock('@tanstack/react-table', () => ({
  useReactTable: vi.fn(() => ({
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [] }),
    getFilteredRowModel: () => ({ rows: [] }),
    getFilteredSelectedRowModel: () => ({ rows: [] }),
    getState: () => ({
      pagination: { pageIndex: 0, pageSize: 10 },
      columnFilters: [],
    }),
    getPageCount: () => 1,
    getCanPreviousPage: () => false,
    getCanNextPage: () => false,
    previousPage: vi.fn(),
    nextPage: vi.fn(),
    setPageIndex: vi.fn(),
    setPageSize: vi.fn(),
    getColumn: vi.fn(() => ({
      getFilterValue: () => undefined,
      setFilterValue: vi.fn(),
    })),
    resetColumnFilters: vi.fn(),
  })),
  getCoreRowModel: vi.fn(),
  getFilteredRowModel: vi.fn(),
  getPaginationRowModel: vi.fn(),
  getSortedRowModel: vi.fn(),
  getFacetedRowModel: vi.fn(),
  getFacetedUniqueValues: vi.fn(),
}));

describe('showsListPage', () => {
  beforeEach(() => {
    vi.mocked(useShowsTableState).mockReturnValue({
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [],
      columnFilters: [],
      onPaginationChange: vi.fn(),
      onSortingChange: vi.fn(),
      onColumnFiltersChange: vi.fn(),
      setPageCount: vi.fn(),
    });

    // Reset mock to default state
    vi.mocked(useMyShows).mockReturnValue(createMockShowsResult({
      data: { data: [] as ShowApiResponse[], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } },
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders shows heading', () => {
    renderWithQueryClient(<ShowsListPage />);

    expect(screen.getByText('Shows')).toBeInTheDocument();
  });

  it('renders show list component', () => {
    renderWithQueryClient(<ShowsListPage />);

    // ShowsTable component should be rendered (will show empty state)
    expect(screen.getByText('No results.')).toBeInTheDocument();
  });

  it('renders loading page when loading', () => {
    // Mock loading state
    vi.mocked(useMyShows).mockReturnValue(createMockShowsResult({
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

    renderWithQueryClient(<ShowsListPage />);

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});
