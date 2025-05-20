import type { Platform } from "@/erify/types";

import { UpdatePlatformForm } from "@/erify/admin/platforms/components/forms/update-platform-form";
import { useRowActionStore } from "@/erify/admin/platforms/stores/use-row-action-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";

type UpdatePlatformDialogProps = {
  platform: Platform | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdatePlatformDialog: React.FC<UpdatePlatformDialogProps> = ({ platform, ...props }) => {
  const { closeDialog } = useRowActionStore();

  if (!platform) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Platform</AlertDialogTitle>
          <AlertDialogDescription>
            Update the details of the platform:
            {" "}
            {platform.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <UpdatePlatformForm platform={platform} cancel={closeDialog} />
      </AlertDialogContent>
    </AlertDialog>
  );
};
