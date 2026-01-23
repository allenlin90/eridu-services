import { ShowUpdateDialog } from './show-update-dialog';

import { DeleteConfirmDialog } from '@/features/admin/components';

// Re-export components for backward compatibility
export { ShowUpdateDialog };

type ShowDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function ShowDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: ShowDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Show"
      description="Are you sure you want to delete this show? This action cannot be undone."
      isLoading={isLoading}
    />
  );
}
