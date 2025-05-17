import type { Organization } from "@/admin/full-organization/types";

import { useRemoveMember } from "@/admin/full-organization/hooks/use-remove-member";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@eridu/ui/components/alert-dialog";
import { useCallback, useRef } from "react";

type RemoveMemberDialogProps = {
  member: Organization["members"][0];
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveMemberDialog: React.FC<React.PropsWithChildren<RemoveMemberDialogProps>> = ({
  member,
  children,
  ...props
}) => {
  const { isPending, mutateAsync } = useRemoveMember();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const handleRemove = useCallback(async () => {
    cancelBtnRef.current?.click();
    await mutateAsync({
      memberIdOrEmail: member.id,
      organizationId: member.organizationId,
    });
  }, [cancelBtnRef, member, mutateAsync]);

  return (
    <AlertDialog {...props}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove
            {" "}
            {member.user.name}
            {" "}
            from this organization? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelBtnRef}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveMemberDialog;
