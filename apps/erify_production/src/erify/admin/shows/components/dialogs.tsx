import { useRowActionStore } from "@/erify/admin/shows/stores/use-row-action-store";

import { RemoveShowDialog } from "./dialogs/remove-show-dialog";

export const Dialogs = () => {
  const { action, show, closeDialog } = useRowActionStore();

  return (
    <>
      {/* <UpdateShowDialog
        open={action === 'update_show'}
        onOpenChange={open => !open && closeDialog()}
        show={show}
      /> */}
      <RemoveShowDialog
        open={action === "remove_show"}
        onOpenChange={open => !open && closeDialog()}
        show={show}
      />
    </>
  );
};
