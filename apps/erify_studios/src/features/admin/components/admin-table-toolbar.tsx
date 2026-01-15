'use client';

import type { Table } from '@tanstack/react-table';
import { Plus, X } from 'lucide-react';
import * as React from 'react';

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
} from '@eridu/ui';

import * as m from '@/paraglide/messages.js';

type AdminTableToolbarProps<TData> = {
  table: Table<TData>;
  searchColumn?: string;
  searchableColumns?: { id: string; title: string }[];
  searchPlaceholder?: string;
};

export function AdminTableToolbar<TData>({
  table,
  searchColumn,
  searchableColumns,
  searchPlaceholder,
}: AdminTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Use either the single searchColumn (legacy) or the first of searchableColumns as primary
  const primaryColumnId = searchColumn ?? searchableColumns?.[0]?.id;
  const primaryColumn = primaryColumnId ? table.getColumn(primaryColumnId) : null;

  // Track additional active filters (excluding primary)
  const [activeFilterIds, setActiveFilterIds] = React.useState<string[]>([]);

  // Initialize active filters from table state (e.g. URL state)
  React.useEffect(() => {
    const initializedFilters = table.getState().columnFilters.map((f) => f.id).filter((id) => id !== primaryColumnId && searchableColumns?.some((c) => c.id === id));

    if (initializedFilters.length > 0) {
      setActiveFilterIds((prev) => Array.from(new Set([...prev, ...initializedFilters])));
    }
  }, [table, primaryColumnId, searchableColumns]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2">
        {/* Primary Search Input */}
        {primaryColumn && (
          <FilterInput
            column={primaryColumn}
            placeholder={searchPlaceholder ?? m['admin.searchPlaceholder']()}
            className="h-9 w-full sm:w-[200px] lg:w-[300px]"
          />
        )}

        {/* Additional Filter Inputs */}
        {activeFilterIds.map((filterId) => {
          const column = table.getColumn(filterId);
          const colDef = searchableColumns?.find((c) => c.id === filterId);
          if (!column || !colDef)
            return null;

          return (
            <FilterInput
              key={filterId}
              column={column}
              placeholder={`Filter by ${colDef.title}...`}
              className="h-9 w-full sm:w-[200px]"
            />
          );
        })}

        {/* Add Filter Button */}
        {searchableColumns && searchableColumns.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-dashed">
                <Plus className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[150px]">
              {searchableColumns
                .filter((col) => col.id !== primaryColumnId)
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={activeFilterIds.includes(col.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setActiveFilterIds((prev) => [...prev, col.id]);
                      } else {
                        setActiveFilterIds((prev) => prev.filter((id) => id !== col.id));
                        table.getColumn(col.id)?.setFilterValue(undefined);
                      }
                    }}
                  >
                    {col.title}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Reset Button */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              setActiveFilterIds([]);
            }}
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

function FilterInput({ column, placeholder, className }: { column: any; placeholder: string; className?: string }) {
  const columnFilterValue = column.getFilterValue();
  const [value, setValue] = React.useState((columnFilterValue as string) ?? '');

  React.useEffect(() => {
    setValue((columnFilterValue as string) ?? '');
  }, [columnFilterValue]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (column.getFilterValue() !== value) {
        column.setFilterValue(value || undefined);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [value, column]);

  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={className}
    />
  );
}
