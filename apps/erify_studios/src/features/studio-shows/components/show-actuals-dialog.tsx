import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import type { StudioShow } from '../api/get-studio-shows';

import { ShowActualsForm } from './show-actuals-form';

type ShowActualsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  show: StudioShow | null;
  onSaved?: () => void;
};

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
          <ShowActualsForm
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
