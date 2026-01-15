import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminTable } from '../admin-table';

// Mock UI components
vi.mock('@eridu/ui', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  Button: ({ children, onClick, disabled, type }: any) => (
    <button onClick={onClick} disabled={disabled} type={type || 'button'}>
      {children}
    </button>
  ),
  Input: (props: any) => <input {...props} />,
  flexRender: (Comp: any, props: any) => (typeof Comp === 'function' ? Comp(props) : Comp),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span>ChevronLeft</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  ChevronsLeft: () => <span>ChevronsLeft</span>,
  ChevronsRight: () => <span>ChevronsRight</span>,
  Loader2: () => <span>Loading...</span>,
  Pencil: () => <span>Edit</span>,
  Trash2: () => <span>Delete</span>,
  X: () => <span>X</span>,
}));

// Mock i18n messages
vi.mock('@/paraglide/messages.js', () => {
  const messages = {
    'admin.searchPlaceholder': () => 'Search...',
    'admin.resetButton': () => 'Reset',
  };
  return {
    ...messages,
    m: messages,
  };
});

describe('adminTable', () => {
  const data = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
  ];

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info: any) => info.getValue(),
    },
  ];

  it('renders data correctly', () => {
    render(<AdminTable data={data} columns={columns} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<AdminTable data={[]} columns={columns} emptyMessage="No items found" />);

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<AdminTable data={[]} columns={columns} isLoading />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders pagination controls when pagination prop is provided', () => {
    const onPaginationChange = vi.fn();
    const pagination = {
      pageIndex: 0,
      pageSize: 10,
      total: 20,
      pageCount: 2,
    };

    render(
      <AdminTable
        data={data}
        columns={columns}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />,
    );

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Rows per page')).toBeInTheDocument();
  });

  it('renders actions column when onEdit/onDelete provided', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <AdminTable
        data={data}
        columns={columns}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    // Should find edit/delete buttons/icons
    expect(screen.getAllByText('Edit')).toHaveLength(2);
    expect(screen.getAllByText('Delete')).toHaveLength(2);
  });
});
