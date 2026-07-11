import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DataTable } from '../data-table-core';

type Row = { id: string; label: string };

const columns = [
  { id: 'label', header: 'Label', cell: ({ row }: { row: { original: Row } }) => row.original.label },
];

const rows: Row[] = [
  { id: 'a', label: 'Row A' },
  { id: 'b', label: 'Row B' },
];

describe('dataTable getRowClassName', () => {
  afterEach(() => {
    cleanup();
  });

  it('applies the returned className to each row when provided', () => {
    render(
      <DataTable
        data={rows}
        columns={columns as any}
        getRowClassName={(row) => (row.id === 'b' ? 'opacity-50' : undefined)}
      />,
    );
    const allRows = screen.getAllByRole('row');
    // First row is header, second is Row A, third is Row B
    const rowA = allRows[1];
    const rowB = allRows[2];
    expect(rowA).not.toHaveClass('opacity-50');
    expect(rowB).toHaveClass('opacity-50');
  });

  it('renders rows with no extra classes when getRowClassName is omitted', () => {
    render(<DataTable data={rows} columns={columns as any} />);
    const allRows = screen.getAllByRole('row');
    const rowA = allRows[1];
    expect(rowA).not.toHaveClass('opacity-50');
  });
});
