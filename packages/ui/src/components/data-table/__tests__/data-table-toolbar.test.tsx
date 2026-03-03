import '@testing-library/jest-dom/vitest';

import type { Table } from '@tanstack/react-table';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchableColumn } from '../data-table-toolbar';
import { DataTableToolbar } from '../data-table-toolbar';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, placeholder, type, ...props }: any) => (
    <input
      type={type || 'text'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="filter-input"
      {...props}
    />
  ),
  Badge: ({ children, ...props }: any) => (
    <span data-testid="badge" {...props}>
      {children}
    </span>
  ),
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  Popover: ({ children, open, onOpenChange }: any) => {
    React.useEffect(() => {
      if (!open) {
        onOpenChange?.(true);
      }
    }, [open, onOpenChange]);
    return <div data-testid="popover">{children}</div>;
  },
  PopoverTrigger: ({ children }: any) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({ children }: any) => (
    <div data-testid="popover-content">{children}</div>
  ),
  Sheet: ({ children }: any) => <div data-testid="sheet">{children}</div>,
  SheetTrigger: ({ children }: any) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
  SheetContent: ({ children }: any) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: any) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: any) => (
    <div data-testid="sheet-title">{children}</div>
  ),
  SheetDescription: ({ children }: any) => (
    <div data-testid="sheet-description">{children}</div>
  ),
  Select: ({ children, value, onValueChange: _onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: any) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  DatePickerWithRange: ({ date, open, onOpenChange }: any) => (
    <div data-testid="date-picker">
      <button type="button" onClick={() => onOpenChange(!open)}>
        {date?.from ? 'Date selected' : 'Pick date'}
      </button>
    </div>
  ),
}));

// Mock @eridu/ui/lib/utils
vi.mock('@eridu/ui/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock @eridu/i18n
vi.mock('@eridu/i18n', () => ({
  'common.search': () => 'Search...',
  'common.reset': () => 'Reset',
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  X: () => <span data-testid="x-icon">×</span>,
  Search: () => <span data-testid="search-icon">🔍</span>,
  Filter: () => <span data-testid="filter-icon">⚙️</span>,
  RotateCcw: () => <span data-testid="rotate-icon">↺</span>,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (_date: Date, _formatStr: string) => 'Jan 1',
}));

describe('dataTableToolbar', () => {
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

  afterEach(() => {
    cleanup();
  });

  it('renders primary search input', () => {
    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchColumn="name"
        searchPlaceholder="Search by name"
      />,
    );

    expect(screen.getByPlaceholderText('Search by name')).toBeInTheDocument();
  });

  it('uses default search placeholder', () => {
    render(
      <DataTableToolbar table={mockTable as Table<any>} searchColumn="name" />,
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders filter button when searchableColumns provided', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
    ];

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Filter button should be rendered (text appears in button and popover header)
    const filterElements = screen.getAllByText('Filters');
    expect(filterElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders filter popover with available filters', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'email', title: 'Email', type: 'text' },
      { id: 'status', title: 'Status', type: 'select', options: [{ label: 'Active', value: 'active' }] },
    ];

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Popover content should contain filter sections
    expect(screen.getByTestId('popover-content')).toBeInTheDocument();
  });

  it('renders filter chips when filters are active', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'email', title: 'Email', type: 'text' },
    ];

    // Mock table with active filter
    mockTable.getState = vi.fn(() => ({
      columnFilters: [{ id: 'email', value: 'test@example.com' }],
    })) as any;

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Should show active filter indicator
    expect(screen.getByText('Active:')).toBeInTheDocument();
    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('removes filter when X button clicked on filter chip', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'email', title: 'Email', type: 'text' },
    ];

    mockTable.getState = vi.fn(() => ({
      columnFilters: [{ id: 'email', value: 'test@example.com' }],
    })) as any;

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Find and click the X button on the filter chip
    const xButtons = screen.getAllByTestId('x-icon');
    fireEvent.click(xButtons[0].closest('button')!);

    expect(mockColumn.setFilterValue).toHaveBeenCalledWith(undefined);
  });

  it('shows filter count badge when filters are active', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'email', title: 'Email', type: 'text' },
      { id: 'phone', title: 'Phone', type: 'text' },
    ];

    mockTable.getState = vi.fn(() => ({
      columnFilters: [
        { id: 'email', value: 'test@example.com' },
        { id: 'phone', value: '123456' },
      ],
    })) as any;

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Badge should show count
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('does not render filter popover when no searchable columns', () => {
    render(
      <DataTableToolbar table={mockTable as Table<any>} searchColumn="name" />,
    );

    // Should not show filter button
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('resets all filters when clear all is clicked', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'email', title: 'Email', type: 'text' },
      { id: 'phone', title: 'Phone', type: 'text' },
    ];

    mockTable.getState = vi.fn(() => ({
      columnFilters: [
        { id: 'email', value: 'test@example.com' },
        { id: 'phone', value: '123456' },
      ],
    })) as any;

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Click Reset button in filter chips area (only shows when >1 filter)
    const resetButtons = screen.getAllByText('Reset');
    fireEvent.click(resetButtons[resetButtons.length - 1]);

    expect(mockTable.resetColumnFilters).toHaveBeenCalled();
  });

  it('renders date range filter for date-range type', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'createdAt', title: 'Created At', type: 'date-range' },
    ];

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Date picker should be in popover content
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  it('handles no searchable columns gracefully', () => {
    render(<DataTableToolbar table={mockTable as Table<any>} />);

    // Should not crash, just render empty toolbar
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('uses first searchableColumn as primary when searchColumn not provided', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'title', title: 'Title', type: 'text' },
      { id: 'description', title: 'Description', type: 'text' },
    ];

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
      />,
    );

    // Should use "title" as primary search
    expect(mockTable.getColumn).toHaveBeenCalledWith('title');
  });

  it('renders quick filters inline when quickFilterColumns provided', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name', type: 'text' },
      {
        id: 'status',
        title: 'Status',
        type: 'select',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ],
      },
    ];

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
        quickFilterColumns={['status']}
      />,
    );

    // Quick filter select should be rendered inline
    const selectTriggers = screen.getAllByTestId('select-trigger');
    expect(selectTriggers.length).toBeGreaterThan(0);
  });

  it('renders featured filters in a separate Featured section at the top', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'status', title: 'Status', type: 'select', options: [{ label: 'Active', value: 'active' }] },
      { id: 'created_at', title: 'Created At', type: 'date-range' },
    ];

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
        featuredFilterColumns={['status', 'created_at']}
      />,
    );

    const popoverContent = screen.getByTestId('popover-content');

    // Featured section should be present
    expect(popoverContent).toHaveTextContent('Featured');

    // Status and Created At should be in the featured section (we check existence first)
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Created At')).toBeInTheDocument();
  });

  it('excludes featured filters from their original type sections to avoid duplicates', () => {
    const searchableColumns: SearchableColumn[] = [
      { id: 'name', title: 'Name', type: 'text' },
      { id: 'status', title: 'Status', type: 'select', options: [{ label: 'Active', value: 'active' }] },
      { id: 'priority', title: 'Priority', type: 'select', options: [{ label: 'High', value: 'high' }] },
    ];

    render(
      <DataTableToolbar
        table={mockTable as Table<any>}
        searchableColumns={searchableColumns}
        featuredFilterColumns={['status']}
      />,
    );

    // Status should be present (in Featured)
    const statusLabels = screen.getAllByText('Status');
    expect(statusLabels.length).toBe(1);

    // Priority should be present (in Select Filters)
    const priorityLabels = screen.getAllByText('Priority');
    expect(priorityLabels.length).toBe(1);

    // Verify structure implies separation if possible, but count check is good for de-duplication
  });
});
