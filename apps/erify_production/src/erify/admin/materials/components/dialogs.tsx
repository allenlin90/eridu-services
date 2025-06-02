import { useRowActionStore } from "@/erify/admin/materials/stores/use-row-action-store";

import { RemoveMaterialDialog } from "./dialogs/remove-material-dialog";
import { UpdateMaterialDialog } from "./dialogs/update-material-dialog";

export const Dialogs = () => {
  const { action, material, closeDialog } = useRowActionStore();

  return (
    <>
      <UpdateMaterialDialog
        open={action === "update_material"}
        onOpenChange={open => !open && closeDialog()}
        material={material}
      />
      <RemoveMaterialDialog
        open={action === "remove_material"}
        onOpenChange={open => !open && closeDialog()}
        material={material}
      />
    </>
  );
};
