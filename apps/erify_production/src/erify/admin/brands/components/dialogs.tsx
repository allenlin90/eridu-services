import { useRowActionStore } from "../stores/use-row-action-store";
import { RemoveBrandDialog } from "./dialogs/remove-brand-dialog";
import { UpdateBrandDialog } from "./dialogs/update-brand-dialog";

export const Dialogs: React.FC = () => {
  const { action, brand, closeDialog } = useRowActionStore();

  return (
    <>
      <RemoveBrandDialog
        open={action === "remove_brand"}
        onOpenChange={open => !open && closeDialog()}
        brand={brand}
      />
      <UpdateBrandDialog
        open={action === "update_brand"}
        onOpenChange={open => !open && closeDialog()}
        brand={brand}
      />
    </>
  );
};
