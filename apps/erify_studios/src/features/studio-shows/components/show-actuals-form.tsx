import { useState } from 'react';

import {
  Button,
  Label,
  ResponsiveDateTimePicker,
} from '@eridu/ui';

import { useUpdateStudioShow } from '../api/update-studio-show';

/**
 * Minimal structural shape the form reads. Both the list `StudioShow`
 * (`ShowWithTaskSummaryDto`) and the detail `StudioShowDetail` satisfy it, so the
 * form is shared by the task-setup `ShowActualsDialog` quick-action and the
 * `/studios/:studioId/shows/:showId/actuals` tab.
 */
export type ShowActualsTarget = {
  id: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
};

type ShowActualsFormProps = {
  studioId: string;
  show: ShowActualsTarget;
  onSaved?: () => void;
};

export function ShowActualsForm({
  studioId,
  show,
  onSaved,
}: ShowActualsFormProps) {
  const [actualStartTime, setActualStartTime] = useState(show.actual_start_time ?? '');
  const [actualEndTime, setActualEndTime] = useState(show.actual_end_time ?? '');
  const updateShow = useUpdateStudioShow(studioId);

  const hasInvertedRange = Boolean(
    actualStartTime
    && actualEndTime
    && new Date(actualEndTime).getTime() <= new Date(actualStartTime).getTime(),
  );

  const handleSubmit = async () => {
    await updateShow.mutateAsync({
      showId: show.id,
      data: {
        actual_start_time: actualStartTime || null,
        actual_end_time: actualEndTime || null,
      },
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${show.id}-actual-start`}>Actual Start</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setActualStartTime('')}
              disabled={updateShow.isPending}
              aria-label="Clear show actual start"
            >
              Clear
            </Button>
          </div>
          <ResponsiveDateTimePicker
            value={actualStartTime}
            onChange={setActualStartTime}
            className="w-full"
            label="Actual start"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${show.id}-actual-end`}>Actual End</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setActualEndTime('')}
              disabled={updateShow.isPending}
              aria-label="Clear show actual end"
            >
              Clear
            </Button>
          </div>
          <ResponsiveDateTimePicker
            value={actualEndTime}
            onChange={setActualEndTime}
            className="w-full"
            label="Actual end"
          />
        </div>
      </div>

      {hasInvertedRange && (
        <p className="text-xs font-medium text-destructive">
          Actual end time must be after actual start time.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setActualStartTime('');
            setActualEndTime('');
          }}
          disabled={updateShow.isPending}
        >
          Clear actuals
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={updateShow.isPending || hasInvertedRange}
        >
          Save actuals
        </Button>
      </div>
    </div>
  );
}
