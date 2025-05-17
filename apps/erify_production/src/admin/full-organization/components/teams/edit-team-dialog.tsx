import type { Organization } from "@/admin/full-organization/types";

import { EditTeamForm } from "@/admin/full-organization/components/forms/edit-team-form";
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
import { useRef } from "react";

type EditTeamDialogProps = {
  team: Organization["teams"][0];
} & React.ComponentProps<typeof AlertDialog>;

export const EditTeamDialog: React.FC<React.PropsWithChildren<EditTeamDialogProps>> = ({
  team,
  children,
  ...props
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog {...props}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Team</AlertDialogTitle>
          <AlertDialogDescription></AlertDialogDescription>
          <EditTeamForm id="edit_team_form" team={team} />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelBtnRef}>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" form="edit_team_form">
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EditTeamDialog;
