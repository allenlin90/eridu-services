'use client';

import type { Column } from '@tanstack/react-table';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import {
  DatePickerWithRange,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import type { SearchableColumn } from './types';

type QuickFiltersProps<TData> = {
  table: { getColumn: (id: string) => Column<TData, unknown> | undefined };
  columns: SearchableColumn[];
};

/**
 * Inline quick filters for frequently-used columns
 * Renders select dropdowns and date pickers inline
 */
export function QuickFilters<TData>({ table, columns }: QuickFiltersProps<TData>) {
  if (columns.length === 0)
    return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {columns.map((config) => {
        const column = table.getColumn(config.id);
        if (!column)
          return null;

        if (config.type === 'select' && config.options?.length) {
          return (
            <QuickSelectFilter
              key={config.id}
              column={column}
              config={config}
            />
          );
        }

        if (config.type === 'date-range') {
          return (
            <QuickDateFilter
              key={config.id}
              column={column}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

function QuickSelectFilter<TData>({
  column,
  config,
}: {
  column: Column<TData, unknown>;
  config: SearchableColumn;
}) {
  const value = (column.getFilterValue() as string) ?? '';

  return (
    <Select
      value={value}
      onValueChange={(val) => column.setFilterValue(val || undefined)}
    >
      <SelectTrigger className="h-9 w-auto min-w-28 max-w-40 text-sm">
        <SelectValue placeholder={config.title} />
      </SelectTrigger>
      <SelectContent>
        {config.options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function QuickDateFilter<TData>({
  column,
}: {
  column: Column<TData, unknown>;
}) {
  const filterValue = column.getFilterValue() as DateRange | undefined;
  const [date, setDate] = React.useState<DateRange | undefined>(filterValue);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setDate(filterValue);
    }
  }, [filterValue, isOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && date) {
      if (date.to) {
        const adjustedTo = new Date(date.to);
        adjustedTo.setHours(23, 59, 59, 999);
        column.setFilterValue({ ...date, to: adjustedTo });
      } else {
        column.setFilterValue(date);
      }
    }
  };

  return (
    <div className="w-auto">
      <DatePickerWithRange
        date={date}
        setDate={setDate}
        open={isOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
