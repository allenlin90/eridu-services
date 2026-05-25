import { Calendar, RefreshCw } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button, DatePickerWithRange } from '@eridu/ui';

export type CompensationsToolbarProps = {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onRefresh: () => void;
  isFetching: boolean;
  isQueryEnabled: boolean;
};

export function CompensationsToolbar({
  dateRange,
  onDateRangeChange,
  onRefresh,
  isFetching,
  isQueryEnabled,
}: CompensationsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-900/40 p-4 border border-slate-800/80 rounded-xl backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-400" />
        <DatePickerWithRange date={dateRange} setDate={onDateRangeChange} />
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 border-slate-800 bg-slate-900/60 hover:bg-slate-800"
        onClick={onRefresh}
        disabled={isFetching || !isQueryEnabled}
        aria-label="Refresh compensations"
      >
        <RefreshCw className={`h-4 w-4 text-slate-300 ${isFetching ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
