import type { UserWithRole } from "@eridu/auth-service/types";

import { useBanUser } from "@/admin/users/hooks/use-ban-user";
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

type BanUserDialogProps = {
  user: UserWithRole;
} & React.ComponentProps<typeof AlertDialog>;

export const BanUserDialog: React.FC<BanUserDialogProps> = ({ user, ...props }) => {
  const { session } = useSession();
  const { isPending, mutateAsync } = useBanUser();
  const { toast } = useToast();

  const onConfirm = useCallback((userId: string) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      if (session?.id === userId) {
        toast({
          variant: "destructive",
          description: "You cannot ban yourself!",
        });
        return;
      }

      await mutateAsync({ userId });
      toast({
        description: `${user.name} is banned`,
      });
    }, [mutateAsync, user, session, toast]);

  return (
    <AlertDialog {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ban user</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to ban
            {" "}
            {user.name}
            {" "}
            from this organization?
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
