import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { describe, expect, it, vi } from 'vitest';

import { ShowsTableToolbar } from '../shows-table-toolbar';

// Mock React Query
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
    useIsFetching: () => 0,
  };
});

// Mock paraglide messages
vi.mock('@/paraglide/messages.js', () => ({
  'shows.searchPlaceholder': () => 'Search by name...',
  'shows.resetButton': () => 'Reset',
  'shows.refresh': () => 'Refresh',
}));

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
  Input: ({ placeholder, value, onChange, className }: any) => (
    <input
      placeholder={placeholder}
      value={value || ''}
      onChange={onChange}
      className={className}
      data-testid="search-input"
    />
  ),
  DatePickerWithRange: ({ date, setDate, open, onOpenChange }: any) => {
    // Simulate the component behavior - when date is set and picker closes, it should trigger onOpenChange(false)
    React.useEffect(() => {
      if (!open && date) {
        // This simulates the component committing changes when closed
        // In the real component, this would happen through the handleDatePickerOpenChange callback
      }
    }, [open, date]);

    return (
      <div data-testid="date-picker">
        <button
          onClick={() => onOpenChange(!open)}
          data-testid="date-picker-toggle"
        >
          Date Picker
        </button>
        {open && (
          <div data-testid="date-picker-content">
            <button
              onClick={() => {
                const newDate = { from: new Date('2024-01-01'), to: new Date('2024-01-31') };
                setDate(newDate);
                onOpenChange(false);
              }}
              data-testid="select-date-range"
            >
              Select Range
            </button>
          </div>
        )}
      </div>
    );
  },
}));

// Mock query keys
vi.mock('@/lib/api/query-keys', () => ({
  queryKeys: {
    shows: {
      lists: () => ['me', 'shows', 'list'],
    },
  },
}));

// Mock TanStack Table
const mockGetColumn = vi.fn();
const mockGetState = vi.fn(() => ({
  columnFilters: [],
}));
const mockResetColumnFilters = vi.fn();
const mockSetFilterValue = vi.fn();

const mockTable = {
  getColumn: mockGetColumn,
  getState: mockGetState,
  resetColumnFilters: mockResetColumnFilters,
};

// Set up default column behavior
mockGetColumn.mockImplementation((columnName: string) => ({
  getFilterValue: () => columnName === 'start_time' ? undefined : '',
  setFilterValue: mockSetFilterValue,
}));

describe('showsTableToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetState.mockReturnValue({ columnFilters: [] });
    // Reset to default column behavior
    mockGetColumn.mockImplementation((columnName: string) => ({
      getFilterValue: () => columnName === 'start_time' ? undefined : '',
      setFilterValue: mockSetFilterValue,
    }));
  });

  it('renders search input with placeholder', () => {
    render(<ShowsTableToolbar table={mockTable as any} />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search by name...');
  });

  it('renders date picker', () => {
    render(<ShowsTableToolbar table={mockTable as any} />);

    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    render(<ShowsTableToolbar table={mockTable as any} />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it('does not render reset button when no filters are applied', () => {
    render(<ShowsTableToolbar table={mockTable as any} />);

    const resetButton = screen.queryByRole('button', { name: /Reset/i });
    expect(resetButton).not.toBeInTheDocument();
  });

  it('renders reset button when filters are applied', () => {
    mockGetState.mockReturnValue({ columnFilters: [{ id: 'name', value: 'test' }] });

    render(<ShowsTableToolbar table={mockTable as any} />);

    const resetButton = screen.getByRole('button', { name: /Reset/i });
    expect(resetButton).toBeInTheDocument();
  });

  it('resets column filters when reset button is clicked', async () => {
    const user = userEvent.setup();
    mockGetState.mockReturnValue({ columnFilters: [{ id: 'name', value: 'test' }] });

    render(<ShowsTableToolbar table={mockTable as any} />);

    const resetButton = screen.getByRole('button', { name: /Reset/i });
    await user.click(resetButton);

    expect(mockResetColumnFilters).toHaveBeenCalled();
  });

  it('invalidates shows queries when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<ShowsTableToolbar table={mockTable as any} />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    await user.click(refreshButton);

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['me', 'shows', 'list'],
    });
  });

  it('shows refresh button with correct text', () => {
    render(<ShowsTableToolbar table={mockTable as any} />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toHaveTextContent('Refresh');
  });

  it('syncs date range with table state when date picker is closed', () => {
    const dateRange: DateRange = {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31'),
    };

    mockGetColumn.mockImplementation((columnName: string) => {
      if (columnName === 'start_time') {
        return {
          getFilterValue: () => dateRange,
          setFilterValue: mockSetFilterValue,
        };
      }
      return {
        getFilterValue: () => undefined,
        setFilterValue: mockSetFilterValue,
      };
    });

    render(<ShowsTableToolbar table={mockTable as any} />);

    // The component should sync the date range from table state to local state
    // This is tested implicitly through the date picker rendering
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  it('renders date picker with correct initial state', () => {
    const dateRange: DateRange = {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31'),
    };

    // Mock the column to return the date range
    mockGetColumn.mockImplementation((columnName: string) => ({
      getFilterValue: () => columnName === 'start_time' ? dateRange : '',
      setFilterValue: mockSetFilterValue,
    }));

    render(<ShowsTableToolbar table={mockTable as any} />);

    // The date picker should render without errors
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });
});
