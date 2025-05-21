import type { Show } from "@/erify/types";

import { UpdateShowForm } from "@/erify/admin/shows/components/forms/update-show-form";
import { useRowActionStore } from "@/erify/admin/shows/stores/use-row-action-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";

type UpdateShowDialogProps = {
  show: Show | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdateShowDialog: React.FC<UpdateShowDialogProps> = ({ show, ...props }) => {
  const { closeDialog } = useRowActionStore();

  if (!show)
    return null;

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Show</AlertDialogTitle>
          <AlertDialogDescription>
            Update the details of the show:
            {" "}
            {show.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <UpdateShowForm show={show} cancel={closeDialog} />
      </AlertDialogContent>
    </AlertDialog>
  );
};
