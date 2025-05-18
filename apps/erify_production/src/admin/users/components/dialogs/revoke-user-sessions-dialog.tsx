import type { UserWithRole } from "@eridu/auth-service/types";

import { useRevokeUserSessions } from "@/admin/users/hooks/use-revoke-user-sessions";
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

type RevokeUserSessionsDialogProps = {
  user?: UserWithRole | null;
} & React.ComponentProps<typeof AlertDialog>;

export const RevokeUserSessionsDialog: React.FC<RevokeUserSessionsDialogProps> = ({ user, ...props }) => {
  const { session } = useSession();
  const { isPending, mutateAsync } = useRevokeUserSessions();
  const { toast } = useToast();

  const onConfirm = useCallback(
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      if (!user) {
        return;
      }

      if (session?.id === user.id) {
        toast({
          variant: "destructive",
          description: "You cannot log yourself out at here!",
        });
        return;
      }

      await mutateAsync({ userId: user.id });

      toast({
        variant: "success",
        description: `${user.name} is logged out`,
      });
    },
    [mutateAsync, user, session, toast],
  );

  if (!user)
    return null;

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Logout user</AlertDialogTitle>
          <AlertDialogDescription>
            {`Are you sure you want to log ${user.name} out?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={onConfirm}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
