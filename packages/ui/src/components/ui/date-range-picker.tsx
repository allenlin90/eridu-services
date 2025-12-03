'use client';

import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@eridu/ui/components/ui/button';
import { Calendar } from '@eridu/ui/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@eridu/ui/components/ui/popover';
import { cn } from '@eridu/ui/lib/utils';

export function DatePickerWithRange({
  className,
  date,
  setDate,
  open,
  onOpenChange,
}: {
  className?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from
              ? (
                  date.to
                    ? (
                        <>
                          {format(date.from, 'LLL dd, y')}
                          {' '}
                          -
                          {' '}
                          {format(date.to, 'LLL dd, y')}
                        </>
                      )
                    : (
                        format(date.from, 'LLL dd, y')
                      )
                )
              : (
                  <span>Pick a date range</span>
                )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
