import type { StudioShow } from '../api/get-studio-shows';

import { ShowActualsForm } from './show-actuals-form';

import { ResponsiveDialog } from '@/components/responsive-dialog';

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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Show Actuals"
      description={show?.name ?? 'Record actual show start and end time.'}
      contentClassName="sm:max-w-[560px]"
      mobileBodyClassName="pb-4"
    >
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
    </ResponsiveDialog>
  );
}
