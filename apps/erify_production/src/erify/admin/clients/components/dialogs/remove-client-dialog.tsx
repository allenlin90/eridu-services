import type { Client } from "@/erify/types";

import { useRemoveClient } from "@/erify/admin/clients/hooks/use-remove-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@eridu/ui/components/alert-dialog";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

type RemoveClientDialogProps = {
  client: Client | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveClientDialog: React.FC<RemoveClientDialogProps> = ({ client, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPending, mutateAsync } = useRemoveClient({
    onSuccess: (client) => {
      toast({
        variant: "success",
        description: `Client ${client?.name ?? client?.id} is removed`,
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.response?.data.message || "something went wrong",
      });
    },
  });

  const onConfirm = useCallback((client: Client) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync(client);
    }, [mutateAsync]);

  if (!client) {
    return null;
  }

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove client</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove
            {" "}
            {client.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm(client)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
