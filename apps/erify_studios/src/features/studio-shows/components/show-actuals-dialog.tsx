import { useState } from 'react';

import {
  Button,
  DateTimePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@eridu/ui';

import type { StudioShow } from '../api/get-studio-shows';
import { useUpdateStudioShow } from '../api/update-studio-show';

type ShowActualsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  show: StudioShow | null;
  onSaved?: () => void;
};

type ShowActualsDialogFormProps = {
  studioId: string;
  show: StudioShow;
  onSaved: () => void;
};

function ShowActualsDialogForm({
  studioId,
  show,
  onSaved,
}: ShowActualsDialogFormProps) {
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
    onSaved();
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
          <DateTimePicker
            value={actualStartTime}
            onChange={setActualStartTime}
            className="w-full"
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
          <DateTimePicker
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

      <DialogFooter>
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
      </DialogFooter>
    </div>
  );
}

export function ShowActualsDialog({
  open,
  onOpenChange,
  studioId,
  show,
  onSaved,
}: ShowActualsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Show Actuals</DialogTitle>
          <DialogDescription>
            {show?.name ?? 'Record actual show start and end time.'}
          </DialogDescription>
        </DialogHeader>

        {show && (
          <ShowActualsDialogForm
            key={`${show.id}:${show.actual_start_time ?? ''}:${show.actual_end_time ?? ''}`}
            studioId={studioId}
            show={show}
            onSaved={() => {
              onOpenChange(false);
              onSaved?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
