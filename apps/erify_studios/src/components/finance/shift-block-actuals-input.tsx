import { useState } from 'react';

import { Button, Label, ResponsiveDateTimePicker } from '@eridu/ui';

import type { StudioShiftBlock } from '@/features/studio-shifts/api/studio-shifts.types';
import type { UpdateStudioShiftBlockPayload } from '@/features/studio-shifts/api/update-studio-shift-block';

type ShiftBlockActualsInputProps = {
  block: StudioShiftBlock;
  isSubmitting?: boolean;
  onSubmit: (payload: Pick<UpdateStudioShiftBlockPayload, 'actual_start_time' | 'actual_end_time'>) => Promise<void> | void;
};

export function ShiftBlockActualsInput({
  block,
  isSubmitting = false,
  onSubmit,
}: ShiftBlockActualsInputProps) {
  const [actualStartTime, setActualStartTime] = useState(block.actual_start_time ?? '');
  const [actualEndTime, setActualEndTime] = useState(block.actual_end_time ?? '');

  const hasInvertedRange = Boolean(
    actualStartTime
    && actualEndTime
    && new Date(actualEndTime).getTime() <= new Date(actualStartTime).getTime(),
  );

  const handleSubmit = async () => {
    await onSubmit({
      actual_start_time: actualStartTime || null,
      actual_end_time: actualEndTime || null,
    });
  };

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${block.id}-actual-start`}>Actual Start</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setActualStartTime('')}
              disabled={isSubmitting}
              aria-label="Clear actual start"
            >
              Clear
            </Button>
          </div>
          <ResponsiveDateTimePicker
            value={actualStartTime}
            onChange={setActualStartTime}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${block.id}-actual-end`}>Actual End</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setActualEndTime('')}
              disabled={isSubmitting}
              aria-label="Clear actual end"
            >
              Clear
            </Button>
          </div>
          <ResponsiveDateTimePicker
            value={actualEndTime}
            onChange={setActualEndTime}
            className="w-full"
          />
        </div>
      </div>

      {hasInvertedRange && (
        <p className="text-xs font-medium text-destructive">
          Actual end time must be after actual start time.
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setActualStartTime('');
            setActualEndTime('');
          }}
          disabled={isSubmitting}
          aria-label="Clear actuals"
        >
          Clear actuals
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || hasInvertedRange}
        >
          Save actuals
        </Button>
      </div>
    </div>
  );
}
