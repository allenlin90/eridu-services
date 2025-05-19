import { useRowActionStore } from "../stores/use-row-action-store";
import { RemoveBrandDialog } from "./dialogs/remove-brand-dialog";

export const Dialogs: React.FC = () => {
  const { action, brand, closeDialog } = useRowActionStore();

  return (
    <>
      <RemoveBrandDialog
        open={action === "remove_brand"}
        onOpenChange={open => !open && closeDialog()}
        brand={brand}
      />
    </>
  );
};
