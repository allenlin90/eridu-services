import type { Table } from '@tanstack/react-table';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchableColumn } from '../admin-table-toolbar';
import { AdminTableToolbar } from '../admin-table-toolbar';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="filter-input"
      {...props}
    />
  ),
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick} data-testid="dropdown-item">
      {children}
    </button>
  ),
  DatePickerWithRange: ({ date, open, onOpenChange }: any) => (
    <div data-testid="date-picker">
      <button type="button" onClick={() => onOpenChange(!open)}>
        {date?.from ? 'Date selected' : 'Pick date'}
      </button>
    </div>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  X: () => <span>×</span>,
}));

// Mock i18n
vi.mock('@/paraglide/messages.js', () => ({
  'admin.searchPlaceholder': () => 'Search...',
  'admin.resetButton': () => 'Reset',
}));

describe('adminTableToolbar', () => {
  let mockTable: Partial<Table<any>>;
  let mockColumn: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockColumn = {
      getFilterValue: vi.fn(() => ''),
      setFilterValue: vi.fn(),
    };

    mockTable = {
      getState: vi.fn(() => ({
        columnFilters: [],
      })) as any,
      getColumn: vi.fn(() => mockColumn),
      resetColumnFilters: vi.fn(),
    };
  });

  it('renders primary search input', () => {
    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchColumn="name"
        searchPlaceholder="Search by name"
      />,
    );

    expect(screen.getByPlaceholderText('Search by name')).toBeInTheDocument();
  });

  it('uses default search placeholder from i18n', () => {
    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchColumn="name"
      />,
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders add filter button when searchableColumns provided', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
    ];

    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('shows available filters in dropdown', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
      { id: 'status', title: 'Status' },
    ];

    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
  });

  it('adds secondary filter when dropdown item clicked', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
    ];

    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    const dropdownItems = screen.getAllByTestId('dropdown-item');
    fireEvent.click(dropdownItems[0]); // Click "Email" filter

    // Should render the new filter input
    expect(screen.getByPlaceholderText('Filter by Email...')).toBeInTheDocument();
  });

  it('removes filter when X button clicked', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
    ];

    // Mock table with active filter
    mockTable.getState = vi.fn(() => ({
      columnFilters: [{ id: 'email', value: 'test@example.com' }],
    })) as any;

    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Find and click the X button
    const removeButtons = screen.getAllByText('×');
    fireEvent.click(removeButtons[0]);

    expect(mockColumn.setFilterValue).toHaveBeenCalledWith(undefined);
  });

  it('renders reset button when filters are active', () => {
    mockTable.getState = vi.fn(() => ({
      columnFilters: [{ id: 'name', value: 'test' }],
    })) as any;

    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchColumn="name"
      />,
    );

    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('does not render reset button when no filters are active', () => {
    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchColumn="name"
      />,
    );

    expect(screen.queryByText('Reset')).not.toBeInTheDocument();
  });

  it('resets all filters when reset button clicked', () => {
    mockTable.getState = vi.fn(() => ({
      columnFilters: [{ id: 'name', value: 'test' }],
    })) as any;

    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchColumn="name"
      />,
    );

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(mockTable.resetColumnFilters).toHaveBeenCalled();
  });

  it('renders date range filter for date-range type', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name' },
      { id: 'createdAt', title: 'Created At', type: 'date-range' },
    ];

    // Mock table with active date filter
    mockTable.getState = vi.fn(() => ({
      columnFilters: [{ id: 'createdAt', value: { from: new Date(), to: new Date() } }],
    })) as any;

    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  it('handles no searchable columns gracefully', () => {
    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
      />,
    );

    // Should not crash, just render empty toolbar
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('uses first searchableColumn as primary when searchColumn not provided', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'title', title: 'Title' },
      { id: 'description', title: 'Description' },
    ];

    render(
      <AdminTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Should use "title" as primary search
    expect(mockTable.getColumn).toHaveBeenCalledWith('title');
  });
});
