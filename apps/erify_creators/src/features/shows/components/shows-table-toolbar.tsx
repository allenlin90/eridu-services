'use client';

import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import type { Table } from '@tanstack/react-table';
import { RotateCw, X } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Button, DatePickerWithRange, Input } from '@eridu/ui';

import { queryKeys } from '@/lib/api/query-keys';
import * as m from '@/paraglide/messages.js';

type ShowsTableToolbarProps<TData> = {
  table: Table<TData>;
};

export function ShowsTableToolbar<TData>({
  table,
}: ShowsTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const dateRange = (table.getColumn('start_time')?.getFilterValue() as DateRange) || undefined;

  // Local state for buffering date selection
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(dateRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  // Sync local state with table state when not editing
  React.useEffect(() => {
    if (!isDatePickerOpen) {
      setTempDate(dateRange);
    }
  }, [dateRange, isDatePickerOpen]);

  const handleDatePickerOpenChange = (open: boolean) => {
    setIsDatePickerOpen(open);
    if (!open) {
      // Commit changes when closing
      table.getColumn('start_time')?.setFilterValue(tempDate);
    }
  };

  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: queryKeys.shows.lists() }) > 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shows.lists() });
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2">
        <Input
          placeholder={m['shows.searchPlaceholder']()}
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)}
          className="h-9 w-full sm:w-[200px] lg:w-[300px]"
        />
        <div className="w-full sm:w-auto">
          <DatePickerWithRange
            date={tempDate}
            setDate={setTempDate}
            open={isDatePickerOpen}
            onOpenChange={handleDatePickerOpenChange}
          />
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-9 px-2 lg:px-3"
          >
            {m['shows.resetButton']()}
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="ml-auto h-9"
        onClick={handleRefresh}
        disabled={isFetching}
      >
        <RotateCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        {m['shows.refresh']?.() ?? 'Refresh'}
      </Button>
    </div>
  );
}
