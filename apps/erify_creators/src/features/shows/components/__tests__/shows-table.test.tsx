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

const mockShows: ShowApiResponse[] = [
  {
    id: '1',
    name: 'Test Show 1',
    client_name: 'Test Client',
    studio_room_name: 'Studio A',
    start_time: '2024-01-01T10:00:00Z',
    end_time: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    metadata: {},
  },
  {
    id: '2',
    name: 'Test Show 2',
    client_name: 'Test Client 2',
    studio_room_name: 'Studio B',
    start_time: '2024-01-02T10:00:00Z',
    end_time: '2024-01-02T12:00:00Z',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    metadata: {},
  },
];

const defaultProps = {
  columns,
  data: mockShows,
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

    expect(screen.getByText('Test Show 1')).toBeInTheDocument();
    expect(screen.getByText('Test Show 2')).toBeInTheDocument();
    expect(screen.getByText('Test Client')).toBeInTheDocument();
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
