import type { User } from "@/erify/types";

import { useRemoveUser } from "@/erify/admin/users/hooks/use-remove-user";
import { useRowActionStore } from "@/erify/admin/users/stores/use-row-action-store";
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

type RemoveUserDialogProps = {
  user: User | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveUserDialog: React.FC<RemoveUserDialogProps> = ({ user, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { closeDialog } = useRowActionStore();
  const { isPending, mutateAsync } = useRemoveUser({
    onSuccess: (_data, uid) => {
      toast({
        variant: "success",
        description: `User ${user?.name ?? user?.uid ?? uid} is removed`,
      });
      queryClient.invalidateQueries({ queryKey: ["erify_users"] });
      closeDialog();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.response?.data?.message || "something went wrong",
      });
    },
  });

  const onConfirm = useCallback((user: User) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync(user.uid);
    }, [mutateAsync]);

  if (!user)
    return null;

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove user</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove
            {" "}
            {user.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm(user)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
