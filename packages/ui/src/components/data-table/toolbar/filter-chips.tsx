'use client';

import { format } from 'date-fns';
import { X } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Badge, Button } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import type { ActiveFilter, FilterChipsProps } from './types';

/**
 * Display active filters as dismissible chips
 */
export function FilterChips<TData>({
  table,
  searchableColumns,
  primaryColumnId,
  onClearAll,
  resetButtonLabel = 'Reset',
}: FilterChipsProps<TData>) {
  const columnFilters = table.getState().columnFilters;

  // Build list of active filters for display
  const activeFilters = React.useMemo<ActiveFilter[]>(() => {
    return columnFilters
      .filter((f) => {
        // Exclude primary column - it's shown in the search input
        if (f.id === primaryColumnId)
          return false;
        // Exclude filters not declared as searchable columns
        const config = searchableColumns.find((c) => c.id === f.id);
        if (!config)
          return false;
        // Must have a value
        return f.value !== undefined && f.value !== '';
      })
      .map((f) => {
        const config = searchableColumns.find((c) => c.id === f.id);
        const title = config?.title || f.id;
        const type = config?.type || 'text';

        let displayValue: string;

        if (type === 'date-range') {
          const dateValue = f.value as DateRange | undefined;
          if (dateValue?.from && dateValue?.to) {
            displayValue = `${format(dateValue.from, 'MMM d')} - ${format(dateValue.to, 'MMM d')}`;
          } else if (dateValue?.from) {
            displayValue = `From ${format(dateValue.from, 'MMM d')}`;
          } else {
            displayValue = 'Date range';
          }
        } else if (type === 'select') {
          // For select, try to find the label
          const option = config?.options?.find((o) => o.value === f.value);
          displayValue = option?.label || String(f.value);
        } else {
          displayValue = String(f.value);
        }

        return {
          id: f.id,
          title,
          displayValue,
          type,
        };
      });
  }, [columnFilters, primaryColumnId, searchableColumns]);

  const handleRemoveFilter = (filterId: string) => {
    const column = table.getColumn(filterId);
    column?.setFilterValue(undefined);
  };

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground shrink-0">Active:</span>
      {activeFilters.map((filter) => (
        <Badge
          key={filter.id}
          variant="secondary"
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs font-normal',
            'hover:bg-secondary/80 transition-colors',
          )}
        >
          <span className="text-muted-foreground">
            {filter.title}
            :
          </span>
          <span className="font-medium max-w-32 truncate">{filter.displayValue}</span>
          <button
            type="button"
            onClick={() => handleRemoveFilter(filter.id)}
            className="ml-0.5 rounded-full hover:bg-muted p-0.5 -mr-1 cursor-pointer"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">
              Remove
              {filter.title}
              {' '}
              filter
            </span>
          </button>
        </Badge>
      ))}
      {activeFilters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {resetButtonLabel}
        </Button>
      )}
    </div>
  );
}
