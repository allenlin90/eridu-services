import { ArrowLeft } from 'lucide-react';

import { Badge, Button } from '@eridu/ui';

import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import {
  formatDate,
  getShiftWindowLabel,
} from '@/features/studio-shifts/utils/shift-form.utils';
import { toCurrencyDisplayString } from '@/lib/decimal-format';

type ShiftDetailHeaderProps = {
  studioId: string;
  shift?: StudioShift;
  isLoading: boolean;
};

export function ShiftDetailHeader({
  studioId: _studioId,
  shift,
  isLoading,
}: ShiftDetailHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Back"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">
            {isLoading && !shift ? 'Loading shift...' : (shift?.user_name ?? 'Shift')}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {shift ? getShiftWindowLabel(shift) : 'Studio shift profile and compensation'}
          </p>
        </div>
      </div>

      {shift
        ? (
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">Shift Profile</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{formatDate(shift.date)}</Badge>
                <Badge variant="outline">{shift.status}</Badge>
                {shift.is_duty_manager
                  ? <Badge variant="secondary">Duty Manager</Badge>
                  : null}
                <Badge variant="outline">
                  {toCurrencyDisplayString(shift.hourly_rate)}
                  {' '}
                  / hr
                </Badge>
                <Badge variant="outline">
                  {toCurrencyDisplayString(shift.planned_cost)}
                  {' '}
                  planned
                </Badge>
                <Badge variant={shift.actual_cost === null ? 'outline' : 'secondary'}>
                  {shift.actual_cost === null
                    ? 'Actual pending'
                    : `${toCurrencyDisplayString(shift.actual_cost)} actual`}
                </Badge>
              </div>
            </div>
          )
        : null}
    </div>
  );
}
