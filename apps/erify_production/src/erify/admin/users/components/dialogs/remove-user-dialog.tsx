import type { User } from "@/erify/types";

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
// import { useRemoveUser } from "@/erify/admin/users/hooks/use-remove-user"; // Implement this hook if needed

type RemoveUserDialogProps = {
  user: User | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveUserDialog: React.FC<RemoveUserDialogProps> = ({ user, ...props }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // const { isPending, mutateAsync } = useRemoveUser({ ... }); // Implement mutation logic

  const isPending = false; // Placeholder

  const onConfirm = useCallback((_user: User) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      // await mutateAsync(_user);
      toast({
        variant: "success",
        description: `User ${_user?.name ?? _user?.uid} is removed (mock)`,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }, [toast, queryClient]);

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
