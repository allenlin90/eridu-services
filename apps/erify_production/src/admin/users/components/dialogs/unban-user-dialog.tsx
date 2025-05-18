import type { UserWithRole } from "@eridu/auth-service/types";

import { useUnbanUser } from "@/admin/users/hooks/use-unban-user";
import { useSession } from "@eridu/auth-service/hooks/use-session";
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
import { useCallback } from "react";

type UnbanUserDialogProps = {
  user?: UserWithRole | null;
} & React.ComponentProps<typeof AlertDialog>;

export const UnbanUserDialog: React.FC<UnbanUserDialogProps> = ({ user, ...props }) => {
  const { session } = useSession();
  const { isPending, mutateAsync } = useUnbanUser();
  const { toast } = useToast();

  const onConfirm = useCallback((userId: string) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      if (session?.id === userId) {
        toast({
          variant: "destructive",
          description: "You cannot unban yourself!",
        });
        return;
      }

      await mutateAsync({ userId });

      toast({
        description: `${user?.name} is now active`,
      });
    }, [mutateAsync, user, session, toast]);

  if (!user)
    return null;

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ban user</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to unban
            {" "}
            {user.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm(user.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
