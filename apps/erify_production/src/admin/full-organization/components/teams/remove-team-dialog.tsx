import type { Organization } from "@/admin/full-organization/types";

import { useRemoveTeam } from "@/admin/full-organization/hooks/use-remove-team";
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

type RemoveTeamDialogProps = {
  team: Organization["teams"][0];
} & React.ComponentProps<typeof AlertDialog>;

export const RemoveTeamDialog: React.FC<React.PropsWithChildren<RemoveTeamDialogProps>> = ({
  team,
  children,
  ...props
}) => {
  const { isPending, mutateAsync } = useRemoveTeam();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const handleRemove = useCallback((teamId: string) =>
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      await mutateAsync({ teamId });

      cancelBtnRef.current?.click();
    }, [cancelBtnRef, mutateAsync]);

  return (
    <AlertDialog {...props}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove
            {" "}
            {team.name}
            {" "}
            from this organization? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelBtnRef}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove(team.id)}
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

export default RemoveTeamDialog;
