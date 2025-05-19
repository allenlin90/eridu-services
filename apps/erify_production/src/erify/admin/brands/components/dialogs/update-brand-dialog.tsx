import type { Brand } from "@/erify/types";

import { UpdateBrandForm } from "@/erify/admin/brands/components/forms/update-brand";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";

import { useRowActionStore } from "../../stores/use-row-action-store";

type UpdateBrandDialogProps = {
  brand: Brand | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdateBrandDialog: React.FC<UpdateBrandDialogProps> = ({ brand, ...props }) => {
  const { closeDialog } = useRowActionStore();

  if (!brand) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update brand</AlertDialogTitle>
          <AlertDialogDescription>
            Update
            {" "}
            {brand.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <UpdateBrandForm brand={brand} cancel={closeDialog} />
      </AlertDialogContent>
    </AlertDialog>
  );
};
