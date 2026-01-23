import type { z } from 'zod';

import type { updateShowInputSchema } from '@eridu/api-types/shows';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@eridu/ui';

import { ShowUpdateForm } from './show-update-form';

import type { Show } from '@/features/shows/api/get-shows';

type ShowUpdateDialogProps = {
  show: Show | null;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: z.infer<typeof updateShowInputSchema>) => void;
  isLoading?: boolean;
};

export function ShowUpdateDialog({
  show,
  onOpenChange,
  onSubmit,
  isLoading,
}: ShowUpdateDialogProps) {
  return (
    <Dialog open={!!show} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Show</DialogTitle>
          <DialogDescription>Update show details</DialogDescription>
        </DialogHeader>
        <ShowUpdateForm
          show={show}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
