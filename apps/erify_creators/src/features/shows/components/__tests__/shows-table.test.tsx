import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ShowApiResponse } from '@eridu/api-types/shows';

import { renderWithQueryClient } from '../../../../test/test-utils';
import { columns } from '../columns';
import { ShowsTable } from '../shows-table';

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/paraglide/messages.js', () => ({
  'table.name': () => 'Name',
  'table.client': () => 'Client',
  'table.studioRoom': () => 'Studio Room',
  'table.date': () => 'Date',
  'table.startTime': () => 'Start Time',
  'table.endTime': () => 'End Time',
  'shows.noResults': () => 'No results.',
  'shows.searchPlaceholder': () => 'Search by name...',
  'shows.resetButton': () => 'Reset',
  'shows.refresh': () => 'Refresh',
}));

function buildMockShow(overrides: Partial<ShowApiResponse> = {}): ShowApiResponse {
  return {
    id: '1',
    name: 'Test Show',
    client_id: null,
    client_name: null,
    schedule_id: null,
    schedule_name: null,
    studio_id: null,
    studio_name: null,
    studio_room_id: null,
    studio_room_name: null,
    show_type_id: null,
    show_type_name: null,
    show_status_id: null,
    show_status_name: null,
    show_status_system_key: null,
    show_standard_id: null,
    show_standard_name: null,
    start_time: '2024-01-01T10:00:00Z',
    end_time: '2024-01-01T12:00:00Z',
    actual_start_time: null,
    actual_end_time: null,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const mockShows: ShowApiResponse[] = [
  buildMockShow({
    id: '1',
    name: 'Test Show 1',
    client_name: 'Test Client',
    studio_room_name: 'Studio A',
    start_time: '2024-01-01T10:00:00Z',
    end_time: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }),
  buildMockShow({
    id: '2',
    name: 'Test Show 2',
    client_name: 'Test Client 2',
    studio_room_name: 'Studio B',
    start_time: '2024-01-02T10:00:00Z',
    end_time: '2024-01-02T12:00:00Z',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  }),
];

const defaultProps = {
  columns,
  data: mockShows,
  totalCount: mockShows.length,
  pageCount: 1,
  pagination: { pageIndex: 0, pageSize: 10 },
  onPaginationChange: () => {},
  sorting: [],
  onSortingChange: () => {},
  columnFilters: [],
  onColumnFiltersChange: () => {},
};

describe('showsTable', () => {
  it('renders table with shows data', () => {
    renderWithQueryClient(<ShowsTable {...defaultProps} />);

    // Test show names
    expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    expect(screen.getByText('Test Show 2')).toBeInTheDocument();

    // Test client names
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('Test Client 2')).toBeInTheDocument();

    // Test studio room names
    expect(screen.getByText('Studio A')).toBeInTheDocument();
    expect(screen.getByText('Studio B')).toBeInTheDocument();

    // Test column headers
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Start Time')).toBeInTheDocument();
    expect(screen.getByText('End Time')).toBeInTheDocument();

    // Test that time values are rendered (exact format may vary by timezone)
    // We check for presence of time-like patterns rather than exact values
    const table = screen.getByRole('table');
    const timeCells = Array.from(table.querySelectorAll('td')).filter((cell) =>
      /\d{1,2}:\d{2}/.test(cell.textContent || ''),
    );
    expect(timeCells.length).toBeGreaterThan(0); // Should have time-formatted cells
  });

  it('navigates to show details when row is clicked', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ShowsTable {...defaultProps} />);

    // Find table rows (skip header row)
    const tableRows = screen.getAllByRole('row');
    const dataRows = tableRows.slice(1); // Skip header row
    expect(dataRows).toHaveLength(2); // Should have 2 data rows

    // Click on the first data row
    await user.click(dataRows[0]);

    // Check that navigate was called with the correct parameters
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/shows/$showId',
      params: { showId: '1' },
    });

    // Reset mock for next test
    mockNavigate.mockClear();

    // Click on the second data row
    await user.click(dataRows[1]);

    // Check that navigate was called with the correct parameters for the second show
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/shows/$showId',
      params: { showId: '2' },
    });
  });

  it('renders empty state when no data', () => {
    renderWithQueryClient(<ShowsTable {...defaultProps} data={[]} />);

    expect(screen.getByText('No results.')).toBeInTheDocument();
  });
});
