"use client";
import type { DateRange, SelectRangeEventHandler } from "react-day-picker";

import { addDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@eridu/ui/components/button";
import { Calendar } from "@eridu/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@eridu/ui/components/popover";
import { cn } from "@eridu/ui/lib/utils";

const DAYS_IN_ADVANCE = 20;

type DatePickerWithRangeProps = {
  defaultDays?: number;
  initialDateRange?: DateRange;
  onSelect?: SelectRangeEventHandler;
} & React.HTMLAttributes<HTMLDivElement>;

export function DatePickerWithRange({
  defaultDays = DAYS_IN_ADVANCE,
  initialDateRange,
  onSelect,
  className,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(initialDateRange ?? {
    from: new Date(),
    to: addDays(new Date(), defaultDays),
  });

  const onSelectRange = React.useCallback<SelectRangeEventHandler>((...args) => {
    onSelect?.(...args);
    const [dateRange] = args;
    setDate(dateRange);
  }, [onSelect]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon />
            {date?.from
              ? (
                  date.to
                    ? (
                        <>
                          {format(date.from, "dd-LLL-yyyy")}
                          &nbsp;-&nbsp;
                          {format(date.to, "dd-LLL-yyyy")}
                        </>
                      )
                    : (
                        format(date.from, "dd-LLL-yyyy")
                      )
                )
              : (
                  <span>Pick a date</span>
                )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onSelectRange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
