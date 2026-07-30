import { endOfMonth, endOfQuarter, format, startOfMonth, startOfQuarter, subDays } from 'date-fns';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { Button, DatePickerWithRange, Label } from '@eridu/ui';

import { useSceneQcPeriodReportQuery } from '../api/get-scene-qc-period-report';
import type { SceneQcSearch } from '../config/scene-qc-search-schema';

import { SceneQcPeriodReportView } from './scene-qc-period-report-view';

type Props = {
  studioId: string;
  search: SceneQcSearch;
  onSearchChange: (next: Partial<SceneQcSearch>) => void;
};

function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function SceneQcReportsWorkspace({ studioId, search, onSearchChange }: Props) {
  const today = new Date();
  const dateFrom = search.date_from ?? dateKey(subDays(today, 6));
  const dateTo = search.date_to ?? dateKey(today);
  const [rangeOpen, setRangeOpen] = useState(false);
  const report = useSceneQcPeriodReportQuery(studioId, dateFrom, dateTo);
  const range: DateRange = {
    from: new Date(`${dateFrom}T00:00:00`),
    to: new Date(`${dateTo}T00:00:00`),
  };

  const setRange = (from: Date, to: Date) => {
    onSearchChange({ date_from: dateKey(from), date_to: dateKey(to) });
  };

  return (
    <div className="space-y-4">
      <div className="scene-qc-print-hide flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setRange(subDays(today, 6), today)}>Week</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setRange(startOfMonth(today), endOfMonth(today))}>Month</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setRange(startOfQuarter(today), endOfQuarter(today))}>Quarter</Button>
        </div>
        <div className="min-w-64 space-y-1">
          <Label>Custom range</Label>
          <DatePickerWithRange
            date={range}
            open={rangeOpen}
            onOpenChange={setRangeOpen}
            setDate={(next) => {
              if (next?.from && next.to) {
                setRange(next.from, next.to);
                setRangeOpen(false);
              }
            }}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print / Save PDF
        </Button>
      </div>

      <div className="scene-qc-print-report-header hidden">
        <h1 className="text-xl font-semibold">Scene QC Report</h1>
        <p>
          {dateFrom}
          {' '}
          to
          {' '}
          {dateTo}
        </p>
      </div>
      <SceneQcPeriodReportView report={report.data} isLoading={report.isLoading} isError={report.isError} />
    </div>
  );
}
