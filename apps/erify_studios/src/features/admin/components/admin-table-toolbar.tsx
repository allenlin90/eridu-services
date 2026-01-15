'use client';

import type { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import * as React from 'react';

import { Button, Input } from '@eridu/ui';

import * as m from '@/paraglide/messages.js';

type AdminTableToolbarProps<TData> = {
  table: Table<TData>;
  searchColumn?: string;
  searchPlaceholder?: string;
};

export function AdminTableToolbar<TData>({
  table,
  searchColumn,
  searchPlaceholder,
}: AdminTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const column = searchColumn ? table.getColumn(searchColumn) : null;

  // Local state for debouncing
  const [searchValue, setSearchValue] = React.useState(
    (column?.getFilterValue() as string) ?? '',
  );

  const externalValue = (column?.getFilterValue() as string) ?? '';

  // Sync local state with table state (e.g. on reset)
  React.useEffect(() => {
    setSearchValue(externalValue);
  }, [externalValue]);

  // Debounced update of table filter
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const currentColumn = searchColumn ? table.getColumn(searchColumn) : null;
      if (currentColumn && currentColumn.getFilterValue() !== searchValue) {
        currentColumn.setFilterValue(searchValue || undefined);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeout);
  }, [searchValue, searchColumn, table]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2">
        {column && (
          <Input
            placeholder={searchPlaceholder ?? m['admin.searchPlaceholder']()}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            className="h-9 w-full sm:w-[200px] lg:w-[300px]"
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-9 px-2 lg:px-3"
          >
            {m['admin.resetButton']()}
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
