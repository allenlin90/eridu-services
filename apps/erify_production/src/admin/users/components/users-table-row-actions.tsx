import type { UserWithRole } from "@eridu/auth-service/types";

import { useRowActionStore } from "@/admin/users/stores/use-row-action-store";
import { RowActions } from "@eridu/ui/components/table/row-actions";
import { useToast } from "@eridu/ui/hooks/use-toast";
import { useCallback } from "react";

type UsersTableRowActionsProps = {
  user: UserWithRole;
};

export const UsersTableRowActions: React.FC<UsersTableRowActionsProps> = ({ user }) => {
  const openDialog = useRowActionStore(state => state.openDialog);
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
    { name: "Ban user", onClick: () => { openDialog("ban_user", user); } },
    { name: "Unban user", onClick: () => { openDialog("unban_user", user); } },
    { name: "Reset Password", onClick: () => { openDialog("reset_user_password", user); } },
    { name: "Send verification", onClick: () => { openDialog("send_verification_email", user); } },
    { name: "Logout user", onClick: () => { openDialog("revoke_user_sessions", user); } },
    // TODO: remove user
    // TODO: revoke sessions of a user
    // TODO: set user role
    // TODO: impersonate user
    // TODO: stop impersonating user
  ];

  return <RowActions actions={actions} modal={false} />;
};

export default UsersTableRowActions;
