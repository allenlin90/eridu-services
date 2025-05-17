import type { UserWithRole } from "@eridu/auth-service/types";

import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { useCallback, useState } from "react";

import { BanUserDialog } from "./dialogs/ban-user-dialog";

type Actions = "ban_user" | "unban_user" | "remove_user" | "revoke_user_sessions" | "reset_user_password" | "set_user_role" | "send_verification_email" | "impersonate_user" | "stop_impersonating_user";

type UsersTableRowActionsProps = {
  user: UserWithRole;
};

export const UsersTableRowActions: React.FC<UsersTableRowActionsProps> = ({ user }) => {
  const [action, setAction] = useState<Actions | null>(null);

  const { toast } = useToast();

  const copyUserId = useCallback(
    (user_uid: string) =>
      (_e: React.MouseEvent<HTMLDivElement>) => {
        navigator.clipboard.writeText(user_uid);
        toast({
          variant: "success",
          description: `User ID: ${user_uid} is copied`,
        });
      },
    [toast],
  );

  const actions = [
    { name: "Copy ID", onClick: copyUserId(user.id) },
    { name: "Ban user", onClick: () => { setAction("ban_user"); } },
    // TODO: unban user
    // TODO: remove user
    // TODO: revoke sessions of a user
    // TODO: reset user password
    // TODO: set user role
    // TODO: send verification email
    // TODO: impersonate user
    // TODO: stop impersonating user
  ];

  return (
    <>
      <RowActions actions={actions} modal={false} />
      <BanUserDialog
        open={action === "ban_user"}
        onOpenChange={open => !open && setAction(null)}
        user={user}
      />
    </>
  );
};

export default UsersTableRowActions;
