import type { UserWithRole } from "@eridu/auth-service/types";

import { useSendVerificationEmail } from "@/admin/users/hooks/use-send-verification-email";
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

type SendVerificationEmailDialogProps = {
  user?: UserWithRole | null;
} & React.ComponentProps<typeof AlertDialog>;

export const SendVerificationEmailDialog: React.FC<SendVerificationEmailDialogProps> = ({ user, ...props }) => {
  const { session } = useSession();
  const { isPending, mutateAsync } = useSendVerificationEmail();
  const { toast } = useToast();

  const onConfirm = useCallback(
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      if (!user) {
        return;
      }

      if (session?.id === user.id) {
        toast({
          variant: "destructive",
          description: "You cannot send email to yourself!",
        });
        return;
      }

      await mutateAsync({ email: user.email });

      toast({
        variant: "success",
        description: `Verification email for ${user?.name} is send to ${user?.email}`,
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
          <AlertDialogTitle>Send </AlertDialogTitle>
          <AlertDialogDescription>
            {`Are you sure you want to send verification email to ${user.name} at ${user.email}?`}
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
