import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';

import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';

import { cn } from '../lib/utils';

import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

export function DatePicker({ value, onChange, className }: { value: string; onChange: (val: string) => void; className?: string }) {
  // value is ISO string YYYY-MM-DD
  const date = value ? new Date(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : '')}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function useDateTimeState(value: string, onChange: (val: string) => void) {
  const date = value ? new Date(value) : undefined;
  const [time, setTime] = useState(date ? format(date, 'HH:mm') : '09:00');

  useEffect(() => {
    setTime(date ? format(date, 'HH:mm') : '09:00');
  }, [value, date]);

  const applyTimeToDate = (baseDate: Date, nextTime: string) => {
    const parts = nextTime.split(':');
    if (parts.length !== 2) {
      return null;
    }
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }
    const nextDate = new Date(baseDate);
    nextDate.setHours(hours, minutes, 0, 0);
    return nextDate;
  };

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) {
      onChange('');
      return;
    }
    const nextDate = applyTimeToDate(d, time);
    if (nextDate) {
      onChange(nextDate.toISOString());
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    if (date) {
      const newDate = applyTimeToDate(date, newTime);
      if (newDate) {
        onChange(newDate.toISOString());
      }
    }
  };

  const handleNow = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    onChange(now.toISOString());
    setTime(format(now, 'HH:mm'));
  };

  return { date, time, handleDateSelect, handleTimeChange, handleNow };
}

type DateTimePickerBodyProps = {
  date: Date | undefined;
  time: string;
  onDateSelect: (d: Date | undefined) => void;
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNow: () => void;
  layout?: 'popover' | 'drawer';
};

function DateTimePickerBody({
  date,
  time,
  onDateSelect,
  onTimeChange,
  onNow,
  layout = 'popover',
}: DateTimePickerBodyProps) {
  const isDrawer = layout === 'drawer';
  return (
    <>
      <div className={cn(isDrawer && 'flex justify-center')}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateSelect}
          initialFocus={!isDrawer}
        />
      </div>
      <div className={cn('border-t border-border p-3', isDrawer && 'mx-auto w-full max-w-xs')}>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs block">Time</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={onNow}
          >
            Now
          </Button>
        </div>
        <Input type="time" value={time} onChange={onTimeChange} className="w-full" />
      </div>
    </>
  );
}

type DateTimePickerProps = {
  value: string;
  onChange: (val: string) => void;
  className?: string;
};

export function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {
  const { date, time, handleDateSelect, handleTimeChange, handleNow } = useDateTimeState(value, onChange);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP p') : <span>Pick a date & time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <DateTimePickerBody
          date={date}
          time={time}
          onDateSelect={handleDateSelect}
          onTimeChange={handleTimeChange}
          onNow={handleNow}
        />
      </PopoverContent>
    </Popover>
  );
}

type ResponsiveDateTimePickerProps = DateTimePickerProps & {
  label?: string;
  description?: string;
};

export function ResponsiveDateTimePicker({
  value,
  onChange,
  className,
  label = 'Pick a date & time',
  description,
}: ResponsiveDateTimePickerProps) {
  const isMobile = useIsMobile();
  const { date, time, handleDateSelect, handleTimeChange, handleNow } = useDateTimeState(value, onChange);

  const triggerLabel = date ? format(date, 'PPP p') : label;

  if (!isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP p') : <span>{label}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <DateTimePickerBody
            date={date}
            time={time}
            onDateSelect={handleDateSelect}
            onTimeChange={handleTimeChange}
            onNow={handleNow}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP p') : <span>{label}</span>}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{label}</DrawerTitle>
          {description
            ? <DrawerDescription>{description}</DrawerDescription>
            : <DrawerDescription className="sr-only">{triggerLabel}</DrawerDescription>}
        </DrawerHeader>
        <DateTimePickerBody
          date={date}
          time={time}
          onDateSelect={handleDateSelect}
          onTimeChange={handleTimeChange}
          onNow={handleNow}
          layout="drawer"
        />
        <DrawerFooter>
          <DrawerClose asChild>
            <Button type="button">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
