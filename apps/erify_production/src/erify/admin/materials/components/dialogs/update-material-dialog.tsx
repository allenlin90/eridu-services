import type { Material } from "@/erify/types";

import { UpdateMaterialForm } from "@/erify/admin/materials/components/forms/update-material-form";
import { useRowActionStore } from "@/erify/admin/materials/stores/use-row-action-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";

type UpdateMaterialDialogProps = {
  material: Material | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdateMaterialDialog: React.FC<UpdateMaterialDialogProps> = ({ material, ...props }) => {
  const { closeDialog } = useRowActionStore();

  if (!material) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Material</AlertDialogTitle>
          <AlertDialogDescription>
            Update
            {" "}
            <b>{material.name}</b>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <UpdateMaterialForm material={material} cancel={closeDialog} />
      </AlertDialogContent>
    </AlertDialog>
  );
};
