'use client';

import type { Column, Table } from '@tanstack/react-table';
import { Plus, X } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import {
  Button,
  DatePickerWithRange,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '@eridu/ui';

import * as m from '@/paraglide/messages.js';

export type SearchableColumn = {
  id: string;
  title: string;
  type?: 'text' | 'date-range';
};

type AdminTableToolbarProps<TData> = {
  table: Table<TData>;
  searchColumn?: string;
  searchableColumns?: SearchableColumn[];
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

  // Sync active filters from table state (including primary and dynamic)
  const activeFilterIds = React.useMemo(() => {
    return table.getState().columnFilters.map((f) => f.id).filter((id) => id !== primaryColumnId && searchableColumns?.some((c) => c.id === id));
  }, [table, primaryColumnId, searchableColumns]);

  // Track filters that were manually added by user via "Add Filter" but don't have a value yet
  const [manuallyAddedIds, setManuallyAddedIds] = React.useState<string[]>([]);

  // Clear manually added IDs when filters are changed (if they got values, they are now in activeFilterIds)
  React.useEffect(() => {
    const currentFilters = table.getState().columnFilters;
    setManuallyAddedIds((prev) => prev.filter((id) => !currentFilters.some((f) => f.id === id)));
  }, [table]);

  // All visible secondary filter IDs
  const visibleSecondaryIds = Array.from(new Set([...activeFilterIds, ...manuallyAddedIds]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:flex-wrap">
        {/* Primary Search Input */}
        {primaryColumn && (
          <div className="flex items-center gap-2">
            <FilterInput
              column={primaryColumn}
              placeholder={searchPlaceholder ?? m['admin.searchPlaceholder']()}
              className="h-9 w-full sm:w-[200px] lg:w-[300px]"
            />
          </div>
        )}

        {/* Additional Filter Inputs */}
        {visibleSecondaryIds.map((filterId) => {
          const column = table.getColumn(filterId);
          const colDef = searchableColumns?.find((c) => c.id === filterId);
          if (!column || !colDef)
            return null;

          const handleRemove = () => {
            column.setFilterValue(undefined);
            setManuallyAddedIds((prev) => prev.filter((id) => id !== filterId));
          };

          if (colDef.type === 'date-range') {
            return (
              <div key={filterId} className="flex items-center gap-1 group">
                <DateRangeFilter column={column} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          }

          return (
            <div key={filterId} className="flex items-center gap-1 group">
              <FilterInput
                column={column}
                placeholder={`Filter by ${colDef.title}...`}
                className="h-9 w-full sm:w-[200px]"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        {/* Add Filter Button */}
        {searchableColumns && searchableColumns.length > visibleSecondaryIds.length + (primaryColumnId ? 1 : 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-dashed">
                <Plus className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[150px]">
              {searchableColumns
                .filter((col) => col.id !== primaryColumnId && !visibleSecondaryIds.includes(col.id))
                .map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    onClick={() => {
                      setManuallyAddedIds((prev) => [...prev, col.id]);
                    }}
                  >
                    {col.title}
                  </DropdownMenuItem>
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
              setManuallyAddedIds([]);
            }}
            className="h-9 px-2 lg:px-3 text-muted-foreground"
          >
            {m['admin.resetButton']()}
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterInput<TData>({
  column,
  placeholder,
  className,
}: {
  column: Column<TData, unknown>;
  placeholder?: string;
  className?: string;
}) {
  const columnFilterValue = column.getFilterValue();
  const filterValue = typeof columnFilterValue === 'string' ? columnFilterValue : '';

  const [value, setValue] = React.useState<string>(filterValue);
  const [prevFilterValue, setPrevFilterValue] = React.useState<string>(filterValue);

  // Derived state pattern: Sync with external filter changes immediately
  if (filterValue !== prevFilterValue) {
    setValue(filterValue);
    setPrevFilterValue(filterValue);
  }

  // Debounce the filter value update
  React.useEffect(() => {
    const timer = setTimeout(() => {
      // Only update if value actually differs from current column filter
      if (value !== column.getFilterValue()) {
        column.setFilterValue(value || undefined);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, column]);

  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
      className={className}
    />
  );
}

function DateRangeFilter<TData>({ column }: { column: Column<TData, unknown> }) {
  const filterValue = column.getFilterValue() as DateRange | undefined;
  const [date, setDate] = React.useState<DateRange | undefined>(filterValue);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setDate(filterValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValue]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      column.setFilterValue(date);
    }
  };

  return (
    <div className="w-full sm:w-auto">
      <DatePickerWithRange
        date={date}
        setDate={(newDate: DateRange | undefined) => {
          if (newDate?.to) {
            const newTo = new Date(newDate.to);
            newTo.setHours(23, 59, 59, 999);
            setDate({ ...newDate, to: newTo });
          } else {
            setDate(newDate);
          }
        }}
        open={isOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
