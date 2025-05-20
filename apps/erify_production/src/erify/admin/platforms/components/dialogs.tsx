import { useRowActionStore } from "@/erify/admin/platforms/stores/use-row-action-store";

import { RemovePlatformDialog } from "./dialogs/remove-platform-dialog";
import { UpdatePlatformDialog } from "./dialogs/update-platform-dialog";

export const Dialogs = () => {
  const { action, platform, closeDialog } = useRowActionStore();

  return (
    <>
      <UpdatePlatformDialog
        open={action === "update_platform"}
        onOpenChange={open => !open && closeDialog()}
        platform={platform}
      />
      <RemovePlatformDialog
        open={action === "remove_platform"}
        onOpenChange={open => !open && closeDialog()}
        platform={platform}
      />
    </>
  );
};
