import type { Studio } from "@/erify/types";

import { UpdateStudioForm } from "@/erify/admin/studios/components/forms/update-studio-form";
import { useRowActionStore } from "@/erify/admin/studios/stores/use-row-action-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";

type UpdateStudioDialogProps = {
  studio: Studio | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdateStudioDialog: React.FC<UpdateStudioDialogProps> = ({ studio, ...props }) => {
  const { closeDialog } = useRowActionStore();

  if (!studio) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update studio</AlertDialogTitle>
          <AlertDialogDescription>
            Update
            {" "}
            {studio.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <UpdateStudioForm studio={studio} cancel={closeDialog} />
      </AlertDialogContent>
    </AlertDialog>
  );
};
