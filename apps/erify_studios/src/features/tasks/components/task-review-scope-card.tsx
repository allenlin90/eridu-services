import type { DateRange } from 'react-day-picker';

import { Button, Card, CardDescription, CardHeader, CardTitle, DatePickerWithRange } from '@eridu/ui';

import * as m from '@/paraglide/messages';

type TaskReviewScopeCardProps = {
  dateRange: DateRange | undefined;
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  onResetDateRange: () => void;
};

/** Primary show-date scope for the task submission review queue. */
export function TaskReviewScopeCard({ dateRange, onDateRangeChange, onResetDateRange }: TaskReviewScopeCardProps) {
  return (
    <Card className="border-muted/60 dark:border-muted/30">
      <CardHeader className="gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{m.task_review_qc_show_date_title()}</CardTitle>
          <CardDescription>
            {m.task_review_qc_show_date_description()}
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <DatePickerWithRange className="sm:w-72" date={dateRange} setDate={onDateRangeChange} />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button type="button" variant="outline" size="sm" onClick={onResetDateRange}>{m.task_review_qc_today()}</Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
