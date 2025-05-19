import type { MC } from "@/erify/types";

import { UpdateMcForm } from "@/erify/admin/mcs/components/forms/update-mc-form";
import { useRowActionStore } from "@/erify/admin/mcs/stores/use-row-action-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";

type UpdateMcDialogProps = {
  mc: MC | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdateMcDialog: React.FC<UpdateMcDialogProps> = ({ mc, ...props }) => {
  const { closeDialog } = useRowActionStore();

  if (!mc) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update mc</AlertDialogTitle>
          <AlertDialogDescription>
            Update
            {" "}
            {mc.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <UpdateMcForm mc={mc} cancel={closeDialog} />
      </AlertDialogContent>
    </AlertDialog>
  );
};
