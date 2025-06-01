import type { Client } from "@/erify/types";

import { UpdateClientForm } from "@/erify/admin/clients/components/forms/update-client-form";
import { useRowActionStore } from "@/erify/admin/clients/stores/use-row-action-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";

type UpdateClientDialogProps = {
  client: Client | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UpdateClientDialog: React.FC<UpdateClientDialogProps> = ({ client, ...props }) => {
  const { closeDialog } = useRowActionStore();

  if (!client) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update client</AlertDialogTitle>
          <AlertDialogDescription>
            Update
            {" "}
            {client.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <UpdateClientForm client={client} cancel={closeDialog} />
      </AlertDialogContent>
    </AlertDialog>
  );
};
