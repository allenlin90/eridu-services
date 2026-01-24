'use client';

import type { Column, Table } from '@tanstack/react-table';
import { Filter, RotateCcw } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import {
  Badge,
  Button,
  DatePickerWithRange,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import type { FilterPopoverProps, SearchableColumn } from './types';

// Stable empty array reference to avoid re-renders
const EMPTY_ARRAY: string[] = [];

/**
 * Filter popover with organized filter sections by type
 */
export function FilterPopover<TData>({
  table,
  searchableColumns,
  excludeColumns = EMPTY_ARRAY,
  featuredColumns = EMPTY_ARRAY,
  onReset,
  activeFilterCount,
}: FilterPopoverProps<TData>) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Filter out excluded columns
  const availableColumns = searchableColumns.filter(
    (col) => !excludeColumns.includes(col.id),
  );

  // Group columns by type
  // Group columns by type, excluding featured ones from specific type groups
  // (Featured columns are shown at the top)
  const isAvailable = (col: SearchableColumn) => !featuredColumns.includes(col.id);

  const localFeaturedColumns = availableColumns.filter((col) => featuredColumns.includes(col.id));
  const textColumns = availableColumns.filter((col) => isAvailable(col) && (col.type === 'text' || !col.type));
  const selectColumns = availableColumns.filter((col) => isAvailable(col) && col.type === 'select');
  const dateColumns = availableColumns.filter((col) => isAvailable(col) && col.type === 'date-range');

  const hasFilters = localFeaturedColumns.length > 0 || textColumns.length > 0 || selectColumns.length > 0 || dateColumns.length > 0;

  if (!hasFilters) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-2 border-dashed',
            activeFilterCount > 0 && 'border-primary',
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-h-[70vh] overflow-y-auto p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-medium text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onReset();
                setIsOpen(false);
              }}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          )}
        </div>

        <div className="p-4 space-y-6">
          {/* Featured Filters Section */}
          {localFeaturedColumns.length > 0 && (
            <FilterSection title="Featured">
              {localFeaturedColumns.map((col) => (
                <FilterInputFactory
                  key={col.id}
                  table={table}
                  column={col}
                />
              ))}
            </FilterSection>
          )}

          {/* Text Filters Section */}
          {textColumns.length > 0 && (
            <FilterSection title="Text Filters">
              {textColumns.map((col) => (
                <TextFilterInput
                  key={col.id}
                  column={table.getColumn(col.id)}
                  config={col}
                />
              ))}
            </FilterSection>
          )}

          {/* Select Filters Section */}
          {selectColumns.length > 0 && (
            <FilterSection title="Select Filters">
              {selectColumns.map((col) => (
                <SelectFilterInput
                  key={col.id}
                  column={table.getColumn(col.id)}
                  config={col}
                />
              ))}
            </FilterSection>
          )}

          {/* Date Range Section */}
          {dateColumns.length > 0 && (
            <FilterSection title="Date Range">
              {dateColumns.map((col) => (
                <DateRangeFilterInput
                  key={col.id}
                  column={table.getColumn(col.id)}
                  config={col}
                />
              ))}
            </FilterSection>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Factory to render correct filter input based on type
 */
function FilterInputFactory<TData>({
  table,
  column,
}: {
  table: Table<TData>;
  column: SearchableColumn;
}) {
  const tableColumn = table.getColumn(column.id);

  if (column.type === 'select') {
    return (
      <SelectFilterInput
        column={tableColumn}
        config={column}
      />
    );
  }

  if (column.type === 'date-range') {
    return (
      <DateRangeFilterInput
        column={tableColumn}
        config={column}
      />
    );
  }

  // Default to text
  return (
    <TextFilterInput
      column={tableColumn}
      config={column}
    />
  );
}

/**
 * Section wrapper for filter groups
 */
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * Text filter input with debouncing
 */
function TextFilterInput<TData>({
  column,
  config,
}: {
  column: Column<TData, unknown> | undefined;
  config: SearchableColumn;
}) {
  const filterValue = (column?.getFilterValue() as string) ?? '';
  const [value, setValue] = React.useState(filterValue);
  const [prevFilterValue, setPrevFilterValue] = React.useState(filterValue);

  // Sync with external changes
  if (filterValue !== prevFilterValue) {
    setValue(filterValue);
    setPrevFilterValue(filterValue);
  }

  // Debounced update
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== column?.getFilterValue()) {
        column?.setFilterValue(value || undefined);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [value, column]);

  if (!column)
    return null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal">{config.title}</Label>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Filter by ${config.title.toLowerCase()}...`}
        className="h-8 text-sm"
      />
    </div>
  );
}

/**
 * Select filter input
 */
function SelectFilterInput<TData>({
  column,
  config,
}: {
  column: Column<TData, unknown> | undefined;
  config: SearchableColumn;
}) {
  const filterValue = (column?.getFilterValue() as string) ?? '';

  if (!column || !config.options?.length)
    return null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal">{config.title}</Label>
      <Select
        value={filterValue}
        onValueChange={(val) => column.setFilterValue(val || undefined)}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder={`Select ${config.title.toLowerCase()}...`} />
        </SelectTrigger>
        <SelectContent>
          {config.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Date range filter input
 */
function DateRangeFilterInput<TData>({
  column,
  config,
}: {
  column: Column<TData, unknown> | undefined;
  config: SearchableColumn;
}) {
  const filterValue = column?.getFilterValue() as DateRange | undefined;
  const [date, setDate] = React.useState<DateRange | undefined>(filterValue);
  const [isOpen, setIsOpen] = React.useState(false);

  // Sync with external changes
  React.useEffect(() => {
    if (!isOpen) {
      setDate(filterValue);
    }
  }, [filterValue, isOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && date) {
      // Adjust end date to end of day
      if (date.to) {
        const adjustedTo = new Date(date.to);
        adjustedTo.setHours(23, 59, 59, 999);
        column?.setFilterValue({ ...date, to: adjustedTo });
      } else {
        column?.setFilterValue(date);
      }
    }
  };

  if (!column)
    return null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal">{config.title}</Label>
      <DatePickerWithRange
        date={date}
        setDate={setDate}
        open={isOpen}
        onOpenChange={handleOpenChange}
      />
    </div>
  );
}
